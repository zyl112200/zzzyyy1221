#!/usr/bin/env bash
# ============================================================
#  Bikini Bottom Fishing - Linux / macOS one-click launcher
#  Requires: Node.js 18+, JDK 17+, Maven 3.6+ (all on PATH)
#  Backend runs on H2 in-memory DB, no MySQL needed
# ============================================================
set -e

# ---- clear injected port override ---------------------------------
# Some sandboxes / cloud shells inject SERVER__PORT, which Spring Boot
# reads as server.port and hijacks our 8080. Clear it so application.yml
# (server.port: 8080) takes effect.
unset SERVER__PORT 2>/dev/null

command -v java >/dev/null 2>&1 || { echo "[ERROR] Java not found. Install JDK 17+."; exit 1; }
command -v mvn  >/dev/null 2>&1 || { echo "[ERROR] Maven not found. Install and add to PATH."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "[ERROR] Node.js not found. Install from https://nodejs.org"; exit 1; }

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "============================================================"
echo "  Bikini Bottom Fishing is starting ..."
echo "    backend : http://localhost:8080  (H2 in-memory, no MySQL)"
echo "    frontend: http://localhost:5173"
echo "    account : spongebob / 123456"
echo "============================================================"

# backend (background)
# --server.port=8080 is a command-line argument (highest Spring Boot precedence)
# so it always wins over any injected SERVER__PORT env variable.
( cd "$ROOT/backend" && mvn -Dspring-boot.run.profiles=h2 -Dspring-boot.run.arguments=--server.port=8080 spring-boot:run ) &
BACK_PID=$!

# frontend (background): install deps then serve
( cd "$ROOT" && npm install && npm run dev ) &
FRONT_PID=$!

echo "Both services started in background (backend PID=$BACK_PID, frontend PID=$FRONT_PID)."
echo "First run downloads dependencies (~1-3 min). Then open http://localhost:5173"
echo "Press Ctrl+C to stop both services."

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT INT TERM
wait
