const app = require("./app");
const config = require("./config");
const provisioner = require("./services/provisioner");

const server = app.listen(config.app.port, config.app.host, () => {
  console.log(`[blackclaw-api] listening on http://${config.app.host}:${config.app.port}`);
});

provisioner.startWorker();

function shutdown() {
  provisioner.stopWorker();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
