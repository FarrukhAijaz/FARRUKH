#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

EXPO_PORT=8081

# ── Load nvm ──────────────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  source "$NVM_DIR/nvm.sh"
  nvm use 20 --silent
else
  echo "⚠  nvm not found. Make sure Node 20+ is on your PATH."
fi

# ── Kill anything on port $EXPO_PORT ─────────────────────────────────────────
if lsof -ti:$EXPO_PORT > /dev/null 2>&1; then
  echo "Port $EXPO_PORT is busy — freeing it..."
  lsof -ti:$EXPO_PORT | xargs kill -9 2>/dev/null || true
  sleep 1
fi

# ── Install deps if missing ───────────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# ── Show connection info ──────────────────────────────────────────────────────
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Waiter Mobile (Expo)"
echo "  Local IP  : $LOCAL_IP"
echo "  Expo URL  : exp://$LOCAL_IP:$EXPO_PORT"
echo "  On phone  : open Expo Go and scan QR"
echo "  POS API   : http://$LOCAL_IP:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx expo start --port $EXPO_PORT --clear
