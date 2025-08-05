#!/bin/bash

# 服务测试脚本
# 功能: 测试所有 Chromium 服务是否正常工作

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试配置
TEST_URL="https://httpbin.org/html"
TIMEOUT=30

echo -e "${BLUE}=== Chromium 服务测试脚本 ===${NC}"
echo -e "${YELLOW}测试 URL: ${TEST_URL}${NC}"
echo ""

# 检查服务是否运行
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    
    echo -e "${BLUE}检查 ${service_name} 服务 (端口 ${port})...${NC}"
    
    # 等待服务启动
    local count=0
    while [ $count -lt $TIMEOUT ]; do
        if curl -s -f "http://localhost:${port}${endpoint}" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ ${service_name} 服务运行正常${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -n "."
    done
    
    echo -e "${RED}❌ ${service_name} 服务启动失败或超时${NC}"
    return 1
}

# 测试截图功能
test_screenshot() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    
    echo -e "${BLUE}测试 ${service_name} 截图功能...${NC}"
    
    local output_file="/tmp/test_screenshot_${port}.png"
    
    if curl -s -X POST "http://localhost:${port}${endpoint}" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"${TEST_URL}\",\"width\":1280,\"height\":720}" \
        --output "${output_file}" \
        --max-time 60; then
        
        if [ -f "${output_file}" ] && [ -s "${output_file}" ]; then
            local file_size=$(wc -c < "${output_file}")
            echo -e "${GREEN}✅ ${service_name} 截图成功 (文件大小: ${file_size} bytes)${NC}"
            rm -f "${output_file}"
            return 0
        else
            echo -e "${RED}❌ ${service_name} 截图文件无效${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ ${service_name} 截图请求失败${NC}"
        return 1
    fi
}

# 测试 PDF 生成功能
test_pdf() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    
    echo -e "${BLUE}测试 ${service_name} PDF 生成功能...${NC}"
    
    local output_file="/tmp/test_pdf_${port}.pdf"
    
    if curl -s -X POST "http://localhost:${port}${endpoint}" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"${TEST_URL}\",\"options\":{\"format\":\"A4\"}}" \
        --output "${output_file}" \
        --max-time 60; then
        
        if [ -f "${output_file}" ] && [ -s "${output_file}" ]; then
            local file_size=$(wc -c < "${output_file}")
            # 检查是否为有效的 PDF 文件
            if file "${output_file}" | grep -q "PDF"; then
                echo -e "${GREEN}✅ ${service_name} PDF 生成成功 (文件大小: ${file_size} bytes)${NC}"
                rm -f "${output_file}"
                return 0
            else
                echo -e "${RED}❌ ${service_name} 生成的不是有效 PDF 文件${NC}"
                return 1
            fi
        else
            echo -e "${RED}❌ ${service_name} PDF 文件无效${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ ${service_name} PDF 请求失败${NC}"
        return 1
    fi
}

# 测试内容获取功能
test_content() {
    local service_name=$1
    local port=$2
    
    echo -e "${BLUE}测试 ${service_name} 内容获取功能...${NC}"
    
    local response=$(curl -s -X POST "http://localhost:${port}/content" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"${TEST_URL}\",\"selector\":\"title\"}" \
        --max-time 60)
    
    if echo "${response}" | grep -q "content"; then
        echo -e "${GREEN}✅ ${service_name} 内容获取成功${NC}"
        return 0
    else
        echo -e "${RED}❌ ${service_name} 内容获取失败${NC}"
        echo -e "${YELLOW}响应: ${response}${NC}"
        return 1
    fi
}

# 测试 IPv6 监控服务功能
test_ipv6_monitor() {
    local service_name=$1
    local port=$2
    
    echo -e "${BLUE}测试 ${service_name} API 功能...${NC}"
    
    # 基础认证（admin:admin123 的 base64 编码）
    local auth_header="Authorization: Basic YWRtaW46YWRtaW4xMjM="
    
    # 测试获取状态
    echo -e "${BLUE}  测试状态获取...${NC}"
    local status_response=$(curl -s -H "${auth_header}" \
        "http://localhost:${port}/api/status" \
        --max-time 30)
    
    if echo "${status_response}" | grep -q "monitor"; then
        echo -e "${GREEN}  ✅ 状态获取成功${NC}"
    else
        echo -e "${RED}  ❌ 状态获取失败${NC}"
        echo -e "${YELLOW}  响应: ${status_response}${NC}"
        return 1
    fi
    
    # 测试手动检测
    echo -e "${BLUE}  测试手动 IPv6 检测...${NC}"
    local check_response=$(curl -s -X POST -H "${auth_header}" \
        -H "Content-Type: application/json" \
        "http://localhost:${port}/api/check" \
        --max-time 60)
    
    if echo "${check_response}" | grep -q "result"; then
        echo -e "${GREEN}  ✅ IPv6 检测成功${NC}"
    else
        echo -e "${RED}  ❌ IPv6 检测失败${NC}"
        echo -e "${YELLOW}  响应: ${check_response}${NC}"
        return 1
    fi
    
    # 测试配置获取
    echo -e "${BLUE}  测试配置获取...${NC}"
    local config_response=$(curl -s -H "${auth_header}" \
        "http://localhost:${port}/api/config" \
        --max-time 30)
    
    if echo "${config_response}" | grep -q "router"; then
        echo -e "${GREEN}  ✅ 配置获取成功${NC}"
    else
        echo -e "${RED}  ❌ 配置获取失败${NC}"
        echo -e "${YELLOW}  响应: ${config_response}${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ ${service_name} API 功能测试通过${NC}"
    return 0
}

# 主测试流程
main() {
    local failed_tests=0
    
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 10
    
    # 测试 Puppeteer 服务 (端口 3000)
    echo -e "\n${BLUE}=== 测试 Puppeteer API 服务 ===${NC}"
    if check_service "Puppeteer API" 3000 "/health"; then
        test_screenshot "Puppeteer API" 3000 "/screenshot" || failed_tests=$((failed_tests + 1))
        test_pdf "Puppeteer API" 3000 "/pdf" || failed_tests=$((failed_tests + 1))
        test_content "Puppeteer API" 3000 || failed_tests=$((failed_tests + 1))
    else
        failed_tests=$((failed_tests + 3))
    fi
    
    # 测试截图服务 (端口 8000)
    echo -e "\n${BLUE}=== 测试截图服务 ===${NC}"
    if check_service "截图服务" 8000 "/health"; then
        test_screenshot "截图服务" 8000 "/screenshot" || failed_tests=$((failed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # 测试 PDF 生成服务 (端口 3001)
    echo -e "\n${BLUE}=== 测试 PDF 生成服务 ===${NC}"
    if check_service "PDF 生成服务" 3001 "/health"; then
        test_pdf "PDF 生成服务" 3001 "/pdf/url" || failed_tests=$((failed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # 测试 IPv6 监控服务 (端口 3002)
    echo -e "\n${BLUE}=== 测试 IPv6 监控服务 ===${NC}"
    if check_service "IPv6 监控服务" 3002 "/health"; then
        test_ipv6_monitor "IPv6 监控服务" 3002 || failed_tests=$((failed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi
    
    # 测试结果总结
    echo -e "\n${BLUE}=== 测试结果总结 ===${NC}"
    if [ $failed_tests -eq 0 ]; then
        echo -e "${GREEN}🎉 所有测试通过!${NC}"
        echo -e "${GREEN}✅ Chromium 基础镜像方案部署成功${NC}"
        return 0
    else
        echo -e "${RED}❌ 有 ${failed_tests} 个测试失败${NC}"
        echo -e "${YELLOW}请检查服务日志: docker-compose logs${NC}"
        return 1
    fi
}

# 运行主测试
main "$@"