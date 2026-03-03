#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-blackclaw}"
PRODUCTION_BRANCH="${PRODUCTION_BRANCH:-main}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Creating Cloudflare Pages project: ${PROJECT_NAME} (production branch: ${PRODUCTION_BRANCH})"
npx wrangler@4 pages project create "$PROJECT_NAME" --production-branch "$PRODUCTION_BRANCH"
