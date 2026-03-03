const express = require("express");
const path = require("node:path");
const { z } = require("zod");
const db = require("./lib/db");
const provider = require("./providers/mockProvider");
const config = require("./config");

const app = express();
app.use(express.json());

function ok(res, data) {
  res.json({ ok: true, data });
}

function fail(res, status, message) {
  res.status(status).json({ ok: false, error: message });
}

function handleCheckoutCompleted(eventObj) {
  const user = db.getUser(eventObj.userId);
  if (!user) {
    return { error: { status: 404, message: "user not found" } };
  }

  const subscription = db.upsertSubscription({
    userId: eventObj.userId,
    plan: eventObj.plan,
    billingCycle: eventObj.billingCycle,
    providerRef: eventObj.subscriptionId || null,
  });

  const instance = db.createInstance({
    userId: eventObj.userId,
    plan: eventObj.plan,
    region: eventObj.region,
  });

  const job = db.addJob({
    type: "provision_instance",
    payload: { instanceId: instance.id, userId: eventObj.userId },
  });

  db.addEvent({
    type: "billing.checkout.completed",
    message: `Subscription active for ${user.email}, provisioning started`,
    payload: { subscriptionId: subscription.id, instanceId: instance.id, jobId: job.id },
  });

  return { data: { subscription, instance, job } };
}

app.get("/api/health", (_req, res) => {
  ok(res, {
    service: "blackclaw-api",
    version: "v1.0.3",
    now: new Date().toISOString(),
  });
});

app.post("/api/users/mock-login", (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(1).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

  const existing = db.findUserByEmail(parsed.data.email);
  const user = existing || db.createUser(parsed.data);

  db.addEvent({
    type: "user.login",
    message: `User login: ${user.email}`,
    payload: { userId: user.id, email: user.email },
  });

  ok(res, user);
});

app.post("/api/billing/checkout-session", (req, res) => {
  const schema = z.object({
    userId: z.string().uuid(),
    plan: z.enum(["lite", "pro", "max"]),
    billingCycle: z.enum(["monthly", "yearly"]),
    region: z.string().default("us-east"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

  const user = db.getUser(parsed.data.userId);
  if (!user) return fail(res, 404, "user not found");

  const checkoutSession = {
    id: `cs_test_${Math.random().toString(36).slice(2, 12)}`,
    userId: user.id,
    plan: parsed.data.plan,
    billingCycle: parsed.data.billingCycle,
    region: parsed.data.region,
    checkoutUrl: `${config.app.baseUrl}/dashboard.html?checkout=success`,
  };

  db.addEvent({
    type: "billing.checkout.created",
    message: `Checkout session created for ${user.email}`,
    payload: checkoutSession,
  });

  ok(res, checkoutSession);
});

app.post("/api/webhooks/stripe", (req, res) => {
  const signature = req.headers["x-mock-signature"];
  if (signature !== config.billing.webhookSecret) {
    return fail(res, 401, "invalid webhook signature");
  }

  const schema = z.object({
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

  if (parsed.data.type !== "checkout.session.completed") {
    return ok(res, { ignored: true, reason: "event not handled" });
  }

  const result = handleCheckoutCompleted(parsed.data.data.object);
  if (result.error) return fail(res, result.error.status, result.error.message);
  ok(res, result.data);
});

app.post("/api/dev/simulate-purchase", (req, res) => {
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

  const result = handleCheckoutCompleted(simulatedEvent);
  if (result.error) return fail(res, result.error.status, result.error.message);
  ok(res, result.data);
});

app.get("/api/users", (_req, res) => {
  const events = db.listEvents();
  const userIds = Array.from(new Set(events.map((e) => e.payload && e.payload.userId).filter(Boolean)));
  const users = userIds.map((id) => db.getUser(id)).filter(Boolean);
  ok(res, users);
});

app.get("/api/subscriptions", (req, res) => {
  ok(res, db.listSubscriptions(req.query.userId));
});

app.get("/api/instances", (req, res) => {
  ok(res, db.listInstances(req.query.userId));
});

app.post("/api/instances/:id/actions", async (req, res) => {
  const schema = z.object({ action: z.enum(["start", "stop", "restart"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

  const instances = db.listInstances();
  const instance = instances.find((i) => i.id === req.params.id);
  if (!instance) return fail(res, 404, "instance not found");

  try {
    const result = await provider.instanceAction(instance, parsed.data.action);
    const updated = db.updateInstance(instance.id, { status: result.status });
    db.addEvent({
      type: "instance.action",
      message: `Action ${parsed.data.action} on instance ${instance.id}`,
      payload: { instanceId: instance.id, action: parsed.data.action, status: result.status },
    });
    ok(res, updated);
  } catch (err) {
    fail(res, 500, err.message || "action failed");
  }
});

app.get("/api/jobs", (_req, res) => {
  ok(res, db.listJobs());
});

app.get("/api/events", (_req, res) => {
  ok(res, db.listEvents());
});

app.use(express.static(process.cwd()));

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "dashboard.html"));
});

module.exports = app;
