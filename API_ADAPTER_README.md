# CDN API 适配器服务

这是一个 CDN API 适配器服务，将第三方标准 API 接口转换为 Diansuyun 内部 API 调用。

## 功能特性

### 已实现的 API 接口

1. **刷新接口** (`POST /content/RefreshCaches`)
   - 支持文件刷新 (Files)
   - 支持目录刷新 (Dirs)
   - 支持正则刷新 (Regexes) - 注：内部API不支持，会被忽略并记录警告

2. **预热接口** (`POST /content/PreloadCaches`)
   - 支持URL预热

3. **刷新/预热进度查询** (`POST /content/GetRefreshOrPreloadTask`)
   - 支持按时间范围查询
   - 支持分页查询
   - 合并刷新和预热任务结果

4. **IP归属查询** (`POST /service/IpCheck`)
   - 支持批量IP查询（逗号分隔）
   - 返回 CDN IP 归属信息
   - 注：当前为模拟实现，需要接入真实IP查询服务

5. **证书绑定/解绑** (`POST /cert/SetCertificate`)
   - 支持证书绑定 (Action: bind)
   - 支持证书解绑 (Action: unbind)
   - 自动上传证书并关联到域名

6. **证书信息查询** (`POST /cert/GetCertificates`)
   - 查询域名绑定的证书信息
   - 返回证书颁发机构、有效期等信息

### 鉴权机制

服务实现了第三方标准鉴权：
- 算法：`token = SHA1(ak + sk + t)`
- 有效期：10分钟
- 参数：通过 URL query 传递 `ak`, `t`, `token`

如果未设置 `THIRD_PARTY_AK` 和 `THIRD_PARTY_SK` 环境变量，鉴权将被禁用（仅用于开发测试）。

## 安装和配置

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Diansuyun SDK 配置
DIANSUYUN_APP_ID=你的APP_ID
DIANSUYUN_APP_SECRET=你的APP_SECRET
DIANSUYUN_API_PRE=http://apiv4.diansuyun.com/V4/

# 第三方鉴权配置（可选，留空则禁用鉴权）
THIRD_PARTY_AK=your_access_key
THIRD_PARTY_SK=your_secret_key

# 服务器配置
PORT=3000
DEBUG=true
```

### 3. 启动服务

**Linux/Mac:**
```bash
chmod +x start_server.sh
./start_server.sh
```

**Windows:**
```cmd
start_server.bat
```

**或直接使用 Node.js:**
```bash
node src/server.js
```

## 测试

### 运行所有测试

```bash
node test_api_adapter.js
```

### 运行单个测试

```bash
node test_api_adapter.js 1   # 测试刷新接口
node test_api_adapter.js 2   # 测试预热接口
node test_api_adapter.js 3   # 测试进度查询
node test_api_adapter.js 4   # 测试IP查询
# ... 依此类推
```

### 可用的测试

1. 刷新接口测试
2. 预热接口测试
3. 刷新/预热进度查询测试
4. IP归属查询测试
5. 证书绑定测试（参数验证）
6. 证书解绑测试
7. 证书信息查询测试
8. 鉴权失败测试
9. 参数验证测试

### 使用 curl 测试

#### 1. 刷新接口示例

```bash
# 生成鉴权参数
AK="your_ak"
SK="your_sk"
T=$(date +%s)
TOKEN=$(echo -n "${AK}${SK}${T}" | sha1sum | awk '{print $1}')

# 发送请求
curl -X POST "http://localhost:3000/content/RefreshCaches?ak=${AK}&t=${T}&token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Files": [
      {"Url": "http://cdn.listlive.cn/test.txt"}
    ],
    "Dirs": [
      {"Url": "http://cdn.listlive.cn/images/"}
    ]
  }'
```

#### 2. 预热接口示例

```bash
curl -X POST "http://localhost:3000/content/PreloadCaches?ak=${AK}&t=${T}&token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Urls": [
      {"Url": "http://cdn.listlive.cn/test.txt"}
    ]
  }'
```

#### 3. 查询进度示例

```bash
curl -X POST "http://localhost:3000/content/GetRefreshOrPreloadTask?ak=${AK}&t=${T}&token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "StartTime": "2025-10-20T00:00:00+0800",
    "EndTime": "2025-10-25T23:59:59+0800",
    "PageSize": 20,
    "PageNumber": 1
  }'
```

#### 4. IP查询示例

```bash
curl -X POST "http://localhost:3000/service/IpCheck?ak=${AK}&t=${T}&token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "Ip": "183.204.220.83,36.41.170.150"
  }'
```

## 项目结构

```
cdn-api/
├── src/
│   ├── sdk.js           # Diansuyun SDK 实现
│   └── server.js        # API 适配器服务主文件
├── docs/
│   └── api.md           # 第三方 API 规范文档
├── test_api_adapter.js  # 测试套件
├── start_server.sh      # Linux/Mac 启动脚本
├── start_server.bat     # Windows 启动脚本
├── .env.example         # 环境变量配置示例
├── package.json         # 项目依赖配置
└── README.md            # 项目说明
```

## API 映射关系

| 第三方 API | 内部 API | 说明 |
|-----------|---------|------|
| /content/RefreshCaches | /V4/Web.Domain.DashBoard.saveCache | 刷新接口 |
| /content/PreloadCaches | /V4/Web.Domain.DashBoard.save.preheat.cache | 预热接口 |
| /content/GetRefreshOrPreloadTask | /V4/Web.Domain.DashBoard.cache.clean.list<br>/V4/Web.Domain.DashBoard.get.preheat.cache.list | 查询接口（合并两个接口结果） |
| /service/IpCheck | 无对应接口 | 模拟实现，需接入真实服务 |
| /cert/SetCertificate | /V4/Web.ca.text.save<br>/V4/Web.ca.batch.operat | 证书绑定/解绑 |
| /cert/GetCertificates | /V4/Web.Domain.Info<br>/V4/Web.ca.self.list | 证书查询 |

## 限制和注意事项

### 1. 刷新接口
- 内部API不支持正则刷新 (Regexes)，该类型请求会被忽略
- 提交后需要立即查询任务列表获取 TaskId，可能存在短暂延迟

### 2. 预热接口
- 同样需要通过查询任务列表获取 TaskId

### 3. 进度查询
- 内部API的任务列表不返回完整的URL信息
- 暂不支持按 TaskId 精确查询（会忽略该参数）
- 不支持按域名查询（DomainName 参数）

### 4. IP查询
- 当前为模拟实现
- 生产环境需要接入真实的IP归属查询服务
- README 中提到的内网服务: `http://192.168.200.31:60021/api/v1/dispatcher/dispatch.master.resource.list`

### 5. 证书操作
- 证书列表接口不返回完整的证书内容 (CertificateContent)
- 解绑操作假设使用 `type: 'unrelation'`，需确认内部API是否支持

### 6. 每日接口配额

根据文档要求，应实现以下配额限制（当前未实现）：
- 刷新：一百万/天
- 预热：一百万/天
- 进度查询：十万/天
- IP 归属查询：十万/天
- 证书绑定/解绑：一万/天
- 证书信息查询：一万/天

## 开发建议

### 添加速率限制

建议使用 `koa-ratelimit` 或类似中间件实现配额限制：

```bash
npm install koa-ratelimit
```

```javascript
const ratelimit = require('koa-ratelimit');
const Redis = require('ioredis');

// 为每个接口设置不同的限制
const db = new Redis();

app.use(ratelimit({
  driver: 'redis',
  db: db,
  duration: 86400000, // 24小时
  max: 1000000, // 一百万次
  id: (ctx) => ctx.query.ak // 使用 AK 作为限制标识
}));
```

### 接入真实IP查询服务

修改 `/service/IpCheck` 路由，接入内网IP查询服务：

```javascript
// 示例代码
const ipQueryUrl = 'http://192.168.200.31:60021/api/v1/dispatcher/dispatch.master.resource.list';
const response = await fetch(ipQueryUrl, {
  method: 'POST',
  headers: {
    'X-Ydauth-Admin-ID': '1',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ master_ip: ip })
});
```

### 日志记录

建议添加完整的日志记录：

```bash
npm install winston
```

### 监控和告警

建议添加：
- 请求成功率监控
- 响应时间监控
- 错误日志告警
- 配额使用情况监控

## 常见问题

### Q: 为什么鉴权总是失败？
A: 检查以下几点：
1. 确认设置了正确的 `THIRD_PARTY_AK` 和 `THIRD_PARTY_SK`
2. 确认时间戳 `t` 在10分钟有效期内
3. 确认 token 计算方式正确：`SHA1(ak + sk + t)`

### Q: 刷新/预热任务提交成功，但获取不到 TaskId？
A: 这是由于内部API的提交接口不直接返回TaskId，需要查询任务列表获取。如果出现延迟，请稍后使用进度查询接口查询。

### Q: 如何在开发环境中禁用鉴权？
A: 不设置 `THIRD_PARTY_AK` 和 `THIRD_PARTY_SK` 环境变量即可。

## 贡献者

- 初始开发：基于 Diansuyun SDK 和第三方 API 规范

## 许可证

根据项目需求设置

