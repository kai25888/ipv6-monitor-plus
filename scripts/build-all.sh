#!/bin/bash

# 全项目构建脚本
# 功能: 构建基础镜像和所有示例镜像

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(dirname "$0")/.."
SCRIPTS_DIR="${PROJECT_ROOT}/scripts"

echo -e "${BLUE}=== Docker Chromium 项目全量构建 ===${NC}"
echo ""

# 构建顺序
BUILD_STEPS=(
    "基础镜像"
    "Puppeteer 示例"
    "截图服务示例"
    "PDF 生成示例"
    "IPv6 监控示例"
    "路由器管理示例"
    "Web 爬虫示例"
)

echo -e "${YELLOW}构建计划:${NC}"
for i in "${!BUILD_STEPS[@]}"; do
    echo -e "  $((i+1)). ${BUILD_STEPS[$i]}"
done
echo ""

# 1. 构建基础镜像
echo -e "${BLUE}[1/5] 构建基础镜像...${NC}"
"${SCRIPTS_DIR}/build-base.sh"
echo ""

# 2. 构建 Puppeteer 示例
echo -e "${BLUE}[2/5] 构建 Puppeteer 示例...${NC}"
if [ -f "${PROJECT_ROOT}/examples/puppeteer/docker-compose.yml" ]; then
    cd "${PROJECT_ROOT}/examples/puppeteer"
    docker-compose build
    cd "${PROJECT_ROOT}"
    echo -e "${GREEN}✅ Puppeteer 示例构建完成${NC}"
else
    echo -e "${YELLOW}⚠️  Puppeteer 示例不存在，跳过${NC}"
fi
echo ""

# 3. 构建截图服务示例
echo -e "${BLUE}[3/5] 构建截图服务示例...${NC}"
if [ -f "${PROJECT_ROOT}/examples/simple-screenshot/docker-compose.yml" ]; then
    cd "${PROJECT_ROOT}/examples/simple-screenshot"
    docker-compose build
    cd "${PROJECT_ROOT}"
    echo -e "${GREEN}✅ 截图服务示例构建完成${NC}"
else
    echo -e "${YELLOW}⚠️  截图服务示例不存在，跳过${NC}"
fi
echo ""

# 4. 构建 PDF 生成示例
echo -e "${BLUE}[4/6] 构建 PDF 生成示例...${NC}"
if [ -f "${PROJECT_ROOT}/examples/pdf-generator/docker-compose.yml" ]; then
    cd "${PROJECT_ROOT}/examples/pdf-generator"
    docker-compose build
    cd "${PROJECT_ROOT}"
    echo -e "${GREEN}✅ PDF 生成示例构建完成${NC}"
else
    echo -e "${YELLOW}⚠️  PDF 生成示例不存在，跳过${NC}"
fi
echo ""

# 5. 构建 IPv6 监控示例
echo -e "${BLUE}[5/7] 构建 IPv6 监控示例...${NC}"
if [ -f "${PROJECT_ROOT}/examples/ipv6-monitor/docker-compose.yml" ]; then
    cd "${PROJECT_ROOT}/examples/ipv6-monitor"
    docker-compose build
    cd "${PROJECT_ROOT}"
    echo -e "${GREEN}✅ IPv6 监控示例构建完成${NC}"
else
    echo -e "${YELLOW}⚠️  IPv6 监控示例不存在，跳过${NC}"
fi
echo ""

# 6. 构建路由器管理示例
echo -e "${BLUE}[6/7] 构建路由器管理示例...${NC}"
if [ -f "${PROJECT_ROOT}/examples/router-manager/docker-compose.yml" ]; then
    cd "${PROJECT_ROOT}/examples/router-manager"
    docker-compose build
    cd "${PROJECT_ROOT}"
    echo -e "${GREEN}✅ 路由器管理示例构建完成${NC}"
else
    echo -e "${YELLOW}⚠️  路由器管理示例不存在，跳过${NC}"
fi
echo ""

# 7. 构建 Web 爬虫示例
echo -e "${BLUE}[7/7] 构建 Web 爬虫示例...${NC}"
if [ -f "${PROJECT_ROOT}/examples/web-scraper/docker-compose.yml" ]; then
    cd "${PROJECT_ROOT}/examples/web-scraper"
    docker-compose build
    cd "${PROJECT_ROOT}"
    echo -e "${GREEN}✅ Web 爬虫示例构建完成${NC}"
else
    echo -e "${YELLOW}⚠️  Web 爬虫示例不存在，跳过${NC}"
fi
echo ""

echo -e "${GREEN}🎉 所有镜像构建完成!${NC}"
echo ""
echo -e "${BLUE}=== 构建的镜像列表 ===${NC}"
docker images | grep -E "(chromium-|puppeteer|screenshot|pdf-gen|ipv6-monitor|web-scraper)" || echo "没有找到相关镜像"
echo ""
echo -e "${YELLOW}使用 'docker images' 查看所有镜像${NC}"