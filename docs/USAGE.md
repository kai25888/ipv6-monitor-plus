# 使用指南

本文档详细介绍如何使用 Docker Chromium Base 项目的各种功能。

## 快速启动

### 启动所有服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 仅启动基础服务（不包括 Nginx 代理）
docker-compose up -d puppeteer-api screenshot-service pdf-generator

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 启动单个服务

```bash
# 仅启动 Puppeteer 服务
docker-compose up -d puppeteer-api

# 仅启动截图服务
docker-compose up -d screenshot-service

# 仅启动 PDF 生成服务
docker-compose up -d pdf-generator
```

## 服务详细说明

### 🎭 Puppeteer API 服务

**访问地址**: http://localhost:3000

#### 可用端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/` | 服务信息 |
| GET | `/health` | 健康检查 |
| POST | `/screenshot` | 页面截图 |
| POST | `/content` | 获取页面内容 |
| POST | `/pdf` | 生成 PDF |
| POST | `/execute` | 执行自定义脚本 |

#### 使用示例

**1. 截图**
```bash
curl -X POST http://localhost:3000/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com",
    "width": 1920,
    "height": 1080,
    "fullPage": false
  }' \
  --output github_screenshot.png
```

**2. 生成 PDF**
```bash
curl -X POST http://localhost:3000/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com",
    "format": "A4",
    "margin": {
      "top": "1cm",
      "bottom": "1cm",
      "left": "1cm",
      "right": "1cm"
    }
  }' \
  --output github_page.pdf
```

**3. 获取页面内容**
```bash
curl -X POST http://localhost:3000/content \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com",
    "selector": "title"
  }'
```

**4. 执行自定义脚本**
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com",
    "script": "document.querySelectorAll(\"a\").length"
  }'
```

### 📸 截图服务

**访问地址**: http://localhost:8000

#### 使用示例

**1. GET 请求截图**
```bash
curl "http://localhost:8000/screenshot?url=https://github.com&width=1920&height=1080&full_page=true" \
  --output github_full.png
```

**2. POST 请求截图**
```bash
curl -X POST http://localhost:8000/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com",
    "width": 1920,
    "height": 1080,
    "full_page": true,
    "element": "body"
  }' \
  --output github_element.png
```

**3. 健康检查**
```bash
curl http://localhost:8000/health
```

### 📄 PDF 生成服务

**访问地址**: http://localhost:3001

#### 可用端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/` | 服务信息 |
| GET | `/health` | 健康检查 |
| POST | `/pdf/url` | 从 URL 生成 PDF |
| POST | `/pdf/html` | 从 HTML 生成 PDF |
| GET | `/pdf/url` | 快速 URL 转 PDF |
| POST | `/pdf/batch` | 批量生成 PDF |

#### 使用示例

**1. 从 URL 生成 PDF**
```bash
curl -X POST http://localhost:3001/pdf/url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com",
    "options": {
      "format": "A4",
      "landscape": false,
      "printBackground": true,
      "margin": {
        "top": "1cm",
        "bottom": "1cm",
        "left": "1cm",
        "right": "1cm"
      },
      "filename": "github_page"
    }
  }' \
  --output github_page.pdf
```

**2. 从 HTML 生成 PDF**
```bash
curl -X POST http://localhost:3001/pdf/html \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Hello World</h1><p>This is a test document.</p></body></html>",
    "options": {
      "format": "A4",
      "filename": "test_doc"
    }
  }' \
  --output test_doc.pdf
```

**3. 快速生成 PDF**
```bash
curl "http://localhost:3001/pdf/url?url=https://github.com&format=A4&landscape=false" \
  --output quick_github.pdf
```

**4. 批量生成 PDF**
```bash
curl -X POST http://localhost:3001/pdf/batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://github.com",
      "https://google.com",
      "https://stackoverflow.com"
    ],
    "options": {
      "format": "A4"
    }
  }'
```

## 配置参数

### 通用 Chromium 参数

所有服务都支持以下通用参数：

- `width`: 视窗宽度 (默认: 1920)
- `height`: 视窗高度 (默认: 1080)
- `timeout`: 页面加载超时时间 (默认: 30000ms)
- `waitUntil`: 等待条件 (`load`, `networkidle0`, `networkidle2`)

### PDF 特定参数

- `format`: 页面格式 (`A0`, `A1`, `A2`, `A3`, `A4`, `A5`, `A6`, `Letter`, `Legal`, `Tabloid`, `Ledger`)
- `landscape`: 横向布局 (true/false)
- `printBackground`: 打印背景 (true/false)
- `margin`: 页边距对象
  - `top`: 上边距
  - `bottom`: 下边距
  - `left`: 左边距
  - `right`: 右边距
- `scale`: 缩放比例 (0.1-2.0)

### 截图特定参数

- `fullPage`: 全页截图 (true/false)
- `element`: CSS 选择器，截取特定元素
- `type`: 图片格式 (`png`, `jpeg`)
- `quality`: 图片质量 (0-100，仅适用于 JPEG)

## 监控和日志

### 健康检查

所有服务都提供健康检查端点：

```bash
# Puppeteer 服务
curl http://localhost:3000/health

# 截图服务
curl http://localhost:8000/health

# PDF 生成服务
curl http://localhost:3001/health
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f puppeteer-api
docker-compose logs -f screenshot-service
docker-compose logs -f pdf-generator

# 查看最近 100 行日志
docker-compose logs --tail=100 puppeteer-api
```

### 监控资源使用

```bash
# 查看容器资源使用情况
docker stats

# 查看特定容器
docker stats puppeteer-api screenshot-service pdf-generator
```

## 故障排除

### 常见错误及解决方法

**1. 内存不足**
```
Error: Navigation timeout exceeded
```
解决方法：
- 增加 `shm_size` 配置
- 调整内存限制
- 检查系统可用内存

**2. 权限错误**
```
Error: EACCES: permission denied
```
解决方法：
- 确保文件权限正确
- 检查用户配置
- 验证目录所有权

**3. 网络错误**
```
Error: net::ERR_NAME_NOT_RESOLVED
```
解决方法：
- 检查网络连接
- 验证 DNS 配置
- 确认目标 URL 可访问

**4. 服务启动失败**
```
Exit code 1
```
解决方法：
- 查看详细日志
- 检查端口占用
- 验证配置文件

### 性能优化建议

1. **调整资源限制**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 2G
         cpus: '2.0'
   ```

2. **增加共享内存**
   ```yaml
   shm_size: 4gb
   ```

3. **使用持久化存储**
   ```yaml
   volumes:
     - chromium-cache:/home/chromium/.cache
   ```

4. **启用并发处理**
   - 增加 worker 进程数
   - 使用连接池
   - 实现请求队列

## 自定义配置

### 修改 Chromium 启动参数

编辑各服务的配置文件：

```javascript
// Puppeteer 示例
const BROWSER_CONFIG = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    // 添加自定义参数
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
};
```

### 添加自定义字体

```dockerfile
FROM chromium-base:latest

USER root
RUN apk add --no-cache \
    font-adobe-100dpi \
    font-noto-emoji \
    font-liberation
USER chromium
```

### 配置代理

```yaml
services:
  puppeteer-api:
    environment:
      - HTTP_PROXY=http://proxy.example.com:8080
      - HTTPS_PROXY=http://proxy.example.com:8080
      - NO_PROXY=localhost,127.0.0.1
```

## 扩展开发

### 创建新的继承服务

1. 创建新目录：
   ```bash
   mkdir examples/my-service
   ```

2. 创建 Dockerfile：
   ```dockerfile
   FROM chromium-base:latest
   
   USER root
   # 安装依赖
   USER chromium
   
   # 配置应用
   ```

3. 添加到 docker-compose.yml
4. 更新构建脚本

### 集成外部服务

可以轻松集成到现有的微服务架构：

```yaml
version: '3.8'
services:
  # 您的现有服务
  web-app:
    image: my-web-app
    ports:
      - "8080:8080"
  
  # 添加 Chromium 服务
  puppeteer-service:
    image: puppeteer-chromium:latest
    ports:
      - "3000:3000"
```

## 安全注意事项

1. **网络隔离**: 使用独立的 Docker 网络
2. **资源限制**: 设置合理的内存和 CPU 限制
3. **访问控制**: 实现 API 认证和授权
4. **输入验证**: 验证所有用户输入
5. **定期更新**: 保持基础镜像和依赖的更新

---

更多详细信息，请参考 [README.md](../README.md) 或查看各服务的源代码。