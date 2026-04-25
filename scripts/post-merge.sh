#!/bin/bash
set -e

echo "[post-merge] Installing npm dependencies..."
npm install --no-audit --no-fund --loglevel=warn

echo "[post-merge] Done."
