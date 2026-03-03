<div align="center">
  <h1>BlackClaw</h1>
  <p><strong>OpenClaw 全托管平台 / Fully Managed OpenClaw Hosting</strong></p>
  <p>简体中文 | <a href="./README.en.md">English</a></p>
  <p>
    <img alt="version" src="https://img.shields.io/badge/version-v1.0.10-3dd68c" />
    <img alt="license" src="https://img.shields.io/badge/license-MIT-blue" />
    <img alt="stack" src="https://img.shields.io/badge/stack-Node.js%20%2B%20Cloudflare-0ea5e9" />
  </p>
  <p>快速开始 • 核心能力 • 套餐计费 • 部署说明 • 路线图</p>
</div>

---

## 🍥 项目简介
BlackClaw 是一个面向 OpenClaw 的全托管云服务项目，目标是让用户在网页上完成注册、购买、实例开通和运维操作。

当前仓库覆盖的链路：
- 营销站 + 控制台（Cloudflare Pages）
- 控制面 API（Node.js + Express）
- 可插拔数据层（JSON / PostgreSQL）
- Webhook 验签与幂等去重
- Provider 抽象（mock / http）

## 📌 版本信息
- 当前版本：`v1.0.10`
- 版本策略：`MAJOR.MINOR.PATCH`
- 迭代规则：每次功能或页面更新默认递增 `PATCH`

## ✨ 核心能力
1. 全托管流程：登录 -> 购买回调 -> 订阅生效 -> 实例创建 -> 编排上线
2. 控制面 API：Node.js + Express
3. 数据层：`JSON` 与 `PostgreSQL` 双驱动
4. 计费回调：Webhook 验签 + 幂等处理
5. 编排层：Provider Registry（`mock` / `http`）
6. 前端部署：Cloudflare Pages（Landing + Dashboard）

## 💰 套餐与计费说明（模板）

### 套餐模板
| 套餐 | 月付 | 年付 | 适用场景 |
| --- | --- | --- | --- |
| Lite | `$19` | `$190` | 个人与轻量测试 |
| Pro | `$49` | `$490` | 小团队生产环境 |
| Max | `$99` | `$990` | 高并发与多实例 |

### 计费规则模板
1. 默认按月自动续费，年付享受折扣。
2. 支持升级/降级，按剩余周期比例结算（proration）。
3. 取消订阅后，服务持续到当前计费周期结束。

### 支付方式模板
- 支持信用卡、Apple Pay、Google Pay（以支付通道能力为准）。

### 退款政策模板
- 默认不自动退款；如遇重复扣费或系统故障，按工单审核处理。

## 🏗️ 架构

### 展示层
- Cloudflare Pages
- 文件：`index.html`, `dashboard.html`

### 控制层
- Node.js + Express
- 文件：`server/app.js`

### 数据层
- 入口：`server/lib/db.js`
- 适配器：
  - `server/lib/db/jsonAdapter.js`
  - `server/lib/db/postgresAdapter.js`
- Postgres Schema：`server/lib/db/migrations/001_init.sql`

### 计费与幂等
- Webhook：`POST /api/webhooks/stripe`
- 模式：
  - `WEBHOOK_MODE=mock`（`x-mock-signature`）
  - `WEBHOOK_MODE=stripe`（`stripe-signature`）
- 幂等存储：`webhook_events`

### 编排层
- Worker：`server/services/provisioner.js`
- Registry：`server/providers/index.js`
- Drivers：`mockProvider` / `httpProvider`

## 🚀 快速开始

### 本地运行（JSON）
```bash
cd /Users/chuen/Projects/blackclaw-clone
npm install
cp .env.example .env
npm run dev
```

访问地址：
- Landing：`http://localhost:8787/`
- Dashboard：`http://localhost:8787/dashboard.html`
- Health：`http://localhost:8787/api/health`

### Dashboard API Base（前后端分离）
当页面部署在 `*.pages.dev`，后端在其他域名时：

1. 在 `dashboard.html` 的 `API Endpoint` 输入后端地址并保存。
2. 或使用 URL 参数一次性注入：

```text
https://blackclaw.pages.dev/dashboard.html?apiBase=https://api.blackclaw.ai
```

## ⚙️ 关键配置

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

## 📚 部署说明
- 主模式：Cloudflare Pages + GitHub 自动部署
- 备用模式：`.github/workflows/deploy-pages.yml` 手动触发
- 环境变量矩阵：`docs/cloudflare-env-matrix.md`

## 🔌 API 快览
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

## 🗺️ 路线图
1. 接入真实支付（Checkout + Subscription + Customer Portal）
2. Provider `http` 增加重试、熔断、签名校验
3. 用户鉴权 + RBAC
4. 审计日志、指标、告警
