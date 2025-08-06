# 改进版 Chromium Base 镜像使用指南

## 构建镜像

```bash
cd base-images
docker build -t chromium-base:latest .
```

## 基本使用

### 1. 基本测试（最小错误输出）
```bash
docker run --rm --platform linux/amd64 chromium-base:latest
```

### 2. 运行自定义 Chromium 命令
```bash
docker run --rm --platform linux/amd64 chromium-base:latest \
  chromium-headless --dump-dom https://example.com
```

### 3. 使用 Xvfb 虚拟显示（更好的隔离）
```bash
docker run --rm --platform linux/amd64 chromium-base:latest \
  sh -c "start-xvfb && chromium-headless --dump-dom https://example.com"
```

### 4. 交互式调试
```bash
docker run --rm -it --platform linux/amd64 chromium-base:latest sh
```

## 错误说明

改进后的镜像应该能显著减少以下错误：
- ✅ D-Bus 连接错误 (通过系统初始化脚本处理)
- ✅ GPU/Graphics 错误 (通过软件渲染和禁用 GPU)
- ✅ 音频错误 (通过禁用音频输出)
- ✅ 显示错误 (通过适当的 X11 库和 Xvfb)

## 性能优化选项

### 使用 tmpfs 挂载（减少 I/O）
```bash
docker run --rm --platform linux/amd64 \
  --tmpfs /tmp \
  --tmpfs /var/tmp \
  chromium-base:latest
```

### 调整共享内存大小
```bash
docker run --rm --platform linux/amd64 \
  --shm-size=2g \
  chromium-base:latest
```

## 开发使用

### 挂载本地代码
```bash
docker run --rm --platform linux/amd64 \
  -v $(pwd):/app \
  chromium-base:latest \
  sh -c "cd /app && node your-script.js"
```

## 故障排除

如果仍然有错误，可以：

1. **查看完整日志**：
```bash
docker run --rm --platform linux/amd64 chromium-base:latest \
  chromium-headless --enable-logging --log-level=0 --version
```

2. **运行 root 用户（调试用）**：
```bash
docker run --rm -it --platform linux/amd64 --user root chromium-base:latest sh
```

3. **使用 strace 追踪系统调用**（高级调试）：
```bash
docker run --rm --platform linux/amd64 --cap-add SYS_PTRACE chromium-base:latest \
  strace -e trace=file chromium-headless --version
```