const config = require("../config");

function buildHeaders() {
  const headers = {
    "content-type": "application/json",
  };

  if (config.provider.http.apiKey) {
    headers.authorization = `Bearer ${config.provider.http.apiKey}`;
  }

  return headers;
}

function buildUrl(route) {
  if (!config.provider.http.baseUrl) {
    throw new Error("provider http base url missing: set PROVIDER_HTTP_BASE_URL");
  }

  const normalizedBase = config.provider.http.baseUrl.endsWith("/")
    ? config.provider.http.baseUrl.slice(0, -1)
    : config.provider.http.baseUrl;

  return `${normalizedBase}${route}`;
}

async function request(route, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.provider.http.timeoutMs);

  try {
    const response = await fetch(buildUrl(route), {
      method: options.method || "GET",
      headers: buildHeaders(),
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message = payload.error || payload.message || `provider http request failed: ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("provider request timeout");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function provisionInstance(instance) {
  const response = await request("/instances/provision", {
    method: "POST",
    body: {
      instanceId: instance.id,
      userId: instance.userId,
      plan: instance.plan,
      region: instance.region,
    },
  });

  return {
    providerRef: response.providerRef || response.id || `http-${instance.id.slice(0, 12)}`,
    endpoint: response.endpoint || null,
    status: response.status || "running",
  };
}

async function instanceAction(instance, action) {
  const response = await request(`/instances/${instance.id}/actions`, {
    method: "POST",
    body: { action },
  });

  return {
    status: response.status || "running",
  };
}

module.exports = {
  provisionInstance,
  instanceAction,
};
