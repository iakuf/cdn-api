@echo off
REM API Adapter 服务启动脚本 (Windows)

REM 设置环境变量 - 请根据实际情况修改
set DIANSUYUN_APP_ID=9JLZCITlaE61511PGx7r
set DIANSUYUN_APP_SECRET=EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b
set DIANSUYUN_API_PRE=http://apiv4.diansuyun.com/V4/

REM 可选：设置第三方鉴权（留空则禁用鉴权）
set THIRD_PARTY_AK=
set THIRD_PARTY_SK=

REM 可选：服务器配置
set PORT=3000
set DEBUG=true

echo ====================================
echo 启动 API Adapter 服务
echo ====================================
echo.

node src/server.js

pause

