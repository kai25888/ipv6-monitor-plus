# 快速开始指南

本指南将帮助您在 5 分钟内启动并运行完整的 Chromium 基础镜像方案。

## 📋 前置要求

- Docker 20.10+ 
- Docker Compose 2.0+
- 至少 4GB 可用内存
- x86_64 架构的系统

### 验证环境

```bash
# 检查 Docker 版本
docker --version
docker-compose --version

# 检查可用内存
free -h

# 检查架构
uname -m
```

## 🚀 5 分钟快速启动

### 步骤 1: 获取项目

```bash
# 如果已经在项目目录中，跳过这一步
cd docker-chromium-base
```

### 步骤 2: 一键构建所有服务

```bash
# 构建基础镜像和所有示例服务
./scripts/build-all.sh
```

### 步骤 3: 启动所有服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 步骤 4: 验证服务

```bash
# 等待服务完全启动 (约 30-60 秒)
sleep 60

# 运行测试脚本
./scripts/test-services.sh
```

### 步骤 5: 开始使用

```bash
# 测试 Puppeteer 截图
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url":"https://httpbin.org/html","width":1280,"height":720}' \
  --output test.png

# 测试 PDF 生成
curl -X POST http://localhost:3001/pdf/url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://httpbin.org/html","options":{"format":"A4"}}' \
  --output test.pdf

# 测试截图服务
curl "http://localhost:8000/screenshot?url=https://httpbin.org/html&width=1280&height=720" \
  --output screenshot.png
```

## 🎯 服务端口列表

| 服务 | 端口 | 用途 |
|------|------|------|
| Puppeteer API | 3000 | 全功能浏览器自动化 |
| 截图服务 | 8000 | 简单网页截图 |
| PDF 生成器 | 3001 | 网页转 PDF |

## 📖 下一步

### 阅读详细文档

- [完整使用指南](USAGE.md) - 详细的 API 文档和示例
- [README.md](../README.md) - 项目概述和特性说明

### 自定义您的服务

1. **修改基础镜像**: 编辑 `base-images/Dockerfile`
2. **创建新服务**: 在 `examples/` 目录下添加新的继承示例
3. **调整配置**: 修改各服务的 `docker-compose.yml`

### 集成到现有项目

```yaml
version: '3.8'
services:
  # 您的现有应用
  my-app:
    image: my-app:latest
    ports:
      - "8080:8080"
  
  # 添加 Chromium 服务
  chromium-service:
    image: puppeteer-chromium:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

## 🔧 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启特定服务
docker-compose restart puppeteer-api

# 查看日志
docker-compose logs -f puppeteer-api

# 查看服务状态
docker-compose ps

# 查看资源使用
docker stats
```

### 构建管理

```bash
# 重新构建基础镜像
./scripts/build-base.sh

# 重新构建所有镜像
./scripts/build-all.sh

# 仅构建特定服务
cd examples/puppeteer
docker-compose build

# 清理未使用的镜像
docker image prune -f
```

### 调试

```bash
# 进入容器调试
docker exec -it puppeteer-api /bin/sh

# 查看容器详细信息
docker inspect puppeteer-api

# 查看网络配置
docker network ls
docker network inspect docker-chromium-base_chromium-network

# 查看卷信息
docker volume ls
```

## ⚡ 性能优化

### 系统资源

```bash
# 为 Docker 分配更多内存 (推荐 4GB+)
# 在 Docker Desktop 设置中调整

# 增加共享内存
# 已在 docker-compose.yml 中配置 shm_size: 2gb
```

### 服务调优

```yaml
# 在 docker-compose.yml 中调整资源限制
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '2.0'
    reservations:
      memory: 1G
      cpus: '1.0'
```

## 🐛 故障排除

### 服务启动失败

```bash
# 检查端口是否被占用
netstat -tlnp | grep -E "(3000|3001|8000)"

# 检查 Docker 日志
docker-compose logs

# 检查系统资源
free -h
df -h
```

### 内存不足

```bash
# 增加 swap 空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 或减少并发服务
docker-compose up -d puppeteer-api  # 仅启动一个服务
```

### 网络问题

```bash
# 检查网络连接
curl -I https://httpbin.org/html

# 重新创建网络
docker-compose down
docker network prune -f
docker-compose up -d
```

## 📞 获取帮助

### 查看帮助信息

```bash
# 构建脚本帮助
./scripts/build-base.sh --help

# 测试脚本帮助
./scripts/test-services.sh --help

# Docker Compose 帮助
docker-compose --help
```

### 检查服务健康状态

```bash
# 健康检查端点
curl http://localhost:3000/health  # Puppeteer
curl http://localhost:8000/health  # 截图服务
curl http://localhost:3001/health  # PDF 生成器

# Docker 健康检查
docker-compose ps
```

### 常见问题解答

**Q: 服务启动很慢？**
A: 这是正常的，第一次启动需要下载依赖。后续启动会更快。

**Q: 截图或 PDF 生成失败？**
A: 检查目标 URL 是否可访问，确保有足够的内存。

**Q: 如何调整服务端口？**
A: 修改 `docker-compose.yml` 中的端口映射。

**Q: 如何添加自定义字体？**
A: 编辑 `base-images/Dockerfile`，添加字体包安装。

---

🎉 **恭喜！您已经成功部署了完整的 Chromium 基础镜像方案。**

接下来，您可以根据具体需求定制服务，或者集成到现有的应用架构中。