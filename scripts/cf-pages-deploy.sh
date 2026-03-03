#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${PROJECT_NAME:-blackclaw}"
BRANCH="${BRANCH:-main}"

if [[ "${1:-}" != "" ]]; then
  BRANCH="$1"
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash ./scripts/prepare-static.sh

echo "Deploying static bundle to Cloudflare Pages"
echo "Project: ${PROJECT_NAME}"
echo "Branch:  ${BRANCH}"

echo "Directory: ./dist-static"
npx wrangler@4 pages deploy ./dist-static --project-name "$PROJECT_NAME" --branch "$BRANCH"
