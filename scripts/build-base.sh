#!/bin/bash

# Chromium 基础镜像构建脚本
# 功能: 构建精简的 Chromium 基础镜像

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本配置
BASE_IMAGE_NAME="chromium-base"
BASE_IMAGE_TAG="latest"
BUILD_CONTEXT="$(dirname "$0")/../base-images"

echo -e "${BLUE}=== Chromium 基础镜像构建脚本 ===${NC}"
echo -e "${YELLOW}镜像名称: ${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}${NC}"
echo -e "${YELLOW}构建上下文: ${BUILD_CONTEXT}${NC}"
echo ""

# 检查 Docker 是否可用
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未找到 Docker 命令${NC}"
    exit 1
fi

# 检查 Dockerfile 是否存在
if [ ! -f "${BUILD_CONTEXT}/Dockerfile" ]; then
    echo -e "${RED}错误: 未找到 Dockerfile: ${BUILD_CONTEXT}/Dockerfile${NC}"
    exit 1
fi

echo -e "${BLUE}开始构建基础镜像...${NC}"

# 构建镜像
docker build \
    --platform linux/amd64 \
    --tag "${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}" \
    --tag "${BASE_IMAGE_NAME}:$(date +%Y%m%d)" \
    "${BUILD_CONTEXT}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 基础镜像构建成功!${NC}"
    
    # 显示镜像信息
    echo -e "\n${BLUE}=== 镜像信息 ===${NC}"
    docker images "${BASE_IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    
    # 测试镜像
    echo -e "\n${BLUE}=== 测试镜像 ===${NC}"
    docker run --rm --platform linux/amd64 "${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}"
    
    echo -e "\n${GREEN}🎉 基础镜像已准备就绪!${NC}"
    echo -e "${YELLOW}使用方法: FROM ${BASE_IMAGE_NAME}:${BASE_IMAGE_TAG}${NC}"
    
else
    echo -e "${RED}❌ 基础镜像构建失败${NC}"
    exit 1
fi