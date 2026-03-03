const express = require("express");
const path = require("node:path");
const { createHash, createHmac, timingSafeEqual } = require("node:crypto");
const { z } = require("zod");
const db = require("./lib/db");
const { getProvider } = require("./providers");
const config = require("./config");

const provider = getProvider();
const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      if (req.originalUrl === "/api/webhooks/stripe") {
        req.rawBody = buf;
      }
    },
  })
);

function ok(res, data) {
  res.json({ ok: true, data });
}

function fail(res, status, message) {
  res.status(status).json({ ok: false, error: message });
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function parseStripeSignature(headerValue) {
  const parsed = {
    timestamp: null,
    signatures: [],
  };

  const parts = String(headerValue || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") parsed.timestamp = Number(value);
    if (key === "v1") parsed.signatures.push(value);
  }

  return parsed;
}

function safeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function verifyStripeSignature(rawBody, signatureHeader) {
  if (!config.billing.stripeSigningSecret) {
    throw new Error("missing STRIPE_SIGNING_SECRET");
  }

  const parsed = parseStripeSignature(signatureHeader);
  if (!Number.isFinite(parsed.timestamp) || parsed.signatures.length === 0) {
    throw new Error("invalid stripe-signature header");
  }

  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - parsed.timestamp);
  if (ageSec > config.billing.stripeToleranceSec) {
    throw new Error("stripe signature timestamp out of tolerance");
  }

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expected = createHmac("sha256", config.billing.stripeSigningSecret)
    .update(signedPayload)
    .digest("hex");

  const valid = parsed.signatures.some((signature) => safeEqualHex(expected, signature));
  if (!valid) {
    throw new Error("invalid stripe webhook signature");
  }
}

function assertWebhookSignature(req) {
  if (config.billing.webhookMode === "stripe") {
    verifyStripeSignature((req.rawBody || Buffer.from("{}")).toString("utf8"), req.headers["stripe-signature"]);
    return;
  }

  const signature = req.headers["x-mock-signature"];
  if (signature !== config.billing.webhookSecret) {
    throw new Error("invalid webhook signature");
  }
}

function normalizeEventId(rawEvent) {
  if (rawEvent.id) return rawEvent.id;

  // Backward compatibility for legacy test payloads without event id.
  const hash = createHash("sha256").update(JSON.stringify(rawEvent)).digest("hex").slice(0, 24);
  return `evt_legacy_${hash}`;
}

async function handleCheckoutCompleted(eventObj) {
  const user = await db.getUser(eventObj.userId);
  if (!user) {
    return { error: { status: 404, message: "user not found" } };
  }

  const subscription = await db.upsertSubscription({
    userId: eventObj.userId,
    plan: eventObj.plan,
    billingCycle: eventObj.billingCycle,
    providerRef: eventObj.subscriptionId || null,
  });

  const instance = await db.createInstance({
    userId: eventObj.userId,
    plan: eventObj.plan,
    region: eventObj.region,
  });

  const job = await db.addJob({
    type: "provision_instance",
    payload: { instanceId: instance.id, userId: eventObj.userId },
  });

  await db.addEvent({
    type: "billing.checkout.completed",
    message: `Subscription active for ${user.email}, provisioning started`,
    payload: { subscriptionId: subscription.id, instanceId: instance.id, jobId: job.id },
  });

  return { data: { subscription, instance, job } };
}

app.get(
  "/api/health",
  asyncRoute(async (_req, res) => {
    ok(res, {
      service: "blackclaw-api",
      version: "v1.0.10",
      dbDriver: config.storage.driver,
      providerDriver: config.provider.driver,
      now: new Date().toISOString(),
    });
  })
);

app.post(
  "/api/users/mock-login",
  asyncRoute(async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(1).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const existing = await db.findUserByEmail(parsed.data.email);
    const user = existing || (await db.createUser(parsed.data));

    await db.addEvent({
      type: "user.login",
      message: `User login: ${user.email}`,
      payload: { userId: user.id, email: user.email },
    });

    ok(res, user);
  })
);

app.post(
  "/api/billing/checkout-session",
  asyncRoute(async (req, res) => {
    const schema = z.object({
      userId: z.string().uuid(),
      plan: z.enum(["lite", "pro", "max"]),
      billingCycle: z.enum(["monthly", "yearly"]),
      region: z.string().default("us-east"),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const user = await db.getUser(parsed.data.userId);
    if (!user) return fail(res, 404, "user not found");

    const checkoutSession = {
      id: `cs_test_${Math.random().toString(36).slice(2, 12)}`,
      userId: user.id,
      plan: parsed.data.plan,
      billingCycle: parsed.data.billingCycle,
      region: parsed.data.region,
      checkoutUrl: `${config.app.baseUrl}/dashboard.html?checkout=success`,
    };

    await db.addEvent({
      type: "billing.checkout.created",
      message: `Checkout session created for ${user.email}`,
      payload: checkoutSession,
    });

    ok(res, checkoutSession);
  })
);

app.post(
  "/api/webhooks/stripe",
  asyncRoute(async (req, res) => {
    try {
      assertWebhookSignature(req);
    } catch (err) {
      return fail(res, 401, err.message || "invalid webhook signature");
    }

    const schema = z.object({
      id: z.string().min(1).optional(),
      type: z.string(),
      data: z.object({
        object: z.object({
          userId: z.string().uuid(),
          plan: z.enum(["lite", "pro", "max"]),
          billingCycle: z.enum(["monthly", "yearly"]),
          region: z.string().default("us-east"),
          subscriptionId: z.string().optional(),
        }),
      }),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const eventId = normalizeEventId(parsed.data);
    const webhookEvent = await db.startWebhookEvent({
      eventId,
      source: "stripe",
      type: parsed.data.type,
      payload: parsed.data,
    });

    if (webhookEvent.duplicate) {
      return ok(res, { duplicate: true, eventId });
    }

    if (parsed.data.type !== "checkout.session.completed") {
      await db.finishWebhookEvent(eventId, {
        status: "ignored",
        errorMessage: null,
      });
      return ok(res, { ignored: true, eventId, reason: "event not handled" });
    }

    const result = await handleCheckoutCompleted(parsed.data.data.object);

    if (result.error) {
      await db.finishWebhookEvent(eventId, {
        status: "failed",
        errorMessage: result.error.message,
      });
      return fail(res, result.error.status, result.error.message);
    }

    await db.finishWebhookEvent(eventId, {
      status: "processed",
      errorMessage: null,
    });

    ok(res, { ...result.data, eventId });
  })
);

app.post(
  "/api/dev/simulate-purchase",
  asyncRoute(async (req, res) => {
    const schema = z.object({
      userId: z.string().uuid(),
      plan: z.enum(["lite", "pro", "max"]),
      billingCycle: z.enum(["monthly", "yearly"]),
      region: z.string().default("us-east"),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const simulatedEvent = {
      ...parsed.data,
      subscriptionId: `sub_mock_${Math.random().toString(36).slice(2, 10)}`,
    };

    const result = await handleCheckoutCompleted(simulatedEvent);
    if (result.error) return fail(res, result.error.status, result.error.message);
    ok(res, result.data);
  })
);

app.get(
  "/api/users",
  asyncRoute(async (_req, res) => {
    const users = await db.listUsers();
    ok(res, users);
  })
);

app.get(
  "/api/subscriptions",
  asyncRoute(async (req, res) => {
    ok(res, await db.listSubscriptions(req.query.userId));
  })
);

app.get(
  "/api/instances",
  asyncRoute(async (req, res) => {
    ok(res, await db.listInstances(req.query.userId));
  })
);

app.post(
  "/api/instances/:id/actions",
  asyncRoute(async (req, res) => {
    const schema = z.object({ action: z.enum(["start", "stop", "restart"]) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const instances = await db.listInstances();
    const instance = instances.find((item) => item.id === req.params.id);
    if (!instance) return fail(res, 404, "instance not found");

    try {
      const result = await provider.instanceAction(instance, parsed.data.action);
      const updated = await db.updateInstance(instance.id, { status: result.status });

      await db.addEvent({
        type: "instance.action",
        message: `Action ${parsed.data.action} on instance ${instance.id}`,
        payload: { instanceId: instance.id, action: parsed.data.action, status: result.status },
      });

      ok(res, updated);
    } catch (err) {
      fail(res, 500, err.message || "action failed");
    }
  })
);

app.get(
  "/api/jobs",
  asyncRoute(async (_req, res) => {
    ok(res, await db.listJobs());
  })
);

app.get(
  "/api/events",
  asyncRoute(async (_req, res) => {
    ok(res, await db.listEvents());
  })
);

app.get(
  "/api/webhook-events",
  asyncRoute(async (_req, res) => {
    ok(res, await db.listWebhookEvents());
  })
);

app.use(express.static(process.cwd()));

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "dashboard.html"));
});

app.use((err, _req, res, _next) => {
  console.error("[blackclaw-api] unhandled error", err);
  fail(res, 500, err.message || "internal server error");
});

module.exports = app;
