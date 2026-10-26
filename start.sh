#!/usr/bin/env bash
# ============================================================
#  Bikini Bottom Fishing - Linux / macOS launcher (offline)
#  直接打开单文件离线版，无需 Node / Java / Maven / 网络
#  若还没有构建产物，且本机有 Node，会自动构建一次
# ============================================================
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
HTML="$ROOT/spongebob-offline.html"

if [ ! -f "$HTML" ] && [ -f "$ROOT/dist/spongebob-standalone.html" ]; then
  HTML="$ROOT/dist/spongebob-standalone.html"
fi

if [ ! -f "$HTML" ]; then
  echo "[i] 未找到离线版，尝试构建 ..."
  if command -v node >/dev/null 2>&1 && [ -d "$ROOT/node_modules" ]; then
    ( cd "$ROOT" && npm run build:standalone )
    HTML="$ROOT/spongebob-offline.html"
  fi
fi

if [ ! -f "$HTML" ]; then
  echo "[X] 找不到离线版页面，也没有构建环境。"
  echo "    离线文件应为: spongebob-offline.html"
  echo "    构建需要 Node.js 并执行一次 npm install（需要网络）。"
  exit 1
fi

echo "[OK] 打开: $HTML"
echo "[i] 默认账号 spongebob / 123456，存档保存在当前浏览器"

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    # Windows 下的 Git Bash：用资源管理器按默认浏览器打开
    explorer.exe "$(cygpath -w "$HTML" 2>/dev/null || echo "$HTML")" || true
    ;;
  Darwin*)
    open "$HTML"
    ;;
  *)
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$HTML"
    else
      echo "[i] 请手动用浏览器打开上面的文件"
    fi
    ;;
esac
