const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const defaultData = {
  users: [],
  subscriptions: [],
  instances: [],
  jobs: [],
  events: [],
  webhookEvents: [],
};

function now() {
  return new Date().toISOString();
}

class JsonDbAdapter {
  constructor(storageConfig) {
    this.file = storageConfig.dbFile;
    this.mutex = Promise.resolve();
  }

  async init() {
    await this.ensureDbFile();
  }

  async close() {}

  async ensureDbFile() {
    const dir = path.dirname(this.file);
    await fs.mkdir(dir, { recursive: true });

    try {
      await fs.access(this.file);
    } catch {
      await fs.writeFile(this.file, JSON.stringify(defaultData, null, 2));
    }
  }

  async readDb() {
    await this.ensureDbFile();
    const raw = await fs.readFile(this.file, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return { ...defaultData, ...parsed };
  }

  async writeDb(data) {
    await fs.writeFile(this.file, JSON.stringify(data, null, 2));
  }

  async runExclusive(task) {
    const previous = this.mutex;
    let release = () => {};
    this.mutex = new Promise((resolve) => {
      release = resolve;
    });

    await previous;

    try {
      return await task();
    } finally {
      release();
    }
  }

  async createUser(input) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
      const email = String(input.email).toLowerCase();
      const existing = data.users.find((user) => user.email.toLowerCase() === email);
      if (existing) return existing;

      const user = {
        id: randomUUID(),
        email,
        name: input.name || email.split("@")[0],
        createdAt: now(),
      };
      data.users.push(user);
      await this.writeDb(data);
      return user;
    });
  }

  async listUsers() {
    const data = await this.readDb();
    return data.users;
  }

  async findUserByEmail(email) {
    const data = await this.readDb();
    return data.users.find((user) => user.email.toLowerCase() === String(email).toLowerCase()) || null;
  }

  async getUser(userId) {
    const data = await this.readDb();
    return data.users.find((user) => user.id === userId) || null;
  }

  async upsertSubscription(input) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
      const existing = data.subscriptions.find(
        (subscription) => subscription.userId === input.userId && subscription.status === "active"
      );

      if (existing) {
        existing.plan = input.plan;
        existing.billingCycle = input.billingCycle;
        existing.providerRef = input.providerRef || existing.providerRef;
        existing.updatedAt = now();
        await this.writeDb(data);
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

      data.subscriptions.push(subscription);
      await this.writeDb(data);
      return subscription;
    });
  }

  async createInstance(input) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
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
      data.instances.push(instance);
      await this.writeDb(data);
      return instance;
    });
  }

  async updateInstance(instanceId, patch) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
      const instance = data.instances.find((item) => item.id === instanceId);
      if (!instance) return null;
      Object.assign(instance, patch, { updatedAt: now() });
      await this.writeDb(data);
      return instance;
    });
  }

  async listInstances(userId) {
    const data = await this.readDb();
    if (!userId) return data.instances;
    return data.instances.filter((instance) => instance.userId === userId);
  }

  async listSubscriptions(userId) {
    const data = await this.readDb();
    if (!userId) return data.subscriptions;
    return data.subscriptions.filter((subscription) => subscription.userId === userId);
  }

  async addJob(input) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
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
      data.jobs.push(job);
      await this.writeDb(data);
      return job;
    });
  }

  async getQueuedJob(type) {
    const data = await this.readDb();
    return data.jobs.find((job) => job.type === type && job.status === "queued") || null;
  }

  async markJobRunning(jobId) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
      const job = data.jobs.find((item) => item.id === jobId);
      if (!job) return null;
      job.status = "running";
      job.attempts += 1;
      job.updatedAt = now();
      await this.writeDb(data);
      return job;
    });
  }

  async markJobDone(jobId) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
      const job = data.jobs.find((item) => item.id === jobId);
      if (!job) return null;
      job.status = "done";
      job.updatedAt = now();
      await this.writeDb(data);
      return job;
    });
  }

  async markJobFailed(jobId, error) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
      const job = data.jobs.find((item) => item.id === jobId);
      if (!job) return null;
      job.status = "failed";
      job.lastError = String(error || "unknown error");
      job.updatedAt = now();
      await this.writeDb(data);
      return job;
    });
  }

  async listJobs() {
    const data = await this.readDb();
    return data.jobs;
  }

  async addEvent(event) {
    await this.runExclusive(async () => {
      const data = await this.readDb();
      data.events.unshift({
        id: randomUUID(),
        ...event,
        createdAt: now(),
      });
      data.events = data.events.slice(0, 100);
      await this.writeDb(data);
    });
  }

  async listEvents(limit = 100) {
    const data = await this.readDb();
    return data.events.slice(0, limit);
  }

  async startWebhookEvent(input) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
      const existing = data.webhookEvents.find((item) => item.eventId === input.eventId);
      if (existing) {
        return { duplicate: true, event: existing };
      }

      const webhookEvent = {
        eventId: input.eventId,
        source: input.source || "stripe",
        type: input.type,
        status: "received",
        payload: input.payload || null,
        errorMessage: null,
        createdAt: now(),
        processedAt: null,
      };

      data.webhookEvents.unshift(webhookEvent);
      data.webhookEvents = data.webhookEvents.slice(0, 500);
      await this.writeDb(data);

      return { duplicate: false, event: webhookEvent };
    });
  }

  async finishWebhookEvent(eventId, patch) {
    return this.runExclusive(async () => {
      const data = await this.readDb();
      const webhookEvent = data.webhookEvents.find((item) => item.eventId === eventId);
      if (!webhookEvent) return null;

      webhookEvent.status = patch.status || webhookEvent.status;
      webhookEvent.errorMessage = patch.errorMessage || null;
      webhookEvent.processedAt = now();

      await this.writeDb(data);
      return webhookEvent;
    });
  }

  async listWebhookEvents(limit = 100) {
    const data = await this.readDb();
    return data.webhookEvents.slice(0, limit);
  }
}

module.exports = JsonDbAdapter;
