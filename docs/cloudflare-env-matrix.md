# Cloudflare Deploy Matrix (v1.0.8)

本文用于 BlackClaw 在 Cloudflare 体系下的可执行配置清单。

## 1) 推荐部署拓扑

- `Frontend`：Cloudflare Pages（已接 GitHub 自动部署）
- `Backend API`：建议独立服务（容器/VM/PaaS），域名示例：`https://api.blackclaw.ai`
- `Database`：PostgreSQL（Cloudflare D1 不直接兼容当前 `pg` 适配器）
- `Billing`：Stripe Webhook
- `Provider`：`mock`（演示）或 `http`（接真实编排器）

说明：当前后端为 `Express + pg`，不是 Worker 原生运行模型，因此生产建议先保持「Pages + 独立 API」。

## 2) Dashboard API 地址

`dashboard.html` 已支持 API Base 可配置（本地存储键：`blackclaw.apiBase`）：

- 方式 A：打开页面后，在 `API Endpoint` 输入框设置并保存
- 方式 B：使用 URL 参数一次性注入：

```text
https://blackclaw.pages.dev/dashboard.html?apiBase=https://api.blackclaw.ai
```

## 3) 四套环境组合

### Profile A: Local Demo
- 适用：本地联调
- 变量：

```dotenv
DB_DRIVER=json
DB_FILE=./data/db.json

WEBHOOK_MODE=mock
STRIPE_WEBHOOK_SECRET=dev_webhook_secret

PROVIDER_DRIVER=mock
```

### Profile B: Staging (Postgres + Mock)
- 适用：预发稳定性验证
- 变量：

```dotenv
DB_DRIVER=postgres
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/blackclaw_staging
DATABASE_SSL=true
DATABASE_POOL_MAX=10

WEBHOOK_MODE=mock
STRIPE_WEBHOOK_SECRET=<staging_webhook_secret>

PROVIDER_DRIVER=mock
```

### Profile C: Production Core (Postgres + Stripe + Mock)
- 适用：先上线计费闭环，再接真实编排
- 变量：

```dotenv
DB_DRIVER=postgres
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/blackclaw_prod
DATABASE_SSL=true
DATABASE_POOL_MAX=20

WEBHOOK_MODE=stripe
STRIPE_SIGNING_SECRET=whsec_xxx
STRIPE_TOLERANCE_SEC=300

PROVIDER_DRIVER=mock
```

### Profile D: Production Full (Postgres + Stripe + HTTP Provider)
- 适用：完整商用链路
- 变量：

```dotenv
DB_DRIVER=postgres
DATABASE_URL=postgres://USER:PASSWORD@HOST:5432/blackclaw_prod
DATABASE_SSL=true
DATABASE_POOL_MAX=20

WEBHOOK_MODE=stripe
STRIPE_SIGNING_SECRET=whsec_xxx
STRIPE_TOLERANCE_SEC=300

PROVIDER_DRIVER=http
PROVIDER_HTTP_BASE_URL=https://orchestrator.example.com
PROVIDER_HTTP_API_KEY=xxxx
PROVIDER_HTTP_TIMEOUT_MS=5000
```

## 4) Cloudflare Pages / Workers 配置命令

### Pages（项目名示例：`blackclaw`）

Pages 绑定 GitHub 后，建议在 Dashboard 配置变量；若使用 CLI：

```bash
# 机密变量
npx wrangler pages secret put API_BASE_URL --project-name blackclaw

# 预览环境机密
npx wrangler pages secret put API_BASE_URL --project-name blackclaw --env preview
```

> 当前项目是纯静态页面，`dashboard.html` 通过页面配置 API Base，不强依赖 Pages 环境变量。

### Workers（如果你后续把 API 改造成 Worker）

```bash
# 生产环境机密
npx wrangler secret put DATABASE_URL
npx wrangler secret put STRIPE_SIGNING_SECRET
npx wrangler secret put PROVIDER_HTTP_API_KEY

# 非机密变量写入 wrangler.toml 的 [vars]
# DB_DRIVER, WEBHOOK_MODE, PROVIDER_DRIVER 等
```

## 5) 上线核对清单

1. `https://blackclaw.pages.dev/dashboard.html` 能打开
2. Dashboard 的 `API Base` 指向后端域名且 `/api/health` 可达
3. 后端 `GET /api/health` 返回 `dbDriver=postgres`
4. Stripe Webhook 指向：`https://api.blackclaw.ai/api/webhooks/stripe`
5. 同一 `event.id` 重放返回 `duplicate: true`
6. `GET /api/webhook-events` 可看到 `processed` 记录
