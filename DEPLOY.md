# AI Tools Hub 部署指南

## 服务器信息
- **服务器 IP**: 101.32.179.223
- **域名**: gigaisystem.com

## 快速部署

### 1. 上传代码到服务器
```bash
# 在本地打包代码
tar -czvf ai-tool-hub.tar.gz --exclude=node_modules --exclude=.venv --exclude=.git .

# 上传到服务器
scp ai-tool-hub.tar.gz root@101.32.179.223:/opt/

# 在服务器上解压
ssh root@101.32.179.223
cd /opt
tar -xzvf ai-tool-hub.tar.gz
```

### 2. 配置环境变量
```bash
# 编辑 .env 文件
vi .env

# 修改以下配置：
# JWT_SECRET=your-super-secret-jwt-key
# ALLOWED_ORIGINS=http://gigaisystem.com,https://gigaisystem.com
```

### 3. 运行部署脚本
```bash
# 给脚本执行权限
chmod +x deploy.sh

# 运行部署
./deploy.sh
```

### 4. 配置域名解析
在域名服务商处添加 A 记录：
- **主机记录**: @ (或 www)
- **记录类型**: A
- **记录值**: 101.32.179.223

### 5. 配置 HTTPS（可选）
```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx

# 获取 SSL 证书
certbot --nginx -d gigaisystem.com -d www.gigaisystem.com

# 自动续期
certbot renew --dry-run
```

## 服务管理

### 查看服务状态
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

### 重新构建并启动
```bash
docker-compose up -d --build
```

## 访问地址
- **前端**: http://gigaisystem.com
- **API**: http://gigaisystem.com/api/
- **后端 API 文档**: http://gigaisystem.com:8000/docs

## 故障排查

### 端口被占用
```bash
# 检查端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :8000

# 停止占用端口的服务
sudo lsof -ti:80 | xargs kill -9
sudo lsof -ti:8000 | xargs kill -9
```

### Docker 权限问题
```bash
# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
# 重新登录
```

### 磁盘空间不足
```bash
# 清理 Docker 缓存
docker system prune -a
```
