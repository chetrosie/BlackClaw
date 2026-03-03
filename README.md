# BlackClaw MVP (OpenClaw 托管服务)

## 版本
- 当前版本：`v1.0.2`
- 版本策略：`MAJOR.MINOR.PATCH`
- 迭代规则：每次功能/页面修改默认递增 `PATCH`（如 `v1.0.3`）

## 这个项目现在能做什么
这是一个可跑通的 MVP 链路：

1. 营销页（`index.html`）
2. 控制台（`dashboard.html`）
3. API（`server/*`）
4. 模拟支付回调（替代 Stripe UI）
5. 自动创建订阅 + 实例
6. 后台任务把实例从 `provisioning` 变成 `running`

即：`登录 -> 模拟购买 -> 触发 webhook -> 创建实例 -> 异步编排上线`。

## 架构链路（可实现版）

### 1) 展示层
- `Cloudflare Pages` 部署营销页
- 文件：`index.html`

### 2) 控制层（本项目）
- `Node.js + Express` API
- 文件：`server/app.js`

### 3) 计费层（MVP 为模拟）
- 端点：`POST /api/dev/simulate-purchase`
- 实际生产可替换为 Stripe Webhook：`POST /api/webhooks/stripe`

### 4) 编排层
- 后台 worker 定时取队列任务：`server/services/provisioner.js`
- Provider 适配器：`server/providers/mockProvider.js`

### 5) 状态与数据
- 简易 JSON 数据库：`data/db.json`
- 实体：`users / subscriptions / instances / jobs / events`

## 目录结构

```text
blackclaw-clone/
  index.html
  dashboard.html
  server/
    app.js
    index.js
    config.js
    lib/db.js
    providers/mockProvider.js
    services/provisioner.js
  data/db.json
  scripts/
    cf-pages-create.sh
    cf-pages-deploy.sh
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

打开：
- 营销页：`http://localhost:8787/`
- 控制台：`http://localhost:8787/dashboard.html`
- 健康检查：`http://localhost:8787/api/health`

## Dashboard 演示流程

1. 在 dashboard 点击 `Login / Create User`
2. 点击 `Trigger checkout.session.completed`
3. 观察 `Jobs` 从 `queued/running` 到 `done`
4. 观察 `Instances` 从 `provisioning` 到 `running`

## Cloudflare Pages（一键部署营销页）

```bash
cd /Users/chuen/Projects/blackclaw-clone
npm run cf:login
PROJECT_NAME=blackclaw npm run cf:project:create   # 首次
PROJECT_NAME=blackclaw npm run cf:deploy
```

> 注意：Cloudflare Pages 只部署静态页面。`server/*` API 需要独立部署（Cloudflare Workers / Railway / Render / Fly.io 等）。

## 推到 GitHub（新仓库）

```bash
cd /Users/chuen/Projects/blackclaw-clone
git init
git add .
git commit -m "feat: bootstrap blackclaw mvp v1.0.2"

git branch -M main
git remote add origin git@github.com:<your-account>/blackclaw-mvp.git
git push -u origin main
```

## 下一步建议（生产化）

1. 把 `mockProvider` 替换为真实云厂商 API（Hetzner / AWS / RunPod）
2. 接入真实 Stripe Checkout + Webhook 签名校验
3. 将 `data/db.json` 升级为 Postgres
4. 增加用户鉴权（JWT + session）
5. 增加实例日志、监控、配额与告警
