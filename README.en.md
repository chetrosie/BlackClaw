<div align="center">
  <h1>BlackClaw</h1>
  <p><strong>Fully Managed OpenClaw Hosting Platform</strong></p>
  <p><a href="./README.md">简体中文</a> | English</p>
  <p>
    <img alt="version" src="https://img.shields.io/badge/version-v1.0.10-3dd68c" />
    <img alt="license" src="https://img.shields.io/badge/license-MIT-blue" />
    <img alt="stack" src="https://img.shields.io/badge/stack-Node.js%20%2B%20Cloudflare-0ea5e9" />
  </p>
  <p>Quick Start • Core Features • Plans & Billing • Deployment • Roadmap</p>
</div>

---

## 🍥 Overview
BlackClaw is a fully managed OpenClaw hosting project where users can sign up, purchase, provision instances, and operate services from a web control plane.

This repository currently includes:
- Marketing site + dashboard (Cloudflare Pages)
- Control-plane API (Node.js + Express)
- Pluggable data layer (JSON / PostgreSQL)
- Webhook signature verification and idempotency
- Provider abstraction (`mock` / `http`)

## 📌 Version
- Current: `v1.0.10`
- Policy: `MAJOR.MINOR.PATCH`
- Release rule: each feature/UI update increments `PATCH`.

## ✨ Core Features
1. Managed flow: login -> billing callback -> subscription activation -> instance creation -> provisioning online
2. Control-plane API: Node.js + Express
3. Data layer: dual drivers (`JSON` and `PostgreSQL`)
4. Billing callback: webhook verification + idempotent handling
5. Provisioning layer: provider registry (`mock` / `http`)
6. Frontend: Cloudflare Pages (Landing + Dashboard)

## 💰 Plans & Billing (Template)

### Plan Template
| Plan | Monthly | Yearly | Use Case |
| --- | --- | --- | --- |
| Lite | `$19` | `$190` | Personal and light workloads |
| Pro | `$49` | `$490` | Team production environments |
| Max | `$99` | `$990` | High concurrency and multi-instance workloads |

### Billing Policy Template
1. Subscriptions auto-renew monthly by default; yearly billing gets discount.
2. Upgrades/downgrades are handled with proration.
3. Cancellation takes effect at period end unless immediate cancellation is enabled.

### Payment Methods Template
- Credit cards, Apple Pay, Google Pay (subject to payment provider support).

### Refund Policy Template
- No automatic refunds by default. Duplicate charges or service failures are reviewed via support tickets.

## 🏗️ Architecture

### Frontend
- Cloudflare Pages
- Files: `index.html`, `dashboard.html`

### Control Layer
- Node.js + Express
- File: `server/app.js`

### Data Layer
- Entry: `server/lib/db.js`
- Adapters:
  - `server/lib/db/jsonAdapter.js`
  - `server/lib/db/postgresAdapter.js`
- Postgres schema: `server/lib/db/migrations/001_init.sql`

### Billing & Idempotency
- Webhook endpoint: `POST /api/webhooks/stripe`
- Modes:
  - `WEBHOOK_MODE=mock` (`x-mock-signature`)
  - `WEBHOOK_MODE=stripe` (`stripe-signature`)
- Idempotency store: `webhook_events`

### Provisioning Layer
- Worker: `server/services/provisioner.js`
- Registry: `server/providers/index.js`
- Drivers: `mockProvider` / `httpProvider`

## 🚀 Quick Start

### Local Run (JSON)
```bash
cd /Users/chuen/Projects/blackclaw-clone
npm install
cp .env.example .env
npm run dev
```

Access:
- Landing: `http://localhost:8787/`
- Dashboard: `http://localhost:8787/dashboard.html`
- Health: `http://localhost:8787/api/health`

### Dashboard API Base (Split Deploy)
When frontend and backend are on different domains:

1. Set backend address in `API Endpoint` inside `dashboard.html`.
2. Or inject it once via URL parameter:

```text
https://blackclaw.pages.dev/dashboard.html?apiBase=https://api.blackclaw.ai
```

## ⚙️ Key Configuration

### PostgreSQL
```bash
DB_DRIVER=postgres
DATABASE_URL=postgres://user:password@host:5432/blackclaw
DATABASE_SSL=false
DATABASE_POOL_MAX=10
```

### Webhook
```bash
WEBHOOK_MODE=mock
STRIPE_WEBHOOK_SECRET=dev_webhook_secret

# or
WEBHOOK_MODE=stripe
STRIPE_SIGNING_SECRET=whsec_xxx
STRIPE_TOLERANCE_SEC=300
```

### Provider
```bash
PROVIDER_DRIVER=mock

# or
PROVIDER_DRIVER=http
PROVIDER_HTTP_BASE_URL=https://your-orchestrator.example.com
PROVIDER_HTTP_API_KEY=xxx
PROVIDER_HTTP_TIMEOUT_MS=5000
```

## 📚 Deployment
- Primary: Cloudflare Pages + GitHub auto-deploy
- Fallback: manual workflow `.github/workflows/deploy-pages.yml`
- Env matrix: `docs/cloudflare-env-matrix.md`

## 🔌 API Quick Reference
- `GET /api/health`
- `POST /api/users/mock-login`
- `POST /api/billing/checkout-session`
- `POST /api/webhooks/stripe`
- `POST /api/dev/simulate-purchase`
- `GET /api/instances`
- `POST /api/instances/:id/actions`
- `GET /api/jobs`
- `GET /api/events`
- `GET /api/webhook-events`

## 🗺️ Roadmap
1. Real payment integration (Checkout + Subscription + Customer Portal)
2. Retries/circuit breaker/signature validation for `http` provider
3. Auth + RBAC
4. Audit logs, metrics, and alerting
