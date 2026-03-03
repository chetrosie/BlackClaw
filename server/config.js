const path = require("node:path");

function toInt(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

const inferredDbDriver = process.env.DATABASE_URL ? "postgres" : "json";

module.exports = {
  app: {
    port: toInt(process.env.PORT, 8787),
    host: process.env.HOST || "0.0.0.0",
    baseUrl: process.env.BASE_URL || "http://localhost:8787",
  },
  billing: {
    webhookMode: process.env.WEBHOOK_MODE || "mock",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "dev_webhook_secret",
    stripeSigningSecret: process.env.STRIPE_SIGNING_SECRET || "",
    stripeToleranceSec: toInt(process.env.STRIPE_TOLERANCE_SEC, 300),
  },
  runtime: {
    instanceDomain: process.env.INSTANCE_DOMAIN || "blackclaw.internal",
    provisionDelayMs: toInt(process.env.MOCK_PROVISION_DELAY_MS, 3000),
    workerIntervalMs: toInt(process.env.WORKER_INTERVAL_MS, 2000),
  },
  storage: {
    driver: process.env.DB_DRIVER || inferredDbDriver,
    dbFile: process.env.DB_FILE || path.join(process.cwd(), "data", "db.json"),
    databaseUrl: process.env.DATABASE_URL || "",
    poolMax: toInt(process.env.DATABASE_POOL_MAX, 10),
    ssl: process.env.DATABASE_SSL === "true",
  },
  provider: {
    driver: process.env.PROVIDER_DRIVER || "mock",
    http: {
      baseUrl: process.env.PROVIDER_HTTP_BASE_URL || "",
      apiKey: process.env.PROVIDER_HTTP_API_KEY || "",
      timeoutMs: toInt(process.env.PROVIDER_HTTP_TIMEOUT_MS, 5000),
    },
  },
};
