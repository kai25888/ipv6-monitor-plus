# IPv6 Monitor 示例镜像
# 继承自精简的 Chromium 基础镜像

FROM chromium-base:latest

# 切换到 root 用户进行软件安装
USER root

# 安装 Node.js、网络工具和构建依赖
RUN apk add --no-cache \
    nodejs \
    npm \
    # 网络诊断工具
    iputils \
    bind-tools \
    # 构建工具（可能需要编译一些 npm 包）
    python3 \
    make \
    g++ \
    # 清理缓存
    && rm -rf /var/cache/apk/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安装 Node.js 依赖
RUN npm ci --only=production \
    && npm cache clean --force

# 复制应用代码
COPY . .

# 确保应用目录属于 chromium 用户
RUN chown -R chromium:chromium /app

# 切换回非 root 用户
USER chromium

# 健康检查
HEALTHCHECK --interval=60s --timeout=15s --start-period=10s --retries=3 \
    CMD node healthcheck.js || exit 1

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]