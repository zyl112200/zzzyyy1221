#!/usr/bin/env bash
# ============================================================
#  Bikini Bottom Fishing - Linux / macOS 在线浏览启动器
#  前端：构建 dist 并用本地 HTTP 服务对外提供（0.0.0.0，局域网可访问）
#  后端：独立进程，需另行启动（见 README），前端通过 /api 代理访问
#  局域网 IP / 端口统一在 src/config/lan.js 中配置
# ============================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

LANIP="$(sed -n "s/.*export const LAN_IP = '\([^']*\)'.*/\1/p" src/config/lan.js | head -n 1)"
[ -n "$LANIP" ] || LANIP="192.168.68.9"

if ! command -v node >/dev/null 2>&1; then
  echo "[X] 未找到 Node.js。"
  echo "    备选：直接用浏览器打开离线单文件版 spongebob-offline.html"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[i] 首次运行，安装依赖 ..."
  npm install
fi

if [ ! -f dist/index.html ]; then
  echo "[i] 构建前端 ..."
  npm run build
fi

echo "============================================================"
echo "  本机访问 : http://localhost:8081"
echo "  局域网   : http://$LANIP:8081"
echo "  后端     : http://$LANIP:8080"
echo "============================================================"
echo "[i] 局域网内其它设备打开上面的「局域网」地址即可一起游玩"
echo "[i] 按 Ctrl + C 停止服务"
echo

node serve-lan.mjs
