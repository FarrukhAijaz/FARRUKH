#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FRESH=false
for arg in "$@"; do
  [[ "$arg" == "--fresh" ]] && FRESH=true
done

# Kill any running instance of the app before starting
if pgrep -f "electron.*waiter-pos\|electron-vite dev\|out/main/index.js" > /dev/null 2>&1; then
  echo "Stopping existing instance..."
  pkill -f "electron.*waiter-pos\|electron-vite dev\|out/main/index.js" || true
  sleep 1
fi

# Free ports used by the app (Vite dev=5173, Express API=3000)
for PORT in 5173 3000; do
  if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "Port $PORT is busy — freeing it..."
    lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
  fi
done

# Clean previous build output so we always start from a fresh compile
echo "Cleaning build output..."
rm -rf out/

# --fresh: wipe the database so the app starts with zero orders and clean table states
if [[ "$FRESH" == "true" ]]; then
  DB_PATH="$HOME/.config/waiter-pos/waiter-pos-db.json"
  if [[ -f "$DB_PATH" ]]; then
    echo "Resetting database at $DB_PATH ..."
    rm -f "$DB_PATH"
  fi
  echo "Database cleared. App will re-seed on next start."
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# ── Show connection info ──────────────────────────────────────────────────────
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  POS Desktop App (Electron)"
echo "  Local IP  : $LOCAL_IP"
echo "  API URL   : http://$LOCAL_IP:3000"
echo "  (Enter this IP in the Waiter mobile app)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev
