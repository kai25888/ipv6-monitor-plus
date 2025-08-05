<<<<<<< HEAD
# ipv6-monitor-plus
=======
# Docker Chromium Base

> 🚀 精简的 Chromium 基础镜像，专为容器化应用设计，支持快速部署 Puppeteer、截图、PDF 生成等服务

## 📋 项目概述

本项目提供了一个基于 Alpine Linux 的精简 Chromium 基础镜像，专门针对 x86_64 平台优化。通过继承这个基础镜像，您可以快速构建各种基于 Chromium 的应用，如 Puppeteer 自动化、网页截图、PDF 生成、网页爬虫等。

## ✨ 特性

- 🏔️ **轻量级**: 基于 Alpine Linux，镜像体积最小化
- 🔧 **开箱即用**: 预装 Chromium 浏览器和必要依赖
- 🔒 **安全性**: 非 root 用户运行，安全最佳实践
- 🎯 **针对性优化**: 专为容器环境优化的 Chromium 配置
- 📦 **易于继承**: 简单的 FROM 指令即可继承所有功能
- 🌐 **IPv6 支持**: 完整支持 IPv4/IPv6 双栈网络
- 🔄 **多架构**: 支持 x86_64 平台

## 📁 项目结构

```
docker-chromium-base/
├── base-images/           # 基础镜像
│   ├── Dockerfile        # Chromium 基础镜像
│   └── docker-compose.yml
├── examples/              # 继承示例
│   ├── puppeteer/        # Puppeteer API 服务
│   ├── simple-screenshot/ # 截图服务
│   ├── pdf-generator/    # PDF 生成服务
│   ├── ipv6-monitor/     # IPv6 监控服务
│   └── web-scraper/      # 网页爬虫（计划中）
├── scripts/              # 构建脚本
│   ├── build-base.sh     # 构建基础镜像
│   └── build-all.sh      # 构建所有镜像
└── docs/                 # 文档目录
```

## 🚀 快速开始

### 1. 构建基础镜像

```bash
# 克隆项目
git clone <repository-url>
cd docker-chromium-base

# 构建基础镜像
./scripts/build-base.sh

# 或使用 Docker 直接构建
cd base-images
docker build --platform linux/amd64 -t chromium-base:latest .
```

### 2. 使用基础镜像

在您的 `Dockerfile` 中继承基础镜像：

```dockerfile
FROM chromium-base:latest

# 安装您的应用依赖
USER root
RUN apk add --no-cache nodejs npm
USER chromium

# 复制应用代码
COPY . /app
WORKDIR /app

# 安装依赖并启动
RUN npm install
CMD ["node", "app.js"]
```

### 3. 运行示例服务

```bash
# Puppeteer API 服务
cd examples/puppeteer
docker-compose up -d

# 截图服务
cd examples/simple-screenshot  
docker-compose up -d

# PDF 生成服务
cd examples/pdf-generator
docker-compose up -d

# IPv6 监控服务
cd examples/ipv6-monitor
docker-compose up -d
```

## 📚 示例服务说明

### 🎭 Puppeteer API 服务

**端口**: 3000  
**功能**: 全功能的 Puppeteer API 服务

```bash
# 启动服务
cd examples/puppeteer
docker-compose up -d

# API 使用示例
# 截图
curl -X POST http://localhost:3000/screenshot \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","width":1920,"height":1080}' \\
  --output screenshot.png

# 生成 PDF
curl -X POST http://localhost:3000/pdf \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","format":"A4"}' \\
  --output page.pdf

# 获取页面内容
curl -X POST http://localhost:3000/content \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","selector":"title"}'
```

### 📸 截图服务

**端口**: 8000  
**功能**: 简单的网页截图服务（Python + Selenium）

```bash
# 启动服务
cd examples/simple-screenshot
docker-compose up -d

# 使用示例
# GET 请求截图
curl "http://localhost:8000/screenshot?url=https://example.com&width=1920&height=1080" \\
  --output screenshot.png

# POST 请求截图
curl -X POST http://localhost:8000/screenshot \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com","width":1920,"height":1080,"full_page":true}' \\
  --output screenshot.png
```

### 📄 PDF 生成服务

**端口**: 3001  
**功能**: 专业的 PDF 生成服务

```bash
# 启动服务
cd examples/pdf-generator
docker-compose up -d

# 使用示例
# 从 URL 生成 PDF
curl -X POST http://localhost:3001/pdf/url \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "options": {
      "format": "A4",
      "landscape": false,
      "margin": {"top": "1cm", "bottom": "1cm", "left": "1cm", "right": "1cm"}
    }
  }' --output document.pdf

# 从 HTML 生成 PDF
curl -X POST http://localhost:3001/pdf/html \\
  -H "Content-Type: application/json" \\
  -d '{
    "html": "<h1>Hello World</h1><p>This is a test document.</p>",
    "options": {"format": "A4"}
  }' --output document.pdf

# 快速生成 PDF
curl "http://localhost:3001/pdf/url?url=https://example.com&format=A4" \\
  --output quick.pdf
```

## 🔧 配置说明

### 基础镜像配置

基础镜像包含以下预配置：

- **Chromium 路径**: `/usr/bin/chromium-browser`
- **用户**: `chromium` (UID: 1001, GID: 1001)
- **工作目录**: `/app`
- **预设参数**: 已优化的容器运行参数

### 环境变量

```bash
# Puppeteer 配置
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
CHROMIUM_PATH=/usr/bin/chromium-browser
CHROME_BIN=/usr/bin/chromium-browser

# 显示配置
DISPLAY=:99

# Chromium 启动参数
CHROMIUM_FLAGS="--no-sandbox --disable-dev-shm-usage --headless ..."
```

### Chromium 启动参数

基础镜像默认包含以下优化参数：

```bash
--no-sandbox                    # 禁用沙箱（容器必需）
--disable-dev-shm-usage         # 禁用 /dev/shm 使用
--disable-gpu                   # 禁用 GPU 加速
--headless                      # 无头模式
--no-first-run                  # 跳过首次运行
--single-process                # 单进程模式
--disable-extensions            # 禁用扩展
```

## 🏗️ 自定义构建

### 修改基础镜像

编辑 `base-images/Dockerfile` 来自定义基础镜像：

```dockerfile
# 添加额外的字体
RUN apk add --no-cache \\
    font-adobe-100dpi \\
    font-noto-emoji

# 安装额外工具
RUN apk add --no-cache \\
    imagemagick \\
    ghostscript
```

### 创建新的继承镜像

1. 在 `examples/` 目录下创建新文件夹
2. 创建 `Dockerfile`：

```dockerfile
FROM chromium-base:latest

USER root
# 安装您的依赖
RUN apk add --no-cache python3 py3-pip

USER chromium
# 复制并配置您的应用
COPY . /app
WORKDIR /app

CMD ["python3", "app.py"]
```

3. 创建 `docker-compose.yml`
4. 添加到 `scripts/build-all.sh` 中

## 🔍 故障排除

### 常见问题

**1. 内存不足错误**
```bash
# 增加共享内存大小
docker run --shm-size=2g your-image

# 或在 docker-compose.yml 中添加
services:
  your-service:
    shm_size: 2gb
```

**2. 权限错误**
```bash
# 确保文件权限正确
RUN chown -R chromium:chromium /app
USER chromium
```

**3. 字体缺失**
```bash
# 添加额外字体包
RUN apk add --no-cache \\
    font-noto-cjk \\
    font-noto-emoji
```

### 性能优化

1. **使用单进程模式**: 已默认启用 `--single-process`
2. **增加共享内存**: 设置 `shm_size: 2gb`
3. **禁用不必要功能**: 已禁用 GPU、扩展等
4. **资源限制**: 合理设置内存和 CPU 限制

## 📊 性能基准

| 镜像类型 | 基础镜像大小 | 构建时间 | 首次启动时间 | 内存占用 |
|---------|-------------|----------|-------------|----------|
| chromium-base | ~380MB | ~3min | ~2s | ~100MB |
| puppeteer-example | ~450MB | ~5min | ~3s | ~150MB |
| screenshot-service | ~420MB | ~4min | ~2s | ~120MB |
| pdf-generator | ~460MB | ~5min | ~3s | ~160MB |

## 🔒 安全最佳实践

1. **非 root 运行**: 所有服务均以非 root 用户运行
2. **最小权限**: 仅安装必要的包和依赖
3. **安全选项**: 启用 `no-new-privileges` 等安全选项
4. **网络隔离**: 使用独立的 Docker 网络
5. **资源限制**: 设置合理的资源限制

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📜 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Alpine Linux](https://alpinelinux.org/) - 轻量级基础镜像
- [Chromium](https://www.chromium.org/) - 开源浏览器引擎
- [Puppeteer](https://pptr.dev/) - Node.js 浏览器自动化库
- [Docker](https://www.docker.com/) - 容器化平台

---

<div align="center">
  <p>如果这个项目对您有帮助，请考虑给它一个 ⭐</p>
  <p>Made with ❤️ for the containerized world</p>
</div>
>>>>>>> 72a41c8 (add all file)
