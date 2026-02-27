FROM python:3.9-slim

WORKDIR /app

# 系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

# 安装 Python 依赖
COPY pyproject.toml .
RUN pip install --no-cache-dir -e . 2>/dev/null || pip install --no-cache-dir .

# 复制应用代码
COPY app/ app/

# 复制 .env 作为默认配置模板
COPY .env .env.default

# 创建数据目录
RUN mkdir -p /app/data

# 启动入口脚本
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
