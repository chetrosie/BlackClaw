const config = require("../config");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function provisionInstance(instance) {
  await delay(config.runtime.provisionDelayMs);

  const host = `${instance.id.slice(0, 8)}.${config.runtime.instanceDomain}`;
  return {
    providerRef: `mock-${instance.id.slice(0, 12)}`,
    endpoint: `https://${host}`,
    status: "running",
  };
}

async function instanceAction(instance, action) {
  await delay(400);

  if (action === "restart") return { status: "running" };
  if (action === "stop") return { status: "stopped" };
  if (action === "start") return { status: "running" };
  throw new Error(`unsupported action: ${action}`);
}

module.exports = {
  provisionInstance,
  instanceAction,
};
