# BlackClaw MVP / OpenClaw 全托管平台

## 简介 | Overview
- `中文`：BlackClaw 是一个面向 OpenClaw 的全托管云服务项目，目标是让用户在网页上完成注册、购买、实例开通和运维操作。
- `English`: BlackClaw is a fully managed OpenClaw hosting project that lets users complete signup, purchase, provisioning, and operations from a web control plane.

## 版本 | Version
- `当前版本 / Current`: `v1.0.9`
- `版本策略 / Policy`: `MAJOR.MINOR.PATCH`
- `迭代规则 / Release rule`: 每次功能或页面更新默认递增 `PATCH`.

## 核心能力 | Core Capabilities
1. `全托管链路 / Managed flow`：登录 -> 购买回调 -> 订阅生效 -> 实例创建 -> 编排上线
2. `控制面 API / Control-plane API`：Node.js + Express
3. `数据层 / Data layer`：`JSON` 与 `PostgreSQL` 双驱动
4. `计费回调 / Billing webhook`：Stripe 风格验签 + 幂等去重
5. `编排层 / Provisioning layer`：Provider 抽象（`mock` / `http`）
6. `前端 / Frontend`：Cloudflare Pages 静态站（Landing + Dashboard）

## 套餐与计费说明 | Plans & Billing

### 套餐模板 | Plan Template
| 套餐 Plan | 月付 Monthly | 年付 Yearly | 适用场景 Use Case |
| --- | --- | --- | --- |
| Lite | `$19` | `$190` | 个人与轻量测试 Personal / light workloads |
| Pro | `$49` | `$490` | 小团队生产环境 Team production |
| Max | `$99` | `$990` | 高并发与多实例 Advanced workloads |

### 计费规则模板 | Billing Policy Template
1. `中文`：默认按月自动续费；年付享受折扣。
2. `English`: Subscriptions renew automatically. Yearly billing includes discounted pricing.
3. `中文`：支持升级/降级，按剩余周期比例结算（proration）。
4. `English`: Upgrade/downgrade uses prorated adjustments for the remaining billing period.
5. `中文`：取消订阅后服务持续到当前计费周期结束。
6. `English`: Cancellation takes effect at period end unless immediate cancellation is explicitly enabled.

### 支付方式模板 | Payment Methods Template
- `中文`：支持信用卡、Apple Pay、Google Pay（以支付通道能力为准）。
- `English`: Credit cards, Apple Pay, and Google Pay are supported based on payment provider capabilities.

### 退款政策模板 | Refund Policy Template
- `中文`：默认不自动退款；如遇重复扣费或系统故障，按工单审核处理。
- `English`: No automatic refunds by default. Duplicate charges or service failures are handled via support review.

## 架构 | Architecture

### 展示层 | Frontend
- Cloudflare Pages
- 文件 / Files: `index.html`, `dashboard.html`

### 控制层 | Control Layer
- Node.js + Express
- 文件 / File: `server/app.js`

### 数据层 | Data Layer
- 适配入口 / Entry: `server/lib/db.js`
- 适配实现 / Adapters:
  - `server/lib/db/jsonAdapter.js`
  - `server/lib/db/postgresAdapter.js`
- Postgres schema: `server/lib/db/migrations/001_init.sql`

### 计费与幂等 | Billing & Idempotency
- Webhook endpoint: `POST /api/webhooks/stripe`
- 模式 / Modes:
  - `WEBHOOK_MODE=mock` (`x-mock-signature`)
  - `WEBHOOK_MODE=stripe` (`stripe-signature`)
- 幂等记录 / Idempotency store: `webhook_events`

### 编排层 | Provisioning Layer
- Worker: `server/services/provisioner.js`
- Registry: `server/providers/index.js`
- Drivers:
  - `mockProvider`
  - `httpProvider`

## 快速开始 | Quick Start

### 本地运行（JSON） | Local Run (JSON)
```bash
cd /Users/chuen/Projects/blackclaw-clone
npm install
cp .env.example .env
npm run dev
```

访问 / Access:
- Landing: `http://localhost:8787/`
- Dashboard: `http://localhost:8787/dashboard.html`
- Health: `http://localhost:8787/api/health`

### Dashboard API Base（前后端分离） | Dashboard API Base (Split Deploy)
当页面部署在 `*.pages.dev`，后端在其他域名时：

When frontend and backend are on different domains:

1. 在 `dashboard.html` 的 `API Endpoint` 输入后端地址并保存。
2. Or inject once with query param:

```text
https://blackclaw.pages.dev/dashboard.html?apiBase=https://api.blackclaw.ai
```

## 关键配置 | Key Configuration

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

## 部署说明 | Deployment Notes
- 当前主模式 / Primary mode: Cloudflare Pages + GitHub 自动部署
- 备用模式 / Fallback mode: `.github/workflows/deploy-pages.yml` 手动触发
- 变量矩阵 / Env matrix: `docs/cloudflare-env-matrix.md`

## API 快览 | API Quick Reference
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

## 路线图 | Roadmap
1. 接入真实支付（Checkout + Subscription + Customer Portal）
2. Provider `http` 增加重试、熔断、签名校验
3. 用户鉴权 + RBAC
4. 审计日志、指标、告警
