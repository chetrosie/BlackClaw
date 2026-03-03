#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${OUTPUT_DIR:-$ROOT_DIR/dist-static}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

cp "$ROOT_DIR/index.html" "$OUT_DIR/index.html"

if [[ -f "$ROOT_DIR/dashboard.html" ]]; then
  cp "$ROOT_DIR/dashboard.html" "$OUT_DIR/dashboard.html"
fi

if [[ -d "$ROOT_DIR/public" ]]; then
  mkdir -p "$OUT_DIR/public"
  cp -R "$ROOT_DIR/public/." "$OUT_DIR/public/"
fi

echo "Prepared static site in: $OUT_DIR"
