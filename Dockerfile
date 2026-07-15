FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY backend/requirements_export.txt .
RUN pip install --no-cache-dir -r requirements_export.txt

# 复制后端代码
COPY backend/ .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
