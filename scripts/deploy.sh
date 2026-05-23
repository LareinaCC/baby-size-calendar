#!/usr/bin/env bash
# 在服务器项目根目录（有 package.json 处）执行: bash scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f package.json ]]; then
  echo "错误: 当前目录没有 package.json，请 cd 到 clone 根目录"
  exit 1
fi

echo "==> 目录: $ROOT"
git pull origin main

echo "==> npm ci"
npm ci

echo "==> npm run build"
NODE_ENV=production npm run build

if [[ ! -d .next ]]; then
  echo "错误: build 后没有 .next 目录"
  exit 1
fi

PM2_NAME="${PM2_NAME:-baby-size}"

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start npm --name "$PM2_NAME" -- run start -- -H 0.0.0.0 -p "${PORT:-3000}"
fi
pm2 save

echo "==> 本机探测"
sleep 2
curl -sf -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:${PORT:-3000}/baby-size-calendar" || {
  echo "警告: 本机访问失败，请执行: pm2 logs $PM2_NAME --lines 50"
  exit 1
}

echo "==> 部署完成"
