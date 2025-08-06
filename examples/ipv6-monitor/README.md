# IPv6 网络监控服务

基于 chromium-base 镜像的 IPv6 网络监控和路由器管理服务。自动检测 IPv6 连接状态，当发现 IPv6 连接丢失时，自动通过 Puppeteer 登录华为路由器并重启 IPv6 模块。

## 功能特性

- 🔍 定时监控 IPv6 连接状态
- 🔄 自动重启路由器 IPv6 模块
- 🛡️ 重启冷却机制，避免频繁操作
- 📊 RESTful API 接口
- 🏥 健康检查和状态监控
- 🐳 Docker 容器化部署

## 快速开始

### 1. 环境配置

复制并修改环境变量：

```bash
# 设置路由器登录信息
export ROUTER_IP=192.168.3.1
export ROUTER_PASSWORD=your_router_password
export PORT=3003
```

### 2. 构建和运行

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f ipv6-monitor
```

## API 接口

### 基础信息
- `GET /` - 服务信息和可用接口
- `GET /health` - 健康检查
- `GET /status` - 获取监控状态

### 监控操作
- `POST /check` - 手动执行 IPv6 检测
- `POST /restart` - 手动重启路由器 IPv6 模块
- `POST /monitor/start` - 启动自动监控
- `POST /monitor/stop` - 停止自动监控

### 使用示例

```bash
# 检查服务状态
curl http://localhost:3003/status

# 手动检测 IPv6
curl -X POST http://localhost:3003/check

# 手动重启 IPv6 模块
curl -X POST http://localhost:3003/restart
```

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `ROUTER_IP` | `192.168.3.1` | 路由器 IP 地址 |
| `ROUTER_PASSWORD` | `admin` | 路由器管理密码 |
| `PORT` | `3003` | 服务监听端口 |

### 监控配置

- **检测间隔**: 30 分钟
- **重启冷却**: 5 分钟
- **超时设置**: 10 秒（IPv6 检测）
- **检测地址**: `https://6.ipw.cn`（IPv6 专用测试网站）

## 注意事项

1. **路由器兼容性**: 目前适配华为家用路由器，其他品牌可能需要修改代码
2. **网络权限**: 容器需要 `NET_RAW` 和 `NET_ADMIN` 权限执行网络诊断
3. **IPv6 环境**: 确保网络环境支持 IPv6
4. **安全设置**: 建议修改默认路由器密码

## 故障排除

### 常见问题

1. **无法连接路由器**
   - 检查 `ROUTER_IP` 是否正确
   - 确认网络连通性

2. **登录失败**
   - 验证 `ROUTER_PASSWORD` 是否正确
   - 检查路由器是否支持自动化登录

3. **IPv6 检测失败**
   - 确认网络支持 IPv6
   - 检查容器网络权限

### 日志查看

```bash
# 查看服务日志
docker-compose logs ipv6-monitor

# 实时日志
docker-compose logs -f ipv6-monitor
```

## 开发和定制

### 修改检测间隔

编辑 `server.js` 中的 cron 表达式：

```javascript
// 每30分钟检测（默认）
cron.schedule('*/30 * * * *', async () => {
  // ...
});

// 每5分钟检测
cron.schedule('*/5 * * * *', async () => {
  // ...
});
```

### 适配其他路由器

修改 `utils.js` 中的 `restartIPv6Router` 函数，更改相应的选择器和操作步骤。

## 许可证

MIT License