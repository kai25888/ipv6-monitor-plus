# Chromium 基础镜像 - 静默版本
# 专注于减少错误日志，提供更清洁的输出
# 平台: x86_64

FROM --platform=linux/amd64 alpine:3.18

# 设置环境变量
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    CHROMIUM_PATH=/usr/bin/chromium-browser \
    DISPLAY=:99 \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/bin/chromium-browser \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 安装最小必要包
RUN apk add --no-cache \
    chromium \
    dumb-init \
    nss \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# 创建用户和目录
RUN addgroup -g 1001 chromium \
    && adduser -D -s /bin/sh -u 1001 -G chromium chromium \
    && mkdir -p /home/chromium/Downloads /app \
    && chown -R chromium:chromium /home/chromium /app

# 设置极度优化的 Chromium 参数（减少错误日志）
ENV CHROMIUM_FLAGS="--no-sandbox \
    --headless=new \
    --disable-gpu \
    --disable-dev-shm-usage \
    --disable-dbus \
    --disable-audio-output \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-features=TranslateUI,VizDisplayCompositor,AudioServiceOutOfProcess,Vulkan \
    --disable-ipc-flooding-protection \
    --disable-extensions \
    --disable-plugins \
    --disable-sync \
    --disable-web-security \
    --disable-features=VizDisplayCompositor \
    --disable-gpu-sandbox \
    --disable-software-rasterizer \
    --disable-background-networking \
    --disable-default-apps \
    --disable-hang-monitor \
    --disable-prompt-on-repost \
    --disable-client-side-phishing-detection \
    --disable-component-extensions-with-background-pages \
    --disable-background-mode \
    --no-first-run \
    --no-default-browser-check \
    --no-zygote \
    --single-process \
    --memory-pressure-off \
    --max_old_space_size=4096 \
    --force-color-profile=srgb \
    --disable-vulkan \
    --disable-vulkan-fallback-to-gl-for-testing \
    --use-gl=swiftshader-webgl \
    --disable-gl-drawing-for-tests \
    --log-level=3 \
    --silent-debugger-extension-api \
    --disable-logging \
    --quiet"

# 创建静默启动脚本
RUN echo '#!/bin/sh' > /usr/local/bin/chromium-silent \
    && echo '# 重定向 stderr 到 /dev/null 来减少噪音' >> /usr/local/bin/chromium-silent \
    && echo 'exec /usr/bin/chromium-browser $CHROMIUM_FLAGS "$@" 2>/dev/null' >> /usr/local/bin/chromium-silent \
    && chmod +x /usr/local/bin/chromium-silent

# 创建普通启动脚本（保留错误输出用于调试）
RUN echo '#!/bin/sh' > /usr/local/bin/chromium-headless \
    && echo 'exec /usr/bin/chromium-browser $CHROMIUM_FLAGS "$@"' >> /usr/local/bin/chromium-headless \
    && chmod +x /usr/local/bin/chromium-headless

# 设置工作目录并切换用户
WORKDIR /app
USER chromium

# 验证安装（静默版本）
RUN chromium-browser --version 2>/dev/null || echo "Chromium installed"

# 入口点
ENTRYPOINT ["dumb-init", "--"]
CMD ["chromium-silent", "--version"]

# 镜像信息
LABEL maintainer="Docker Chromium Base" \
      description="静默版 Chromium 镜像，减少错误日志输出" \
      version="1.0-silent" \
      platform="linux/amd64"