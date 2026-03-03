const path = require("node:path");

function toInt(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

module.exports = {
  app: {
    port: toInt(process.env.PORT, 8787),
    host: process.env.HOST || "0.0.0.0",
    baseUrl: process.env.BASE_URL || "http://localhost:8787",
  },
  billing: {
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "dev_webhook_secret",
  },
  runtime: {
    instanceDomain: process.env.INSTANCE_DOMAIN || "blackclaw.internal",
    provisionDelayMs: toInt(process.env.MOCK_PROVISION_DELAY_MS, 3000),
    workerIntervalMs: toInt(process.env.WORKER_INTERVAL_MS, 2000),
  },
  storage: {
    dbFile: process.env.DB_FILE || path.join(process.cwd(), "data", "db.json"),
  },
};
