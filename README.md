# BlackClaw MVP (OpenClaw 托管服务)

## 版本
- 当前版本：`v1.0.5`
- 版本策略：`MAJOR.MINOR.PATCH`
- 迭代规则：每次功能/页面修改默认递增 `PATCH`（如 `v1.0.6`）

## 当前能力
这是一个可跑通的 MVP 链路：

1. 营销页（`index.html`，含 About 项目简介模块）
2. 控制台（`dashboard.html`）
3. API（`server/*`）
4. 模拟支付回调（替代 Stripe UI）
5. 自动创建订阅 + 实例
6. 后台任务把实例从 `provisioning` 变成 `running`

即：`登录 -> 模拟购买 -> 触发 webhook -> 创建实例 -> 异步编排上线`。

## 架构链路

### 展示层
- Cloudflare Pages（静态站）
- 文件：`index.html`, `dashboard.html`

### 控制层
- `Node.js + Express` API
- 文件：`server/app.js`

### 计费层（当前为模拟）
- 模拟：`POST /api/dev/simulate-purchase`
- 真实接入入口：`POST /api/webhooks/stripe`

### 编排层
- Worker：`server/services/provisioner.js`
- Provider 适配器：`server/providers/mockProvider.js`

### 数据层
- JSON DB：`data/db.json`
- 实体：`users / subscriptions / instances / jobs / events`

## 目录结构

```text
blackclaw-clone/
  index.html
  dashboard.html
  server/
  data/db.json
  scripts/
    prepare-static.sh
    cf-pages-create.sh
    cf-pages-deploy.sh
  .github/workflows/
    deploy-pages.yml
    backend-ci.yml
  Dockerfile
  package.json
  VERSION
  CHANGELOG.md
```

## 本地运行

```bash
cd /Users/chuen/Projects/blackclaw-clone
npm install
npm run dev
```

访问：
- 营销页：`http://localhost:8787/`
- 控制台：`http://localhost:8787/dashboard.html`
- 健康检查：`http://localhost:8787/api/health`

## Dashboard 演示流程

1. 点击 `Login / Create User`
2. 点击 `Trigger checkout.session.completed`
3. 观察 `Jobs` 从 `queued/running` 到 `done`
4. 观察 `Instances` 从 `provisioning` 到 `running`

## Pages 部署模式（当前）

你当前已改为：**Cloudflare Pages 直接关联 GitHub 仓库自动部署**（推荐）。

- `push main` 后由 Cloudflare 原生 Git Integration 触发部署。
- 仓库里的 `deploy-pages.yml` 已改为 **仅手动触发**（应急备用）。

## GitHub Actions（当前保留）

### 1) deploy-pages（手动）
文件：`.github/workflows/deploy-pages.yml`
触发：`workflow_dispatch`（手动）
用途：当 Cloudflare Git Integration 异常时，手工触发备用部署。

### 2) backend-ci（自动）
文件：`.github/workflows/backend-ci.yml`
触发：后端相关文件 `push/pull_request`

包含：
- Node 依赖安装与语法检查
- `docker build` 构建检查（`Dockerfile`）

## Cloudflare Pages（手动备用命令）

```bash
cd /Users/chuen/Projects/blackclaw-clone
npm run cf:login
PROJECT_NAME=blackclaw npm run cf:deploy
```

## 生产化下一步

1. 用真实云厂商 API 替换 `mockProvider`
2. 接入真实 Stripe Checkout + Webhook 签名
3. JSON DB 升级 Postgres
4. 加用户鉴权（JWT/session）
5. 加日志、告警、配额、审计
