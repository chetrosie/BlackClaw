# Changelog

All notable changes to this project will be documented in this file.

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
