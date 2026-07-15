#!/bin/bash

# AI Tools Hub 服务器部署脚本
# 使用方法: ./deploy-to-server.sh

set -e

SERVER_IP="101.32.179.223"
SERVER_USER="root"
PROJECT_DIR="/opt/ai-tool-hub"

echo "🚀 开始部署 AI Tools Hub 到服务器..."

# 1. 本地构建前端
echo "📦 [本地] 构建 Admin (Next.js)..."
cd admin
npm run build
cd ..

echo "📦 [本地] 构建 Frontend (Vite)..."
cd fronted
npm run build
cd ..

# 2. 打包项目（排除不需要的文件）
echo "📋 [本地] 打包项目文件..."
tar -czvf ai-tool-hub-deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.venv' \
    --exclude='.git' \
    --exclude='.next/cache' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    .

# 3. 上传到服务器
echo "📤 [上传] 传输文件到服务器..."
scp ai-tool-hub-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

# 4. 在服务器上部署
echo "🔧 [服务器] 部署服务..."
ssh ${SERVER_USER}@${SERVER_IP} << 'DEPLOY_SCRIPT'
set -e

# 创建项目目录
mkdir -p /opt/ai-tool-hub
cd /opt/ai-tool-hub

# 备份旧配置（如果存在）
if [ -f docker-compose.yml ]; then
    echo "📦 备份旧配置..."
    cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d%H%M%S)
fi

# 解压新文件
echo "📂 解压项目文件..."
tar -xzvf /tmp/ai-tool-hub-deploy.tar.gz

# 创建 .env 文件（如果不存在）
if [ ! -f .env ]; then
    echo "📝 创建 .env 配置文件..."
    cat > .env << 'ENV_FILE'
# Backend Environment Variables
JWT_SECRET=$(openssl rand -hex 32)
ALLOWED_ORIGINS=http://gigaisystem.com,https://gigaisystem.com
LOG_LEVEL=info
ENV_FILE
fi

# 停止旧容器
echo "⏹️  停止旧容器..."
docker-compose down 2>/dev/null || true

# 构建并启动新容器
echo "🐳 构建并启动新容器..."
docker-compose up -d --build

# 清理临时文件
rm -f /tmp/ai-tool-hub-deploy.tar.gz

echo "✅ 部署完成！"
echo ""
echo "🌐 服务状态："
docker-compose ps
echo ""
echo "📊 查看日志："
echo "   docker-compose logs -f"
DEPLOY_SCRIPT

# 5. 清理本地临时文件
rm -f ai-tool-hub-deploy.tar.gz

echo ""
echo "🎉 部署完成！"
echo ""
echo "🌐 访问地址："
echo "   - 前端: http://gigaisystem.com"
echo "   - API: http://gigaisystem.com/api/"
echo "   - 后端: http://gigaisystem.com:8000/"
echo ""
echo "📝 查看服务器日志："
echo "   ssh ${SERVER_USER}@${SERVER_IP} 'cd ${PROJECT_DIR} && docker-compose logs -f'"
