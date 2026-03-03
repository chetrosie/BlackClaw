const app = require("./app");
const config = require("./config");
const db = require("./lib/db");
const provisioner = require("./services/provisioner");

let server = null;

async function bootstrap() {
  await db.init();

  server = app.listen(config.app.port, config.app.host, () => {
    console.log(`[blackclaw-api] listening on http://${config.app.host}:${config.app.port}`);
    console.log(`[blackclaw-api] db=${config.storage.driver} provider=${config.provider.driver}`);
  });

  provisioner.startWorker();
}

async function shutdown() {
  provisioner.stopWorker();
  await db.close();

  if (!server) {
    process.exit(0);
    return;
  }

  server.close(() => process.exit(0));
}

bootstrap().catch((err) => {
  console.error("[blackclaw-api] bootstrap failed", err);
  process.exit(1);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
