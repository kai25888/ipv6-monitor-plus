# 🗂️ 私有镜像库管理指南

## 镜像推送和删除操作

### 📤 **推送镜像到远程私有库**

```bash
# 1. 标记镜像
docker tag chromium-base:silent 979569933.xyz:5000/chromium-base:silent

# 2. 推送到私有库
docker push 979569933.xyz:5000/chromium-base:silent
```

### 🗑️ **删除远程镜像的方法**

#### 方法一：使用删除脚本（推荐）

```bash
# 删除指定镜像
./scripts/delete-remote-image.sh 979569933.xyz:5000 chromium-base silent

# 或者使用默认参数（已预设为你的镜像库）
./scripts/delete-remote-image.sh
```

#### 方法二：手动 API 调用

```bash
# 1. 查看镜像库中的所有 tags
curl -X GET http://979569933.xyz:5000/v2/chromium-base/tags/list

# 2. 获取镜像 digest
curl -v -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  http://979569933.xyz:5000/v2/chromium-base/manifests/silent 2>&1 | \
  grep "Docker-Content-Digest"

# 3. 删除镜像（替换 <DIGEST> 为实际值）
curl -X DELETE http://979569933.xyz:5000/v2/chromium-base/manifests/<DIGEST>
```

#### 方法三：批量删除脚本

```bash
# 删除某个镜像的所有 tags
./scripts/delete-remote-image.sh 979569933.xyz:5000 chromium-base ""
```

### 🔍 **查看和管理镜像**

#### 列出镜像库中的所有镜像

```bash
# 查看所有仓库
curl -X GET http://979569933.xyz:5000/v2/_catalog

# 查看特定镜像的所有 tags
curl -X GET http://979569933.xyz:5000/v2/chromium-base/tags/list
```

#### 查看镜像详细信息

```bash
# 获取镜像 manifest 信息
curl -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  http://979569933.xyz:5000/v2/chromium-base/manifests/silent
```

### 🧹 **清理和维护**

#### 清理本地未使用的镜像

```bash
# 删除本地 dangling 镜像
docker image prune

# 删除所有未使用的镜像
docker image prune -a

# 删除特定本地镜像
docker rmi chromium-base:silent
docker rmi 979569933.xyz:5000/chromium-base:silent
```

#### 私有镜像库垃圾回收

```bash
# 如果是 Docker Registry v2，需要在服务器上运行
# docker exec -it <registry-container> registry garbage-collect /etc/docker/registry/config.yml
```

### 🚀 **快速操作命令**

#### 当前项目的常用操作

```bash
# 推送所有版本到私有库
docker tag chromium-base:latest 979569933.xyz:5000/chromium-base:latest
docker tag chromium-base:silent 979569933.xyz:5000/chromium-base:silent
docker tag chromium-base:fast 979569933.xyz:5000/chromium-base:fast

docker push 979569933.xyz:5000/chromium-base:latest
docker push 979569933.xyz:5000/chromium-base:silent  
docker push 979569933.xyz:5000/chromium-base:fast

# 删除所有远程版本
./scripts/delete-remote-image.sh 979569933.xyz:5000 chromium-base latest
./scripts/delete-remote-image.sh 979569933.xyz:5000 chromium-base silent
./scripts/delete-remote-image.sh 979569933.xyz:5000 chromium-base fast
```

### ⚠️ **注意事项**

1. **删除是永久性的**：删除远程镜像后无法恢复
2. **依赖检查**：删除前确保没有其他服务正在使用该镜像
3. **权限要求**：需要对镜像库有删除权限
4. **网络连接**：确保能够连接到私有镜像库
5. **垃圾回收**：删除镜像后，私有库可能需要运行垃圾回收才能真正释放存储空间

### 🔧 **故障排除**

#### 常见错误及解决方案

1. **权限被拒绝**
   ```bash
   # 检查是否需要认证
   curl -u username:password -X DELETE ...
   ```

2. **镜像不存在**
   ```bash
   # 先检查镜像是否存在
   curl -X GET http://979569933.xyz:5000/v2/chromium-base/tags/list
   ```

3. **网络连接问题**
   ```bash
   # 测试连接
   curl http://979569933.xyz:5000/v2/
   ```

### 📋 **当前镜像状态**

```bash
# 查看你当前的镜像
docker images | grep chromium-base
```

目前你有以下镜像版本：
- `chromium-base:silent` (604MB) - **推荐版本**，x86_64 架构，零错误输出
- `chromium-base:fast` (705MB) - 快速版本
- `chromium-base:latest` (715MB) - 原始版本

**建议**：使用 `silent` 版本作为生产环境的标准镜像。