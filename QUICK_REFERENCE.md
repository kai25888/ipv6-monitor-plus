# 🚀 快速参考指南

## 📋 **常用命令速查表**

### 镜像管理

```bash
# 查看本地镜像
docker images | grep chromium-base

# 查看远程镜像库内容
curl -X GET http://979569933.xyz:5000/v2/chromium-base/tags/list
```

### 推送镜像

```bash
# 标记并推送
docker tag chromium-base:silent 979569933.xyz:5000/chromium-base:silent
docker push 979569933.xyz:5000/chromium-base:silent
```

### 删除远程镜像

```bash
# 使用删除脚本（推荐）
./scripts/delete-remote-image.sh 979569933.xyz:5000 chromium-base silent

# 或使用默认参数
./scripts/delete-remote-image.sh
```

### 运行镜像

```bash
# 本地运行（静默版本，推荐）
docker run --rm --platform linux/amd64 chromium-base:silent

# 从远程库运行
docker run --rm --platform linux/amd64 979569933.xyz:5000/chromium-base:silent

# 实际应用示例
docker run --rm --platform linux/amd64 chromium-base:silent \
  chromium-silent --dump-dom https://example.com
```

### 构建和清理

```bash
# 快速构建静默版本
cd base-images && ./build-silent.sh

# 清理本地镜像
docker image prune -a
```

## 🎯 **推荐工作流程**

1. **开发阶段**
   ```bash
   cd base-images
   ./build-silent.sh
   ```

2. **测试验证**
   ```bash
   docker run --rm --platform linux/amd64 chromium-base:silent
   ```

3. **推送到远程**
   ```bash
   docker tag chromium-base:silent 979569933.xyz:5000/chromium-base:silent
   docker push 979569933.xyz:5000/chromium-base:silent
   ```

4. **需要删除时**
   ```bash
   ./scripts/delete-remote-image.sh 979569933.xyz:5000 chromium-base silent
   ```

## 📊 **当前最佳实践**

- **生产使用**: `chromium-base:silent` (604MB, x86_64, 零错误)
- **开发调试**: `chromium-base:fast` (705MB, 保留错误日志)
- **避免使用**: `chromium-base:latest` (715MB, 包含大量错误日志)

## 🔧 **故障排除**

| 问题 | 解决方案 |
|------|---------|
| 推送失败 | 检查网络连接和镜像库权限 |
| 删除失败 | 确认镜像存在且有删除权限 |
| 架构错误 | 使用 `--platform linux/amd64` |
| 运行报错 | 使用 `silent` 版本避免日志噪音 |