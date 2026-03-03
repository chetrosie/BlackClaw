# Changelog

All notable changes to this project will be documented in this file.

## v1.0.6 - 2026-03-03

- Upgraded data layer to adapter architecture with async API:
  - `server/lib/db.js` now routes through pluggable adapters
  - added `server/lib/db/jsonAdapter.js`
  - added `server/lib/db/postgresAdapter.js`
  - added Postgres bootstrap schema `server/lib/db/migrations/001_init.sql`
- Added PostgreSQL runtime support with env-driven driver selection:
  - `DB_DRIVER=json|postgres`
  - `DATABASE_URL`, `DATABASE_POOL_MAX`, `DATABASE_SSL`
- Added Stripe webhook idempotency:
  - webhook payload now tracks `event.id`
  - dedupe state persisted in `webhook_events`
  - duplicate events return safe `duplicate: true` response
- Added webhook signature modes:
  - `WEBHOOK_MODE=mock` keeps existing `x-mock-signature`
  - `WEBHOOK_MODE=stripe` validates `stripe-signature`
- Upgraded provider abstraction:
  - added registry `server/providers/index.js`
  - added `server/providers/httpProvider.js`
  - kept `mockProvider` as default
- Refactored API routes + provision worker to full async DB calls.
- Added new observability endpoint: `GET /api/webhook-events`.
- Updated CI syntax check to cover all backend JS files under `server/**/*.js`.
- Synced version markers to `v1.0.6` in `VERSION`, `index.html`, `dashboard.html`, `server/app.js`, `README.md`, `CHANGELOG.md`, and `package.json`.

## v1.0.5 - 2026-03-03

- Updated deployment strategy to match current setup:
  - Cloudflare Pages uses native GitHub integration for auto-deploy
  - `.github/workflows/deploy-pages.yml` changed to manual trigger only (`workflow_dispatch`)
- Added About section navigation links and project intro block already kept in landing page.
- Synced version markers to `v1.0.5` in `VERSION`, `index.html`, `dashboard.html`, `server/app.js`, `README.md`, and `package.json`.
- Local git identity remains:
  - `CodeX <codex@users.noreply.github.com>`

## v1.0.4 - 2026-03-03

- Added new `About` section on landing page with project introduction:
  - project goal
  - current MVP scope
  - next implementation plan
- Added `About` anchor links in top navigation and footer.
- Synced version markers to `v1.0.4` in `VERSION`, `index.html`, `dashboard.html`, `server/app.js`, `README.md`, and `package.json`.
- Updated local git commit identity to:
  - `user.name = CodeX`
  - `user.email = codex@users.noreply.github.com`

## v1.0.3 - 2026-03-03

- Added GitHub Actions workflows:
  - `deploy-pages.yml`: auto deploy static site to Cloudflare Pages on `main`
  - `backend-ci.yml`: backend Node syntax check + Docker image build check
- Added static bundle preparation script `scripts/prepare-static.sh`.
- Updated Cloudflare deploy script to deploy `./dist-static` instead of project root.
- Added containerization files:
  - `Dockerfile`
  - `.dockerignore`
- Updated project scripts (`prepare:static`) and deployment documentation.
- Synced version markers to `v1.0.3` in `VERSION`, `index.html`, `dashboard.html`, `server/app.js`, `README.md`, `CHANGELOG.md`, `package.json`.

## v1.0.2 - 2026-03-03

- Added runnable MVP backend for BlackClaw control-plane flow:
  - user mock login
  - billing checkout session creation
  - Stripe-like webhook handling
  - subscription activation
  - instance provisioning job queue
  - mock provider orchestration (`provisioning -> running`)
- Added dashboard UI (`dashboard.html`) to test full chain in browser.
- Added JSON database bootstrap (`data/db.json`) and lightweight persistence layer.
- Updated `package.json` with runtime scripts (`dev`, `start`) and API dependencies.
- Synced version markers to `v1.0.2` in `VERSION`, `index.html`, `README.md`, `CHANGELOG.md`.
- Expanded README with architecture, runbook, and GitHub push steps.

## v1.0.1 - 2026-03-03

- Added Cloudflare Pages one-click deployment scripts:
  - `scripts/cf-pages-create.sh`
  - `scripts/cf-pages-deploy.sh`
- Added `package.json` scripts:
  - `cf:login`
  - `cf:project:create`
  - `cf:deploy`
  - `cf:deploy:preview`
- Updated `README.md` with step-by-step Cloudflare deployment commands.
- Synced version markers to `v1.0.1` (`VERSION`, `index.html`, `README.md`, `CHANGELOG.md`).

## v1.0.0 - 2026-03-03

- Repositioned site as `OpenClaw / Clawdbot` managed hosting service for `BlackClaw`.
- Rebuilt homepage visual system with `agentcard.sh` inspired style:
  - minimal dark layout
  - mono labels/navigation
  - square cards and buttons
  - scrolling notice bar
  - terminal-style hero module
- Preserved brand accent color `#3dd68c`.
- Added versioning baseline files: `VERSION`, `CHANGELOG.md`.
- Added in-page version markers (`meta app-version` and footer `v1.0.0`).
