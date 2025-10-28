#!/bin/bash

# API Adapter 服务启动脚本

# 加载环境变量
if [ -f .env ]; then
    echo "加载 .env 文件..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "警告: .env 文件不存在，使用默认配置或已设置的环境变量"
fi

# 检查必需的配置
if [ -z "$DIANSUYUN_APP_ID" ] || [ -z "$DIANSUYUN_APP_SECRET" ] || [ -z "$DIANSUYUN_API_PRE" ]; then
    echo "错误: 缺少必需的环境变量"
    echo "请设置以下环境变量:"
    echo "  - DIANSUYUN_APP_ID"
    echo "  - DIANSUYUN_APP_SECRET"
    echo "  - DIANSUYUN_API_PRE"
    echo ""
    echo "或者复制 .env.example 到 .env 并修改配置"
    exit 1
fi

# 启动服务
echo "启动 API Adapter 服务..."
node src/server.js



