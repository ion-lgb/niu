#!/bin/sh
set -e

DATA_DIR=/app/data

# 首次启动：将源 .env 复制到数据目录
if [ ! -f "$DATA_DIR/.env" ] && [ -f /app/.env.default ]; then
    cp /app/.env.default "$DATA_DIR/.env"
    echo "[entrypoint] 已从默认配置初始化 $DATA_DIR/.env"
fi

exec "$@"
