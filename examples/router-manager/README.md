# 路由器管理工具

> 🛠️ 基于 Chromium 的路由器远程管理和控制服务

## 📋 项目简介

这是一个基于 `chromium-base` 镜像的路由器管理工具，专门用于远程管理和控制路由器。支持小米路由器和华为路由器的自动化操作，提供 Web 界面和命令行工具两种使用方式。

## ✨ 核心功能

- 🔌 **连接测试**: 验证路由器连接和认证信息
- 📊 **信息获取**: 获取路由器状态和配置信息
- 🔄 **IPv6 重启**: 自动重启路由器 IPv6 模块
- 🔁 **路由器重启**: 远程重启路由器设备
- 🔬 **网络诊断**: 完整的网络连通性诊断
- 📊 **批量操作**: 支持多个操作的批量执行
- 🌐 **Web 界面**: 直观的 Web 管理界面
- 💻 **命令行工具**: 强大的 CLI 工具
- 📝 **操作日志**: 详细的操作历史记录

## 🏗️ 架构设计

```
路由器管理工具
├── 路由器客户端 (lib/router-client.js)
│   ├── 小米路由器客户端 (API 方式)
│   ├── 华为路由器客户端 (Web 自动化)
│   └── 统一接口封装
├── 操作管理器 (lib/operations.js)
│   ├── 连接测试
│   ├── 信息获取
│   ├── 重启操作
│   └── 批量处理
├── Web 服务 (server.js)
│   ├── RESTful API
│   ├── 身份认证
│   └── 操作日志
├── 命令行工具 (cli.js)
│   ├── 交互式操作
│   ├── 批量脚本
│   └── 状态查询
└── 工具函数
    ├── 网络检测
    ├── 日志管理
    └── 配置验证
```

## 🚀 快速开始

### 1. 环境准备

确保已安装并运行：
- Docker 20.10+
- Docker Compose 2.0+
- `chromium-base:latest` 基础镜像

### 2. 配置环境

```bash
# 复制配置模板
cp config.example.env .env

# 编辑配置文件
vim .env
```

**必需配置项**:
```bash
# 路由器连接信息
ROUTER_IP=192.168.1.1
ROUTER_USERNAME=admin
ROUTER_PASSWORD=your_router_password
ROUTER_TYPE=xiaomi  # 或 huawei

# 小米路由器需要额外配置密钥
ROUTER_KEY=your_router_key
```

### 3. 启动服务

```bash
# 构建并启动服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f router-manager
```

### 4. 访问服务

- **Web 界面**: http://localhost:3003
- **API 文档**: http://localhost:3003
- **健康检查**: http://localhost:3003/health

**默认认证信息**:
- 用户名: `admin`
- 密码: `admin123`

## 🌐 Web API 接口

### 基础接口

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| GET | `/` | 服务信息 | ❌ |
| GET | `/health` | 健康检查 | ❌ |
| GET | `/api/status` | 服务状态 | ✅ |

### 路由器操作接口

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/connect` | 测试连接 | ✅ |
| GET | `/api/router/info` | 获取路由器信息 | ✅ |
| POST | `/api/router/restart-ipv6` | 重启 IPv6 | ✅ |
| POST | `/api/router/reboot` | 重启路由器 | ✅ |

### 诊断和管理接口

| 方法 | 端点 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/diagnosis` | 网络诊断 | ✅ |
| POST | `/api/batch` | 批量操作 | ✅ |
| GET | `/api/history` | 操作历史 | ✅ |
| GET | `/api/logs` | 系统日志 | ✅ |

## 💻 命令行工具

路由器管理工具提供了强大的命令行界面：

### 基础命令

```bash
# 容器内执行命令行工具
docker-compose exec router-manager node cli.js [command]

# 或者构建后直接使用
npm install -g .
router-cli [command]
```

### 常用命令示例

```bash
# 1. 测试路由器连接
router-cli connect

# 2. 使用自定义配置
router-cli -i 192.168.1.1 -p mypassword -t xiaomi connect

# 3. 获取路由器信息
router-cli info

# 4. 重启 IPv6 模块
router-cli restart-ipv6 --force

# 5. 重启路由器
router-cli reboot --force

# 6. 执行网络诊断
router-cli diagnosis

# 7. 批量操作
router-cli batch '[{"type":"test_connection"},{"type":"restart_ipv6"}]'

# 8. 查看当前状态
router-cli status

# 9. 显示使用示例
router-cli examples

# 10. 详细输出模式
router-cli --verbose connect
```

### 环境变量配置

```bash
# 设置环境变量避免每次输入密码
export ROUTER_PASSWORD=your_password
export ROUTER_IP=192.168.1.1
export ROUTER_TYPE=xiaomi

# 然后可以直接使用命令
router-cli connect
router-cli restart-ipv6 --force
```

## 🔧 使用示例

### Web API 调用示例

```bash
# 设置认证信息 (admin:admin123 的 base64 编码)
AUTH="Authorization: Basic YWRtaW46YWRtaW4xMjM="

# 1. 测试路由器连接
curl -X POST http://localhost:3003/api/connect \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.1",
    "username": "admin",
    "password": "your_password",
    "type": "xiaomi"
  }'

# 2. 获取路由器信息
curl -X GET http://localhost:3003/api/router/info \
  -H "$AUTH"

# 3. 重启 IPv6 模块
curl -X POST http://localhost:3003/api/router/restart-ipv6 \
  -H "$AUTH"

# 4. 重启路由器 (需要确认)
curl -X POST http://localhost:3003/api/router/reboot \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}'

# 5. 执行网络诊断
curl -X POST http://localhost:3003/api/diagnosis \
  -H "$AUTH"

# 6. 批量操作
curl -X POST http://localhost:3003/api/batch \
  -H "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {"type": "test_connection"},
      {"type": "get_info", "delay": 1000},
      {"type": "restart_ipv6"}
    ]
  }'
```

### JavaScript 客户端示例

```javascript
class RouterManagerClient {
  constructor(baseUrl, username, password) {
    this.baseUrl = baseUrl;
    this.auth = btoa(`${username}:${password}`);
  }

  async request(method, endpoint, data = null) {
    const options = {
      method,
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);
    return await response.json();
  }

  async testConnection(config = {}) {
    return await this.request('POST', '/api/connect', config);
  }

  async getRouterInfo() {
    return await this.request('GET', '/api/router/info');
  }

  async restartIPv6() {
    return await this.request('POST', '/api/router/restart-ipv6');
  }

  async diagnosis() {
    return await this.request('POST', '/api/diagnosis');
  }
}

// 使用示例
const client = new RouterManagerClient('http://localhost:3003', 'admin', 'admin123');

// 测试连接
const result = await client.testConnection({
  ip: '192.168.1.1',
  username: 'admin',
  password: 'your_password',
  type: 'xiaomi'
});

console.log('连接测试结果:', result);
```

## 📚 路由器支持

### 小米路由器

**支持型号**: 小米路由器 4、4A、AX3000、AX6000、AX9000 等

**配置要求**:
- 路由器 IP (通常是 192.168.31.1)
- 管理员密码
- 路由器密钥 (路由器背面标签)

**特殊说明**:
- 使用 API 方式连接，速度快、稳定性好
- 需要在路由器标签上找到 Key 值
- 支持完整的路由器信息获取

### 华为路由器

**支持型号**: 华为路由器 WS、AX 系列等

**配置要求**:
- 路由器 IP (通常是 192.168.3.1)
- 管理员密码

**特殊说明**:
- 使用 Web 自动化方式，兼容性广
- 不同型号界面可能略有差异
- 操作时间相对较长

## 🔍 故障排除

### 常见问题

**1. 连接测试失败**
```bash
# 检查网络连通性
ping $ROUTER_IP

# 验证路由器 Web 界面
curl -I http://$ROUTER_IP

# 检查认证信息
docker-compose logs router-manager
```

**2. 小米路由器 Key 错误**
```bash
# 检查路由器背面标签上的 Key
# 或者在路由器管理界面 -> 常用设置 -> 系统状态中查看

# Key 格式通常为 32 位字符串
ROUTER_KEY=abcd1234efgh5678ijkl9012mnop3456
```

**3. 华为路由器界面不兼容**
```bash
# 检查路由器型号和固件版本
# 可能需要根据具体界面调整选择器

# 查看截图调试
docker-compose exec router-manager ls -la /app/logs/
```

**4. 权限或端口问题**
```bash
# 检查端口占用
netstat -tlnp | grep 3003

# 检查 Docker 网络
docker network ls
docker-compose logs
```

### 调试模式

```bash
# 启用详细日志
docker-compose exec router-manager \
  env LOG_LEVEL=debug node server.js

# 命令行详细模式
router-cli --verbose connect

# 检查健康状态
curl http://localhost:3003/health
```

## ⚙️ 高级配置

### 自定义路由器支持

```javascript
// 扩展支持新的路由器品牌
class CustomRouterClient extends RouterClient {
  async connect() {
    // 实现连接逻辑
  }

  async restartIPv6() {
    // 实现 IPv6 重启逻辑
  }
}

// 在工厂类中注册
RouterClientFactory.register('custom', CustomRouterClient);
```

### 批量操作脚本

```bash
# 创建批量操作脚本
cat > batch_operations.json << EOF
[
  {"type": "test_connection"},
  {"type": "get_info", "delay": 2000},
  {"type": "diagnosis", "delay": 5000},
  {"type": "restart_ipv6"}
]
EOF

# 执行批量操作
router-cli batch "$(cat batch_operations.json)"
```

### Docker 网络配置

```yaml
# docker-compose.yml 中的网络配置
services:
  router-manager:
    # 使用 host 网络确保可以访问路由器
    network_mode: "host"
    
    # 或者使用桥接网络
    # networks:
    #   - router-net

# networks:
#   router-net:
#     driver: bridge
#     ipam:
#       config:
#         - subnet: 192.168.100.0/24
```

## 🔒 安全注意事项

1. **认证信息保护**: 妥善保管路由器密码和 Web 认证信息
2. **网络隔离**: 建议在安全的网络环境中使用
3. **访问控制**: 限制 Web 界面的访问来源
4. **日志监控**: 定期检查操作日志和异常记录
5. **定期更新**: 保持基础镜像和依赖的更新

## 📊 性能优化

### 资源使用

- **CPU**: 0.1-0.5 核心
- **内存**: 128MB-512MB
- **存储**: 日志和临时文件
- **网络**: 需要访问路由器和外部网络

### 优化建议

1. **缓存连接**: 复用路由器连接减少认证次数
2. **超时设置**: 根据网络环境调整超时时间
3. **日志管理**: 定期清理日志文件避免占用过多空间
4. **资源限制**: 根据使用频率调整容器资源配额

## 🤝 贡献指南

1. Fork 项目仓库
2. 创建功能分支
3. 添加新的路由器支持
4. 完善测试用例
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../../../LICENSE) 文件了解详情

## 🙏 致谢

- [chromium-base](../../base-images/) - 精简的 Chromium 基础镜像
- [Puppeteer](https://pptr.dev/) - 浏览器自动化库
- [Express.js](https://expressjs.com/) - Web 服务框架
- [Commander.js](https://github.com/tj/commander.js) - 命令行工具框架

---

🛠️ **让路由器管理更简单，让网络控制更智能！**