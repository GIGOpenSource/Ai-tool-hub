#!/bin/bash

# AI Tools Hub 部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 开始部署 AI Tools Hub..."

# 1. 构建前端
echo "📦 构建 Admin (Next.js)..."
cd admin
npm run build
cd ..

echo "📦 构建 Frontend (Vite)..."
cd fronted
npm run build
cd ..

# 2. 导出后端依赖
echo "📋 导出后端依赖..."
cd backend
pip freeze > requirements_export.txt
cd ..

# 3. 构建并启动 Docker 容器
echo "🐳 构建 Docker 镜像..."
docker-compose build

echo "▶️  启动服务..."
docker-compose up -d

echo "✅ 部署完成！"
echo ""
echo "🌐 访问地址："
echo "   - 前端: http://gigaisystem.com"
echo "   - API: http://gigaisystem.com/api/"
echo "   - 后端 API 文档: http://gigaisystem.com:8000/docs"
echo ""
echo "📝 注意事项："
echo "   1. 请确保域名 gigaisystem.com 已指向服务器 IP"
echo "   2. 请修改 .env 文件中的 JWT_SECRET"
echo "   3. 查看日志: docker-compose logs -f"
