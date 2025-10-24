#!/bin/bash

# API Adapter 手动测试脚本
# 使用 curl 测试各个接口

# 配置
BASE_URL="http://localhost:3000"
AK="${THIRD_PARTY_AK:-test_ak_123456}"
SK="${THIRD_PARTY_SK:-test_sk_secret}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 生成鉴权参数
generate_auth() {
    T=$(date +%s)
    TOKEN=$(echo -n "${AK}${SK}${T}" | openssl dgst -sha1 | awk '{print $2}')
    AUTH_PARAMS="ak=${AK}&t=${T}&token=${TOKEN}"
    echo "${AUTH_PARAMS}"
}

# 打印分隔线
print_separator() {
    echo -e "${YELLOW}========================================${NC}"
}

# 打印成功消息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 打印错误消息
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 打印信息
print_info() {
    echo -e "${YELLOW}$1${NC}"
}

# 测试函数
test_api() {
    local test_num=$1
    local test_name=$2
    local endpoint=$3
    local data=$4
    
    print_separator
    echo "测试 ${test_num}: ${test_name}"
    print_separator
    
    local auth=$(generate_auth)
    local url="${BASE_URL}${endpoint}?${auth}"
    
    echo "请求 URL: ${url}"
    echo "请求数据:"
    echo "${data}" | jq . 2>/dev/null || echo "${data}"
    echo ""
    echo "响应:"
    
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${url}" \
        -H "Content-Type: application/json" \
        -d "${data}")
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    echo "${body}" | jq . 2>/dev/null || echo "${body}"
    echo ""
    
    if [ "$http_code" == "200" ] || [ "$http_code" == "202" ]; then
        print_success "状态码: ${http_code}"
    else
        print_error "状态码: ${http_code}"
    fi
    
    echo ""
}

# 主菜单
show_menu() {
    print_separator
    echo "API Adapter 测试菜单"
    print_separator
    echo "1. 测试刷新接口 (RefreshCaches)"
    echo "2. 测试预热接口 (PreloadCaches)"
    echo "3. 测试进度查询 (GetRefreshOrPreloadTask)"
    echo "4. 测试IP查询 (IpCheck)"
    echo "5. 测试证书绑定参数验证 (SetCertificate)"
    echo "6. 测试证书解绑 (SetCertificate)"
    echo "7. 测试证书查询 (GetCertificates)"
    echo "8. 测试鉴权失败"
    echo "9. 运行所有测试"
    echo "0. 退出"
    print_separator
    echo -n "请选择测试 (0-9): "
}

# 测试1: 刷新接口
test1() {
    test_api "1" "刷新接口" "/content/RefreshCaches" '{
        "Files": [
            {"Url": "http://cdn.listlive.cn/test.txt"},
            {"Url": "http://cdn.listlive.cn/test.html"}
        ],
        "Dirs": [
            {"Url": "http://cdn.listlive.cn/images/"}
        ]
    }'
}

# 测试2: 预热接口
test2() {
    test_api "2" "预热接口" "/content/PreloadCaches" '{
        "Urls": [
            {"Url": "http://cdn.listlive.cn/test.txt"}
        ]
    }'
}

# 测试3: 进度查询
test3() {
    local now=$(date -u +"%Y-%m-%dT%H:%M:%S+0800")
    local week_ago=$(date -u -d '7 days ago' +"%Y-%m-%dT%H:%M:%S+0800" 2>/dev/null || date -u -v-7d +"%Y-%m-%dT%H:%M:%S+0800")
    
    test_api "3" "进度查询" "/content/GetRefreshOrPreloadTask" "{
        \"StartTime\": \"${week_ago}\",
        \"EndTime\": \"${now}\",
        \"PageSize\": 20,
        \"PageNumber\": 1
    }"
}

# 测试4: IP查询
test4() {
    test_api "4" "IP查询" "/service/IpCheck" '{
        "Ip": "183.204.220.83,36.41.170.150,1.1.1.1"
    }'
}

# 测试5: 证书绑定参数验证
test5() {
    test_api "5" "证书绑定参数验证" "/cert/SetCertificate" '{
        "Domains": "cdn.listlive.cn",
        "Action": "bind"
    }'
}

# 测试6: 证书解绑
test6() {
    test_api "6" "证书解绑" "/cert/SetCertificate" '{
        "Domains": "cdn.listlive.cn",
        "Action": "unbind"
    }'
}

# 测试7: 证书查询
test7() {
    test_api "7" "证书查询" "/cert/GetCertificates" '{
        "Domain": "cdn.listlive.cn"
    }'
}

# 测试8: 鉴权失败
test8() {
    print_separator
    echo "测试 8: 鉴权失败"
    print_separator
    
    local t=$(date +%s)
    local url="${BASE_URL}/content/RefreshCaches?ak=${AK}&t=${t}&token=invalid_token_123"
    
    echo "请求 URL: ${url}"
    echo "使用无效 token: invalid_token_123"
    echo ""
    echo "响应:"
    
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "${url}" \
        -H "Content-Type: application/json" \
        -d '{"Files":[{"Url":"http://test.com/test.txt"}]}')
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d':' -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    echo "${body}" | jq . 2>/dev/null || echo "${body}"
    echo ""
    
    if [ "$http_code" == "401" ]; then
        print_success "状态码: ${http_code} (正确拒绝)"
    else
        print_error "状态码: ${http_code} (应该返回401)"
    fi
    
    echo ""
}

# 运行所有测试
run_all_tests() {
    print_info "运行所有测试..."
    echo ""
    test1
    sleep 1
    test2
    sleep 1
    test3
    sleep 1
    test4
    sleep 1
    test5
    sleep 1
    test6
    sleep 1
    test7
    sleep 1
    test8
    print_success "所有测试完成！"
}

# 主程序
main() {
    # 检查 curl 是否存在
    if ! command -v curl &> /dev/null; then
        print_error "curl 未安装，请先安装 curl"
        exit 1
    fi
    
    # 检查 jq 是否存在（可选）
    if ! command -v jq &> /dev/null; then
        print_info "提示: 安装 jq 可以获得更好的 JSON 格式化输出"
    fi
    
    print_info "使用配置:"
    echo "  BASE_URL: ${BASE_URL}"
    echo "  AK: ${AK}"
    echo ""
    
    # 如果有命令行参数，直接运行对应测试
    if [ $# -gt 0 ]; then
        case $1 in
            1) test1 ;;
            2) test2 ;;
            3) test3 ;;
            4) test4 ;;
            5) test5 ;;
            6) test6 ;;
            7) test7 ;;
            8) test8 ;;
            9) run_all_tests ;;
            *) echo "无效的测试编号: $1" ;;
        esac
        exit 0
    fi
    
    # 交互式菜单
    while true; do
        show_menu
        read choice
        
        case $choice in
            1) test1 ;;
            2) test2 ;;
            3) test3 ;;
            4) test4 ;;
            5) test5 ;;
            6) test6 ;;
            7) test7 ;;
            8) test8 ;;
            9) run_all_tests ;;
            0) 
                print_info "退出测试"
                exit 0
                ;;
            *)
                print_error "无效的选择，请输入 0-9"
                ;;
        esac
        
        echo ""
        echo -n "按回车继续..."
        read
        clear
    done
}

# 运行主程序
main "$@"

