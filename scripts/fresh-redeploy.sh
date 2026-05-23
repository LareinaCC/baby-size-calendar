#!/usr/bin/env bash
# 在服务器上以 deploy 用户执行（会删除旧目录并重新 clone）：
#   bash scripts/fresh-redeploy.sh
# 或从任意处：
#   REPO_URL=git@github.com:lareinaCC/baby-size-calendar.git \
#   DEPLOY_DIR=/home/deploy/baby-size-calendar \
#   bash /path/to/fresh-redeploy.sh
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:lareinaCC/baby-size-calendar.git}"
DEPLOY_DIR="${DEPLOY_DIR:-/home/deploy/baby-size-calendar}"
PM2_NAME="${PM2_NAME:-baby-size}"
PORT="${PORT:-3000}"

echo "==> 停止旧进程 (pm2: $PM2_NAME, 端口 $PORT)"
pm2 delete "$PM2_NAME" 2>/dev/null || true
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" 2>/dev/null || true
fi

echo "==> 删除旧目录: $DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"

echo "==> 克隆: $REPO_URL"
git clone "$REPO_URL" "$DEPLOY_DIR"

if [[ ! -f "$DEPLOY_DIR/package.json" ]]; then
  echo "错误: 克隆后没有 package.json，请确认 GitHub 仓库根目录就是 Next 项目（不要多一层 baby-size-calendar 子目录）"
  exit 1
fi

cd "$DEPLOY_DIR"
echo "==> 部署（build + pm2）"
bash scripts/deploy.sh

echo "==> 完成。访问: http://127.0.0.1:${PORT}/baby-size-calendar"
