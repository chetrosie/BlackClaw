const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const config = require("../config");

const defaultData = {
  users: [],
  subscriptions: [],
  instances: [],
  jobs: [],
  events: [],
};

function ensureDbFile() {
  const file = config.storage.dbFile;
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
}

function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(config.storage.dbFile, "utf8");
  const parsed = JSON.parse(raw || "{}");
  return { ...defaultData, ...parsed };
}

function writeDb(data) {
  fs.writeFileSync(config.storage.dbFile, JSON.stringify(data, null, 2));
}

function now() {
  return new Date().toISOString();
}

function createUser(input) {
  const db = readDb();
  const user = {
    id: randomUUID(),
    email: input.email,
    name: input.name || input.email.split("@")[0],
    createdAt: now(),
  };
  db.users.push(user);
  writeDb(db);
  return user;
}

function findUserByEmail(email) {
  const db = readDb();
  return db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

function getUser(userId) {
  const db = readDb();
  return db.users.find((u) => u.id === userId) || null;
}

function upsertSubscription(input) {
  const db = readDb();
  const existing = db.subscriptions.find((s) => s.userId === input.userId && s.status === "active");

  if (existing) {
    existing.plan = input.plan;
    existing.billingCycle = input.billingCycle;
    existing.providerRef = input.providerRef || existing.providerRef;
    existing.updatedAt = now();
    writeDb(db);
    return existing;
  }

  const subscription = {
    id: randomUUID(),
    userId: input.userId,
    plan: input.plan,
    billingCycle: input.billingCycle,
    status: "active",
    providerRef: input.providerRef || null,
    createdAt: now(),
    updatedAt: now(),
  };

  db.subscriptions.push(subscription);
  writeDb(db);
  return subscription;
}

function createInstance(input) {
  const db = readDb();
  const instance = {
    id: randomUUID(),
    userId: input.userId,
    plan: input.plan,
    region: input.region || "us-east",
    status: "provisioning",
    endpoint: null,
    providerRef: null,
    createdAt: now(),
    updatedAt: now(),
  };
  db.instances.push(instance);
  writeDb(db);
  return instance;
}

function updateInstance(instanceId, patch) {
  const db = readDb();
  const instance = db.instances.find((i) => i.id === instanceId);
  if (!instance) return null;
  Object.assign(instance, patch, { updatedAt: now() });
  writeDb(db);
  return instance;
}

function listInstances(userId) {
  const db = readDb();
  if (!userId) return db.instances;
  return db.instances.filter((i) => i.userId === userId);
}

function listSubscriptions(userId) {
  const db = readDb();
  if (!userId) return db.subscriptions;
  return db.subscriptions.filter((s) => s.userId === userId);
}

function addJob(input) {
  const db = readDb();
  const job = {
    id: randomUUID(),
    type: input.type,
    status: "queued",
    payload: input.payload,
    attempts: 0,
    lastError: null,
    createdAt: now(),
    updatedAt: now(),
  };
  db.jobs.push(job);
  writeDb(db);
  return job;
}

function getQueuedJob(type) {
  const db = readDb();
  return db.jobs.find((j) => j.type === type && j.status === "queued") || null;
}

function markJobRunning(jobId) {
  const db = readDb();
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  job.status = "running";
  job.attempts += 1;
  job.updatedAt = now();
  writeDb(db);
  return job;
}

function markJobDone(jobId) {
  const db = readDb();
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  job.status = "done";
  job.updatedAt = now();
  writeDb(db);
  return job;
}

function markJobFailed(jobId, error) {
  const db = readDb();
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return null;
  job.status = "failed";
  job.lastError = String(error || "unknown error");
  job.updatedAt = now();
  writeDb(db);
  return job;
}

function listJobs() {
  const db = readDb();
  return db.jobs;
}

function addEvent(event) {
  const db = readDb();
  db.events.unshift({
    id: randomUUID(),
    ...event,
    createdAt: now(),
  });
  db.events = db.events.slice(0, 100);
  writeDb(db);
}

function listEvents() {
  const db = readDb();
  return db.events;
}

module.exports = {
  createUser,
  findUserByEmail,
  getUser,
  upsertSubscription,
  createInstance,
  updateInstance,
  listInstances,
  listSubscriptions,
  addJob,
  getQueuedJob,
  markJobRunning,
  markJobDone,
  markJobFailed,
  listJobs,
  addEvent,
  listEvents,
};
