# AI Tools Hub - 部署说明

## 项目结构
```
ai-tool-hub/
├── admin/          # Next.js 管理后台
├── fronted/        # Vite/React 前端
├── backend/        # FastAPI 后端
├── docker-compose.yml
├── nginx.conf
├── Dockerfile
└── .env
```

## 服务器部署

### 方法一：一键部署（推荐）
```bash
# 在本地执行
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

### 方法二：手动部署

#### 1. 本地构建
```bash
# 构建 Admin
cd admin && npm run build && cd ..

# 构建 Frontend
cd fronted && npm run build && cd ..
```

#### 2. 上传到服务器
```bash
# 打包
tar -czvf ai-tool-hub.tar.gz --exclude='node_modules' --exclude='.venv' --exclude='.git' .

# 上传
scp ai-tool-hub.tar.gz root@101.32.179.223:/opt/

# SSH 登录
ssh root@101.32.179.223

# 解压
cd /opt
tar -xzvf ai-tool-hub.tar.gz
mv ai-tool-hub.tar.gz ai-tool-hub
```

#### 3. 配置环境变量
```bash
cd /opt/ai-tool-hub

# 编辑 .env
vi .env

# 修改 JWT_SECRET 为随机字符串
# JWT_SECRET=your-random-secret-here
```

#### 4. 启动服务
```bash
docker-compose up -d --build
```

## 服务管理

### 查看状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f nginx
```

### 重启服务
```bash
docker-compose restart
```

### 停止服务
```bash
docker-compose down
```

## 访问地址
- **前端**: http://gigaisystem.com
- **管理后台**: http://gigaisystem.com/admin
- **API**: http://gigaisystem.com/api/
- **后端直接访问**: http://gigaisystem.com:8000/

## 网络架构
```
┌─────────────────────────────────────────────────────────┐
│                    gigaisystem.com                       │
│                    (101.32.179.223)                      │
├─────────────────────────────────────────────────────────┤
│  Nginx (端口 80)                                         │
│  ├── /          → Frontend (静态文件)                    │
│  ├── /admin/*   → Backend (FastAPI) → Next.js SSR       │
│  └── /api/*     → Backend (FastAPI)                     │
├─────────────────────────────────────────────────────────┤
│  Backend (端口 8000)                                     │
│  └── FastAPI + Uvicorn                                  │
└─────────────────────────────────────────────────────────┘
```

## 故障排查

### 端口被占用
```bash
# 检查端口
netstat -tulpn | grep :80
netstat -tulpn | grep :8000

# 停止占用端口的服务
sudo lsof -ti:80 | xargs kill -9
sudo lsof -ti:8000 | xargs kill -9
```

### 容器启动失败
```bash
# 查看详细日志
docker-compose logs backend

# 进入容器调试
docker exec -it ai_hub_backend bash
```

### 磁盘空间不足
```bash
# 清理 Docker 缓存
docker system prune -a
```

## 替换旧项目（crash-check）

如果服务器上已有旧项目，执行以下步骤：

```bash
# 1. 停止旧项目
cd /opt/crash-check  # 或旧项目路径
docker-compose down

# 2. 部署新项目
cd /opt/ai-tool-hub
docker-compose up -d --build

# 3. 验证新项目
curl http://localhost/api/health
```
