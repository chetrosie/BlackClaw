const config = require("../config");
const JsonDbAdapter = require("./db/jsonAdapter");
const PostgresDbAdapter = require("./db/postgresAdapter");

let adapterPromise = null;

function createAdapter() {
  if (config.storage.driver === "postgres") {
    return new PostgresDbAdapter(config.storage);
  }
  return new JsonDbAdapter(config.storage);
}

async function getAdapter() {
  if (!adapterPromise) {
    adapterPromise = (async () => {
      const adapter = createAdapter();
      await adapter.init();
      return adapter;
    })();
  }
  return adapterPromise;
}

async function call(method, ...args) {
  const adapter = await getAdapter();
  return adapter[method](...args);
}

async function init() {
  await getAdapter();
}

async function close() {
  if (!adapterPromise) return;
  const adapter = await adapterPromise;
  await adapter.close();
  adapterPromise = null;
}

module.exports = {
  init,
  close,
  createUser: (input) => call("createUser", input),
  listUsers: () => call("listUsers"),
  findUserByEmail: (email) => call("findUserByEmail", email),
  getUser: (userId) => call("getUser", userId),
  upsertSubscription: (input) => call("upsertSubscription", input),
  createInstance: (input) => call("createInstance", input),
  updateInstance: (instanceId, patch) => call("updateInstance", instanceId, patch),
  listInstances: (userId) => call("listInstances", userId),
  listSubscriptions: (userId) => call("listSubscriptions", userId),
  addJob: (input) => call("addJob", input),
  getQueuedJob: (type) => call("getQueuedJob", type),
  markJobRunning: (jobId) => call("markJobRunning", jobId),
  markJobDone: (jobId) => call("markJobDone", jobId),
  markJobFailed: (jobId, error) => call("markJobFailed", jobId, error),
  listJobs: () => call("listJobs"),
  addEvent: (event) => call("addEvent", event),
  listEvents: (limit) => call("listEvents", limit),
  startWebhookEvent: (input) => call("startWebhookEvent", input),
  finishWebhookEvent: (eventId, patch) => call("finishWebhookEvent", eventId, patch),
  listWebhookEvents: (limit) => call("listWebhookEvents", limit),
};
