const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");

function asIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: asIso(row.created_at),
  };
}

function mapSubscription(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    billingCycle: row.billing_cycle,
    status: row.status,
    providerRef: row.provider_ref,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapInstance(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    region: row.region,
    status: row.status,
    endpoint: row.endpoint,
    providerRef: row.provider_ref,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapJob(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    payload: row.payload || {},
    attempts: row.attempts,
    lastError: row.last_error,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
  };
}

function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    payload: row.payload || {},
    createdAt: asIso(row.created_at),
  };
}

function mapWebhookEvent(row) {
  if (!row) return null;
  return {
    eventId: row.event_id,
    source: row.source,
    type: row.type,
    status: row.status,
    payload: row.payload || null,
    errorMessage: row.error_message,
    createdAt: asIso(row.created_at),
    processedAt: asIso(row.processed_at),
  };
}

class PostgresDbAdapter {
  constructor(storageConfig) {
    if (!storageConfig.databaseUrl) {
      throw new Error("DATABASE_URL is required when DB_DRIVER=postgres");
    }

    this.pool = new Pool({
      connectionString: storageConfig.databaseUrl,
      max: storageConfig.poolMax,
      ssl: storageConfig.ssl ? { rejectUnauthorized: false } : false,
    });
  }

  async init() {
    const schemaSqlPath = path.join(__dirname, "migrations", "001_init.sql");
    const schemaSql = await fs.readFile(schemaSqlPath, "utf8");
    await this.pool.query(schemaSql);
  }

  async close() {
    await this.pool.end();
  }

  async createUser(input) {
    const email = String(input.email).toLowerCase();
    const name = input.name || email.split("@")[0];
    const id = randomUUID();

    const result = await this.pool.query(
      `
        INSERT INTO users (id, email, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (email)
        DO UPDATE SET email = EXCLUDED.email
        RETURNING id, email, name, created_at
      `,
      [id, email, name]
    );

    return mapUser(result.rows[0]);
  }

  async listUsers() {
    const result = await this.pool.query(
      `
        SELECT id, email, name, created_at
        FROM users
        ORDER BY created_at DESC
      `
    );
    return result.rows.map(mapUser);
  }

  async findUserByEmail(email) {
    const result = await this.pool.query(
      `
        SELECT id, email, name, created_at
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [String(email).toLowerCase()]
    );
    return mapUser(result.rows[0]);
  }

  async getUser(userId) {
    const result = await this.pool.query(
      `
        SELECT id, email, name, created_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );
    return mapUser(result.rows[0]);
  }

  async upsertSubscription(input) {
    const existing = await this.pool.query(
      `
        SELECT id, user_id, plan, billing_cycle, status, provider_ref, created_at, updated_at
        FROM subscriptions
        WHERE user_id = $1
          AND status = 'active'
        LIMIT 1
      `,
      [input.userId]
    );

    if (existing.rows.length > 0) {
      const updateResult = await this.pool.query(
        `
          UPDATE subscriptions
          SET
            plan = $2,
            billing_cycle = $3,
            provider_ref = COALESCE($4, provider_ref),
            updated_at = NOW()
          WHERE id = $1
          RETURNING id, user_id, plan, billing_cycle, status, provider_ref, created_at, updated_at
        `,
        [existing.rows[0].id, input.plan, input.billingCycle, input.providerRef || null]
      );

      return mapSubscription(updateResult.rows[0]);
    }

    const id = randomUUID();
    const result = await this.pool.query(
      `
        INSERT INTO subscriptions (
          id,
          user_id,
          plan,
          billing_cycle,
          status,
          provider_ref
        )
        VALUES ($1, $2, $3, $4, 'active', $5)
        RETURNING id, user_id, plan, billing_cycle, status, provider_ref, created_at, updated_at
      `,
      [id, input.userId, input.plan, input.billingCycle, input.providerRef || null]
    );

    return mapSubscription(result.rows[0]);
  }

  async createInstance(input) {
    const id = randomUUID();

    const result = await this.pool.query(
      `
        INSERT INTO instances (
          id,
          user_id,
          plan,
          region,
          status,
          endpoint,
          provider_ref
        )
        VALUES ($1, $2, $3, $4, 'provisioning', NULL, NULL)
        RETURNING id, user_id, plan, region, status, endpoint, provider_ref, created_at, updated_at
      `,
      [id, input.userId, input.plan, input.region || "us-east"]
    );

    return mapInstance(result.rows[0]);
  }

  async updateInstance(instanceId, patch) {
    const updates = [];
    const values = [instanceId];
    let index = 2;

    const mapping = {
      plan: "plan",
      region: "region",
      status: "status",
      endpoint: "endpoint",
      providerRef: "provider_ref",
    };

    for (const [key, column] of Object.entries(mapping)) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        updates.push(`${column} = $${index}`);
        values.push(patch[key]);
        index += 1;
      }
    }

    if (updates.length === 0) {
      const existing = await this.pool.query(
        `
          SELECT id, user_id, plan, region, status, endpoint, provider_ref, created_at, updated_at
          FROM instances
          WHERE id = $1
          LIMIT 1
        `,
        [instanceId]
      );
      return mapInstance(existing.rows[0]);
    }

    const result = await this.pool.query(
      `
        UPDATE instances
        SET ${updates.join(", ")}, updated_at = NOW()
        WHERE id = $1
        RETURNING id, user_id, plan, region, status, endpoint, provider_ref, created_at, updated_at
      `,
      values
    );

    return mapInstance(result.rows[0]);
  }

  async listInstances(userId) {
    const query = userId
      ? {
          text: `
            SELECT id, user_id, plan, region, status, endpoint, provider_ref, created_at, updated_at
            FROM instances
            WHERE user_id = $1
            ORDER BY created_at DESC
          `,
          values: [userId],
        }
      : {
          text: `
            SELECT id, user_id, plan, region, status, endpoint, provider_ref, created_at, updated_at
            FROM instances
            ORDER BY created_at DESC
          `,
          values: [],
        };

    const result = await this.pool.query(query);
    return result.rows.map(mapInstance);
  }

  async listSubscriptions(userId) {
    const query = userId
      ? {
          text: `
            SELECT id, user_id, plan, billing_cycle, status, provider_ref, created_at, updated_at
            FROM subscriptions
            WHERE user_id = $1
            ORDER BY created_at DESC
          `,
          values: [userId],
        }
      : {
          text: `
            SELECT id, user_id, plan, billing_cycle, status, provider_ref, created_at, updated_at
            FROM subscriptions
            ORDER BY created_at DESC
          `,
          values: [],
        };

    const result = await this.pool.query(query);
    return result.rows.map(mapSubscription);
  }

  async addJob(input) {
    const id = randomUUID();

    const result = await this.pool.query(
      `
        INSERT INTO jobs (
          id,
          type,
          status,
          payload,
          attempts,
          last_error
        )
        VALUES ($1, $2, 'queued', $3::jsonb, 0, NULL)
        RETURNING id, type, status, payload, attempts, last_error, created_at, updated_at
      `,
      [id, input.type, JSON.stringify(input.payload || {})]
    );

    return mapJob(result.rows[0]);
  }

  async getQueuedJob(type) {
    const result = await this.pool.query(
      `
        SELECT id, type, status, payload, attempts, last_error, created_at, updated_at
        FROM jobs
        WHERE type = $1
          AND status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
      `,
      [type]
    );

    return mapJob(result.rows[0]);
  }

  async markJobRunning(jobId) {
    const result = await this.pool.query(
      `
        UPDATE jobs
        SET
          status = 'running',
          attempts = attempts + 1,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, type, status, payload, attempts, last_error, created_at, updated_at
      `,
      [jobId]
    );

    return mapJob(result.rows[0]);
  }

  async markJobDone(jobId) {
    const result = await this.pool.query(
      `
        UPDATE jobs
        SET
          status = 'done',
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, type, status, payload, attempts, last_error, created_at, updated_at
      `,
      [jobId]
    );

    return mapJob(result.rows[0]);
  }

  async markJobFailed(jobId, error) {
    const result = await this.pool.query(
      `
        UPDATE jobs
        SET
          status = 'failed',
          last_error = $2,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, type, status, payload, attempts, last_error, created_at, updated_at
      `,
      [jobId, String(error || "unknown error")]
    );

    return mapJob(result.rows[0]);
  }

  async listJobs() {
    const result = await this.pool.query(
      `
        SELECT id, type, status, payload, attempts, last_error, created_at, updated_at
        FROM jobs
        ORDER BY created_at DESC
      `
    );

    return result.rows.map(mapJob);
  }

  async addEvent(event) {
    await this.pool.query(
      `
        INSERT INTO events (id, type, message, payload)
        VALUES ($1, $2, $3, $4::jsonb)
      `,
      [randomUUID(), event.type, event.message, JSON.stringify(event.payload || {})]
    );
  }

  async listEvents(limit = 100) {
    const result = await this.pool.query(
      `
        SELECT id, type, message, payload, created_at
        FROM events
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );

    return result.rows.map(mapEvent);
  }

  async startWebhookEvent(input) {
    const insertResult = await this.pool.query(
      `
        INSERT INTO webhook_events (
          event_id,
          source,
          type,
          status,
          payload,
          error_message,
          processed_at
        )
        VALUES ($1, $2, $3, 'received', $4::jsonb, NULL, NULL)
        ON CONFLICT (event_id)
        DO NOTHING
        RETURNING event_id, source, type, status, payload, error_message, created_at, processed_at
      `,
      [input.eventId, input.source || "stripe", input.type, JSON.stringify(input.payload || null)]
    );

    if (insertResult.rows.length > 0) {
      return { duplicate: false, event: mapWebhookEvent(insertResult.rows[0]) };
    }

    const existing = await this.pool.query(
      `
        SELECT event_id, source, type, status, payload, error_message, created_at, processed_at
        FROM webhook_events
        WHERE event_id = $1
        LIMIT 1
      `,
      [input.eventId]
    );

    return { duplicate: true, event: mapWebhookEvent(existing.rows[0]) };
  }

  async finishWebhookEvent(eventId, patch) {
    const result = await this.pool.query(
      `
        UPDATE webhook_events
        SET
          status = $2,
          error_message = $3,
          processed_at = NOW()
        WHERE event_id = $1
        RETURNING event_id, source, type, status, payload, error_message, created_at, processed_at
      `,
      [eventId, patch.status, patch.errorMessage || null]
    );

    return mapWebhookEvent(result.rows[0]);
  }

  async listWebhookEvents(limit = 100) {
    const result = await this.pool.query(
      `
        SELECT event_id, source, type, status, payload, error_message, created_at, processed_at
        FROM webhook_events
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );

    return result.rows.map(mapWebhookEvent);
  }
}

module.exports = PostgresDbAdapter;
