# BlackClaw MVP (OpenClaw 托管服务)

## 版本
- 当前版本：`v1.0.7`
- 版本策略：`MAJOR.MINOR.PATCH`
- 迭代规则：每次功能/页面修改默认递增 `PATCH`

## v1.0.7 新增能力
1. 新增 Cloudflare 部署环境矩阵文档：`docs/cloudflare-env-matrix.md`
2. Dashboard 新增 API Base 可配置（支持 Pages 前后端分离）
3. 完成 Pages/Workers 变量落地清单（命令级）

## v1.0.6 能力
1. 数据层可插拔：`JSON` / `PostgreSQL`
2. Stripe webhook 幂等：基于 `event.id` 去重
3. Provider 驱动切换：`mock` / `http`
4. API 与任务编排异步化

## 当前能力（MVP）
1. 营销页（`index.html`）
2. 控制台（`dashboard.html`）
3. 控制面 API（`server/*`）
4. 模拟购买与 webhook 回调
5. 自动创建订阅 + 实例
6. 后台任务把实例从 `provisioning` 推进到 `running`

链路：`登录 -> 购买回调 -> 订阅生效 -> 创建实例 -> 异步编排上线`

## 架构

### 展示层
- Cloudflare Pages（静态）
- 文件：`index.html`, `dashboard.html`

### 控制层
- Node.js + Express
- 文件：`server/app.js`

### 计费回调层
- 入口：`POST /api/webhooks/stripe`
- 模式：
  - `WEBHOOK_MODE=mock`（使用 `x-mock-signature`）
  - `WEBHOOK_MODE=stripe`（校验 `stripe-signature`）
- 幂等：`webhook_events` 记录已处理事件，重复 `event.id` 直接忽略

### 编排层
- Worker：`server/services/provisioner.js`
- Provider Registry：`server/providers/index.js`
- Provider 驱动：
  - `mockProvider`（本地模拟）
  - `httpProvider`（对接外部编排服务）

### 数据层
- 适配入口：`server/lib/db.js`
- 适配实现：
  - `server/lib/db/jsonAdapter.js`
  - `server/lib/db/postgresAdapter.js`
- Postgres 初始化 SQL：`server/lib/db/migrations/001_init.sql`

## 本地运行（JSON 模式）
```bash
cd /Users/chuen/Projects/blackclaw-clone
npm install
cp .env.example .env
npm run dev
```

默认使用 JSON 文件 `data/db.json`。

访问：
- 营销页：`http://localhost:8787/`
- 控制台：`http://localhost:8787/dashboard.html`
- 健康检查：`http://localhost:8787/api/health`

## Dashboard API Base（v1.0.7）
当你把页面部署到 `*.pages.dev`，后端部署在其他域名时：

1. 打开 `dashboard.html`
2. 在 `API Endpoint` 区域填写后端地址（例如 `https://api.blackclaw.ai`）
3. 点击 `Save API Base`

也可用 URL 参数一次性注入：

```text
https://blackclaw.pages.dev/dashboard.html?apiBase=https://api.blackclaw.ai
```

## 切换 PostgreSQL
1. 准备数据库（本地或云）
2. 设置环境变量：

```bash
DB_DRIVER=postgres
DATABASE_URL=postgres://user:password@host:5432/blackclaw
DATABASE_SSL=false
```

3. 启动服务：

```bash
npm run dev
```

服务启动时会自动执行 `001_init.sql` 建表。

## Webhook 幂等验证
同一个 `event.id` 连续发送两次到 `POST /api/webhooks/stripe`：
- 第一次：正常处理
- 第二次：返回 `duplicate: true`

可查看记录：`GET /api/webhook-events`

## Provider 切换
- `PROVIDER_DRIVER=mock`：默认本地模拟
- `PROVIDER_DRIVER=http`：调用外部编排 API

当使用 `http` 时需配置：

```bash
PROVIDER_HTTP_BASE_URL=https://your-orchestrator.example.com
PROVIDER_HTTP_API_KEY=xxx
PROVIDER_HTTP_TIMEOUT_MS=5000
```

## Cloudflare 部署矩阵
完整环境变量和命令清单见：

- `docs/cloudflare-env-matrix.md`

## Pages 部署模式（当前）
- 主模式：Cloudflare Pages 直接关联 GitHub 自动部署
- 备用模式：`.github/workflows/deploy-pages.yml` 手动触发

## GitHub Actions
1. `backend-ci.yml`
- 自动安装依赖
- 校验 `server/**/*.js` 语法
- 进行 `docker build` 构建检查

2. `deploy-pages.yml`
- 手动触发备用部署

## 生产化下一步
1. 接入真实 Stripe Checkout Session 创建
2. Provider `http` 增加重试、熔断、回调签名校验
3. 增加鉴权（JWT/Session）与 RBAC
4. 增加审计日志、告警和指标观测
