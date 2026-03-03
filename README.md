# BlackClaw MVP (OpenClaw 托管服务)

## 版本
- 当前版本：`v1.0.3`
- 版本策略：`MAJOR.MINOR.PATCH`
- 迭代规则：每次功能/页面修改默认递增 `PATCH`（如 `v1.0.4`）

## 当前能力
这是一个可跑通的 MVP 链路：

1. 营销页（`index.html`）
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

## Cloudflare Pages（手动部署）

```bash
cd /Users/chuen/Projects/blackclaw-clone
npm run cf:login
PROJECT_NAME=blackclaw npm run cf:project:create   # 首次
PROJECT_NAME=blackclaw npm run cf:deploy
```

## GitHub Actions（已配置）

### 1) 自动部署静态页
文件：`.github/workflows/deploy-pages.yml`
触发：`push main`（静态相关文件改动）或手动 `workflow_dispatch`

需要在 GitHub 仓库里配置：
- `Secrets`:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- `Variables`（可选）:
  - `CF_PAGES_PROJECT`（默认 `blackclaw`）

### 2) 后端 CI + Docker 构建检查
文件：`.github/workflows/backend-ci.yml`
触发：后端相关文件 `push/pull_request`

包含：
- Node 依赖安装与语法检查
- `docker build` 构建检查（`Dockerfile`）

## 推到 GitHub

```bash
cd /Users/chuen/Projects/blackclaw-clone
git add .
git commit -m "ci: add github actions for pages deploy and backend docker build"
git push
```

## 生产化下一步

1. 用真实云厂商 API 替换 `mockProvider`
2. 接入真实 Stripe Checkout + Webhook 签名
3. JSON DB 升级 Postgres
4. 加用户鉴权（JWT/session）
5. 加日志、告警、配额、审计
