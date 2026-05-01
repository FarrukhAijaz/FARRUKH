#!/usr/bin/env bash
# Starts both the POS desktop app and the Expo waiter-mobile server.
# Usage:  bash start-all.sh
#         bash start-all.sh --fresh   (also resets the POS database)

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_IP=$(hostname -I | awk '{print $1}')

# ── Load nvm so the correct Node version is available ──────────────────────────
export NVM_DIR="$HOME/.nvm"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  source "$NVM_DIR/nvm.sh"
  nvm use 20 --silent
else
  echo "⚠  nvm not found. Make sure Node 20+ is on your PATH."
fi

# ── Print connection info upfront ─────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  POS System — Starting up"
echo "  Local IP  : $LOCAL_IP"
echo "  POS API   : http://$LOCAL_IP:3000"
echo "  Expo URL  : exp://$LOCAL_IP:8081"
echo "  On phone  : open Expo Go → scan QR"
echo "              then enter IP: $LOCAL_IP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Start POS desktop app (Electron + Express API on :3000) ─────────────────
echo "▶  Starting POS App (Electron)..."
gnome-terminal --title="POS Desktop App" -- bash -c "
  cd \"$ROOT_DIR/POS_App\"
  bash start.sh $*
  exec bash
" 2>/dev/null || \
xterm -title "POS Desktop App" -e bash -c "
  cd \"$ROOT_DIR/POS_App\"
  bash start.sh $*
  exec bash
" 2>/dev/null || \
(cd "$ROOT_DIR/POS_App" && bash start.sh "$@" &)

# Give the Electron app a moment to begin starting
sleep 2

# ── 2. Start Expo waiter-mobile server ─────────────────────────────────────────
echo "▶  Starting Expo waiter-mobile server..."
gnome-terminal --title="Waiter Mobile (Expo)" -- bash -c "
  cd \"$ROOT_DIR/waiter-mobile\"
  bash start.sh
  exec bash
" 2>/dev/null || \
xterm -title "Waiter Mobile (Expo)" -e bash -c "
  cd \"$ROOT_DIR/waiter-mobile\"
  bash start.sh
  exec bash
" 2>/dev/null || \
(cd "$ROOT_DIR/waiter-mobile" && bash start.sh)

echo ""
echo "✔  Both apps launched."
echo "   POS API : http://$LOCAL_IP:3000"
echo "   Expo    : exp://$LOCAL_IP:8081  — scan QR with Expo Go"
