# Chromium 基础镜像 - 精简版
# 平台: x86_64
# 基于: Alpine Linux (轻量级)

FROM --platform=linux/amd64 alpine:3.18

# 设置环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    CHROMIUM_PATH=/usr/bin/chromium-browser \
    DISPLAY=:99 \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/bin/chromium-browser \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 安装必要的包
RUN apk add --no-cache \
    # Chromium 浏览器
    chromium \
    # 中文字体支持
    font-noto-cjk \
    # 必要的系统库
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    # 虚拟显示支持 (改进点)
    xvfb \
    dbus \
    # 网络工具
    curl \
    wget \
    # 进程管理
    dumb-init \
    # 清理缓存
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# 创建非 root 用户（安全最佳实践）
RUN addgroup -g 1001 chromium \
    && adduser -D -s /bin/sh -u 1001 -G chromium chromium \
    && mkdir -p /home/chromium/Downloads /app \
    && chown -R chromium:chromium /home/chromium /app

# 设置 Chromium 默认参数（适用于容器环境）
ENV CHROMIUM_FLAGS="--no-sandbox \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-features=TranslateUI \
    --disable-ipc-flooding-protection \
    --disable-dev-shm-usage \
    --disable-gpu \
    --headless \
    --no-first-run \
    --no-default-browser-check \
    --no-zygote \
    --single-process \
    --disable-extensions"

# 创建 Chromium 启动脚本
RUN echo '#!/bin/sh' > /usr/local/bin/chromium-headless \
    && echo 'exec /usr/bin/chromium-browser $CHROMIUM_FLAGS "$@"' >> /usr/local/bin/chromium-headless \
    && chmod +x /usr/local/bin/chromium-headless

# 创建 Xvfb 启动脚本 (可选使用)
RUN echo '#!/bin/sh' > /usr/local/bin/start-xvfb \
    && echo 'echo "Starting Xvfb virtual display..."' >> /usr/local/bin/start-xvfb \
    && echo 'Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &' >> /usr/local/bin/start-xvfb \
    && echo 'export DISPLAY=:99' >> /usr/local/bin/start-xvfb \
    && echo 'echo "Xvfb started on display :99"' >> /usr/local/bin/start-xvfb \
    && chmod +x /usr/local/bin/start-xvfb

# 设置工作目录
WORKDIR /app

# 切换到非 root 用户
USER chromium

# 验证安装
RUN chromium-browser --version

# 默认入口点
ENTRYPOINT ["dumb-init", "--"]
CMD ["chromium-headless", "--version"]

# 镜像元数据
LABEL maintainer="Docker Chromium Base" \
      description="精简的 Chromium 基础镜像，专为容器化应用设计，支持虚拟显示" \
      version="1.1" \
      platform="linux/amd64"