# 第三方融合需求规范

## 更新记录

| 时间 | 更新内容 | 编辑人 |
| ---- | -------- | ------ |
|      |          |        |
|      |          |        |
|      |          |        |
|      |          |        |
|      |          |        |
|      |          |        |
|      |          |        |
|      |          |        |
|      |          |        |
|      |          |        |

## 一、API接口

### 1.1 鉴权说明

鉴权参数 `token = SHA1(${ak} + ${sk} + ${t})`，10 分钟内有效，其中：

- `ak`、`sk` 由金山云提供或者各厂商自行提供
- `t` 为秒级时间戳

调用接口时通过携带参数进行鉴权，如下：

```Plain
POST http://xxx.com/content/RefreshCaches?ak=123456789t&t=1783678290&token=xxx
```

对比 URL 中的 token 值与 SHA1 计算值是否相等，若相等则鉴权通过，否则失败。鉴权失败返回 401，鉴权成功且任务执行成功返 200，任务失败根据具体情况返回 4xx 或者 5xx。

**每日接口配额要求：**

- 刷新：一百万/天
- 预热：一百万/天
- 进度查询：十万/天
- IP 归属查询：十万/天
- 证书绑定/解绑：一万/天
- 证书信息查询：一万/天

### 1.2 刷新接口

```
content/RefreshCaches
```

#### 1.2.1 请求参数

| 参数名  | 必选 | 类型  | 说明                        |
| ------- | ---- | ----- | --------------------------- |
| Files   | 否   | Url[] | 需要文件类型刷新的 Url 列表 |
| Dirs    | 否   | Url[] | 需要目录类型刷新的 Url 列表 |
| Regexes | 否   | Url[] | 需要正则类型刷新的 Url 列表 |

**Url**

| 参数名 | 必选 | 类型   | 说明                         |
| ------ | ---- | ------ | ---------------------------- |
| Url    | 是   | String | 需要提交刷新的 Url，单条输入 |

#### 1.2.2 返回参数

| 参数名        | 类型   | 说明              |
| ------------- | ------ | ----------------- |
| RefreshTaskId | String | 刷新返回的任务 ID |

#### 1.2.3 示例

**请求示例 (POST 方式):**

```Plain
POST /content/RefreshCaches HTTP/1.1
Host: xxx.com
Content-Type: application/json
Accept: application/json

{
    "Files": [
        {
            "Url": "http://test.dxz.ksyun.8686c.com/abc.txt"
        },
        {
            "Url": "http://test.dxz.ksyun.8686c.com/test"
        }
    ],
    "Dirs": [
        {
            "Url": "http://test.dxz.ksyun.8686c.com/abc"
        },
        {
            "Url": "http://test.dxz.ksyun.8686c.com/def"
        }
    ],
    "Regexes": [
        {
            "Url": "http://test.dxz.ksyun.8686c.com/abc/.*.mp4"
        },
        {
            "Url": "http://test.dxz.ksyun.8686c.com/def/.*.png"
        }
    ]
}
```

**返回示例:**

```Plain
{
    "RefreshTaskId": "1e16f42c-e9fe-4d71-9dcc-4dd33b523a7c"
}
```

### 1.3 预热接口

```
content/PreloadCaches
```

#### 1.3.1 请求参数

| 参数名 | 必选 | 类型  | 说明                |
| ------ | ---- | ----- | ------------------- |
| Urls   | 是   | Url[] | 需要预热的 Url 列表 |

**Url**

| 参数名 | 必选 | 类型   | 说明                         |
| ------ | ---- | ------ | ---------------------------- |
| Url    | 是   | String | 需要提交预热的 Url，单条输入 |

#### 1.3.2 返回参数

| 参数名        | 类型   | 说明              |
| ------------- | ------ | ----------------- |
| PreloadTaskId | String | 预热返回的任务 ID |

#### 1.3.3 示例

**请求示例 (POST 方式):**

```Plain
POST /content/PreloadCaches HTTP/1.1
Host: xxx.com
Content-Type: application/json
Accept: application/json

{
    "Urls": [
        {
            "Url": "http://test1.ksyun.com/1.html"
        },
        {
            "Url": "http://test2.ksyun.com/2.html"
        }
    ]
}
```

**返回示例:**

```Plain
{
    "PreloadTaskId": "3e16f42c-e9fe-4d71-9dcc-4dd53b573a7c"
}
```

### 1.4 刷新/预热进度查询

```
content/GetRefreshOrPreloadTask
```

#### 1.4.1 请求参数

| 参数名     | 必选 | 类型及范围 | 说明                                                         |
| ---------- | ---- | ---------- | ------------------------------------------------------------ |
| StartTime  | 否   | String     | 获取数据起始时间点，日期格式按 ISO8601 表示法，北京时间，格式为：YYYY-MM-DDThh:mm+0800，例如：2016-08-01T21:14+0800 |
| EndTime    | 否   | String     | 结束时间需大于起始时间；获取日期格式按照 ISO8601 表示法，北京时间，格式为：YYYY-MM-DDThh:mm+0800，例如：2016-08-01T21:14+0800 |
| TaskId     | 否   | String     | 支持按任务 ID 查询，只允许输入单个任务 ID                    |
| DomainName | 否   | String     | 支持按域名查询，只允许输入单个域名                           |
| Urls       | 否   | Url[]      | Url 组成的数组，支持按 Url 路径查询，准确匹配                |
| PageSize   | 否   | Long       | 分页大小，取值为 1-50，最大 50，默认 20                      |
| PageNumber | 否   | Long       | 取得第几页，取值为：1-100000，最大 100000，默认 1            |

**Urls**

| 参数名 | 必选 | 类型   | 说明                |
| ------ | ---- | ------ | ------------------- |
| Url    | 是   | String | 需要查询的 Url 路径 |

#### 1.4.2 返回参数

| 参数名     | 类型及范围 | 说明                               |
| ---------- | ---------- | ---------------------------------- |
| StartTime  | String     | 开始时间                           |
| EndTime    | String     | 结束时间                           |
| Urls       | Url[]      | 查询的 URL 列表                    |
| PageSize   | Long       | 整页大小                           |
| PageNumber | Long       | 页码                               |
| TotalCount | Long       | Url 总条数                         |
| Datas      | UrlData[]  | 刷新或预热任务进度百分比及状态信息 |

**Datas**

| 参数名     | 类型   | 说明                                                         |
| ---------- | ------ | ------------------------------------------------------------ |
| Type       | String | 任务类别，取值为：refresh, 刷新任务；取值为：preload, 预热任务 |
| Url        | String | 刷新或预热的 Url 地址                                        |
| Progress   | Double | 刷新或预热任务进度百分比数值                                 |
| Status     | String | 刷新或预热状态信息，取值分别是 success(成功)、progressing(进行中)、failed(刷新失败) |
| TaskId     | String | 任务 ID，按照任务 ID 查询刷新或预热任务进度百分比及状态信息  |
| CreateTime | String | 任务创建时间                                                 |

#### 1.4.3 示例

**请求示例 (POST 方式):**

```Plain
POST /content/GetRefreshOrPreloadTask HTTP/1.1
Host: xxx.com
Content-Type: application/json
Accept: application/json

{
    "Urls": [
        {
            "Url": "[http://test1.ksyun.com/1.html](http://test1.ksyun.com/1.html)"
        },
        {
            "Url": "[http://test2.ksyun.com/1.html](http://test2.ksyun.com/1.html)"
        }
    ]
}
```

**返回示例:**

```Plain
{
    "StartTime": "2019-10-14T19:54+0800",
    "EndTime": "2019-10-21T19:54+0800",
    "Urls": [
        {
            "Url": "http://test1.ksyun.com/1.html"
        },
        {
            "Url": "http://test2.ksyun.com/1.html"
        }
    ],
    "PageSize": 20,
    "PageNumber": 1,
    "TotalCount": 2,
    "Datas": [
        {
            "Type": "preload",
            "Url": "http://test1.ksyun.com/1.html",
            "Progress": 100.0,
            "Status": "failed",
            "TaskId": "4c48efa2ba244266a73cdd438ad7b764",
            "CreateTime": "2019-10-21T16:55+0800"
        },
        {
            "Type": "preload",
            "Url": "http://test1.ksyun.com/1.html",
            "Progress": 100.0,
            "Status": "failed",
            "TaskId": "4c48efa2ba244266a73cdd438ad7b764",
            "CreateTime": "2019-10-21T16:55+0800"
        }
    ]
}
```

### 1.5 IP 归属查询接口

```
service/IpCheck
```

#### 1.5.1 请求参数

| 参数名 | 必选 | 类型及范围 | 说明                                 |
| ------ | ---- | ---------- | ------------------------------------ |
| Ip     | 是   | String     | 指定的 IP，需支持批量 IP，用逗号隔开 |

#### 1.5.2 返回参数

| 参数名 | 类型及范围 | 说明    |
| ------ | ---------- | ------- |
| result | result[]   | Ip 列表 |

**result**

| 参数名   | 类型及范围 | 说明                                                  |
| -------- | ---------- | ----------------------------------------------------- |
| CdnIp    | String     | 是否为 CDNIP，如果是，则为 true；如果不是，则为 false |
| Isp      | String     | 运营商                                                |
| Ip       | String     | 查询 IP                                               |
| Region   | String     | 区域                                                  |
| Province | String     | 省份                                                  |
| City     | String     | 城市                                                  |

#### 1.5.3 示例

**请求示例:**

```Plain
POST /service/IpCheck HTTP/1.1
Host: xxx.com
Content-Type: application/json

{"Ip": "36.41.170.150,1.1.1.1"}
```

**返回示例:**

```Plain
{
    "result": [
        {
            "Isp": "电信",
            "Ip": "36.41.170.150",
            "Region": "中国大陆",
            "City": "西安市",
            "CdnIp": "true",
            "Province": "陕西省"
        },
        {
            "Ip": "1.1.1.1",
            "CdnIp": "false"
        }
    ]
}
```

### 1.6 证书绑定/解绑

```
cert/SetCertificate
```

用于对客户加速域名绑定或解绑证书。

#### 1.6.1 请求参数

| 参数名            | 必选 | 类型及范围 | 说明                                                         |
| ----------------- | ---- | ---------- | ------------------------------------------------------------ |
| Domains           | 是   | String     | 需要配置的域名，可以输入多个域名，用逗号隔开                 |
| ServerCertificate | 否   | String     | 域名对应的安全证书内容。当 Action 为 unbind 时，不传证书内容 |
| PrivateKey        | 否   | String     | 安全证书对应的私钥内容。为保障客户数据安全，注意该接口必须使用 https 连接。当 Action 为 unbind 时，不传证书私钥 |
| Action            | 是   | String     | 操作行为，包含 2 种：bind: 表示绑定；unbind: 表示解绑        |

#### 1.6.2 返回参数

| 参数名    | 类型及范围 | 说明                                                         |
| --------- | ---------- | ------------------------------------------------------------ |
| RequestId | String     | 请求对应的唯一 ID，供应商需根据该 ID 定位到具体请求，以便双方排查问题 |
| error     | String     | 错误信息                                                     |

#### 1.6.3 示例

**请求示例 (增绑):**

```Plain
POST /cert/SetCertificate HTTP/1.1
Host: xxx.com
Content-Type: application/json

{
    "Domains": "www.test.com",
    "ServerCertificate": "-----BEGIN CERTIFICATE-----\nMIIGIjCCBQqgAwIBAgISBEdGSJNXMIts8Hy1Ksjzk6/bMA0GCSqGSIb3DQEBCwUAMDIxCzAJBgNV\nBAYTA1VTMRYWFAYDVQQKEw1MZXQncyBFbmNyeXB0MQswCQYDVQQDEwJSMzAeFw0yMjA4MTYwNTIz\nMDdaFw0yMjExMTQwNTIzMDZaMBkxFzAVBgNVBAMMDioua3NjLXRlc3QuY29tMIICIjANBgkqhkiG\n9w0BAQEFAAOCAg8AMIICCgKCAgEAxWhEHJC1Hs21QNk9a1GFBWvjY3XgBXmcJEtD9mGbqboV\nCJ5B\n6z350tMcc9aN0WpP2aJCxWhpIWXf3U5ISVIAbAVzVq18hH18uquCFyU5BxAQg0vVxLY2\nf8AR8+tZ\nFe5KBQZXC1wNo2Wmqq6Ddy2ssG4bx178iDLj70KjsV3yBGBY1uECT0bEmsKcvvms\nv510Nj8fuo3v\nas6NvETZZVeTwytthxs1100uyomR5blT0dLqA70G0y473Uu8QMtmC4qfxKK7\nfxTzRC30LzCMdPY+\nu+8iZZMYF+67pv/RPrAzyq13oAr6nE0kygGBvHzH2a03dF1xhn71\npVgz40DiwrswBUIkMAgqa+1e\nmAo0ofBr20SUs2I3qxchhS2mKuiWEXUd8ePbEhi/LS1f\nXfuzqvid6bbhcNxlLStsMNnRY0jEtKkj\nbfsTG1ILkYalMg1FKGEp1gRaJqErxSDAqKTm\n7eEFOVkKYalRn9APa6nr0ed3BqozIMbMkfHu2ciU\n0DB9rPW40taYIwi9UFTu4z9bSoEU\n0601S3V3nN5jgD8EP+o9sBsMcZzPiNZE1pCawjFq/Y1EmrAd\nF22axewNyOc/tJVcykji\nonpLQvjejW4W/SdzyNWchsYzkUMn4sQiBtFXu0sIVprR7GEc7M2H6fnn\n84xYkIEmtCs+\nmbuHiV7Ke4/1w0cCAwEAAaOCAkkwggJFMA4GA1UdDwEB/wQEAwIFODAdBgNVHSUE\nFjAUBggrBgEFBQcDAQYIKwYBBQUHAwIwDAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQUbd8T\nwudv01E3\niKjVzISGQ1tu0+4wHwYDVR0jBBgwFoAUFC6zF7dYVsuuUA1A5h+vnYsU\nwsYwVQYIKwYBBQUHAQEE\nSTBHMCEGCCsGAQUFBzABhhVodHRwOi8vcjMuby5sZW5j\nci5vcmcwIgYIKwYBBQUHMAKGFmh0dHA6\nLy9yMy5pLmx1bmNyLm9yZy8wGQYDVR0R\nBBIWEIIOKi5rc2MtdGVzdC5jb20wTAYDVR0gBEUwQzAI\nBgZngQwBAgEwNwYLKwYB\nBAGC3xMBAQEwKDAmBggrBgEFBQcCCARYaHR0cDovL2Nwcy5sZXRzZW5j\ncnlwdC5v\ncmcwggEEBgorBgEEAdZ5AgQCBIH1BIIB2AA8AHYAb1N2rDHwMRnZmkApFEV/3cVHB\nHZAsE\nACkGjbIImjfZEwAAAYK1UfH+AAAEAwBHMEUCIHo84Lap5N3Q8W7nDUNsEkmk\nSbi09vcmBhFUUKeM\n6zIXAiEA7jkRgwVvnLpT9B7yWSz54sPudECF1YDX7cY05EDK\n570AdgBGpVXrdfqRIDC100l1p9PN9\nESxBdL79SbiFq/L8CP5tRwAAAYK1UfHYAAAE\nAwBHMEUCIQDbevD1CCgTSYMJ4xx/P1RzYAgU2z9P\nikSTvsvwbzcDFAIgES+/KRLA\nIhp1dwVW+6r9tram8HIS1j2qVpnpJ4H31WIwDQYJKoZIhvcNAQEL\nBQADggEBAHFH\nMvC+kVBg87kM8ynbaD0twrNS41p0ssUYF0/HVp93s0eh89pLsaU0iLjOzpzWOMRJ\nfi7U\ne8xKU9/hsQHqL+cpVP6uxAai+1hi3qQhvoT6Corqc8AUy0d83vv6XoMgq2zuNTFN\niRdI6h1b\nAMHVZaIhEkfxcJgmV2194gLynw8+0+8fU2VyqdFRLX2SBsBFjjfOnIZy\nE6AvHMk+bVg2FnvwPzNk\n6ACeg4xHxAvwjsxzMWCKXmcHcLqHQ1sEKccRvD2jSZbe\n5dSieIByjnu4z0+JMs2hKXI912oIBx6N\n1cptN6pRM/x964FbEWjAmUN3JqFAOQRI\n+jzimNn1kQt0pLo=\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nMIIEZTCCAO2gAwIBAgIQQAF1BIMUpMghjISpDBbN3zANBgkqhkiG9w0BAQsFADA/MSQw\nIgYDVQQK\nExtEaWdpdGFsIFNpZ25hdHVyZSBUcnVzdCBDby4xFzAVBgNVBAMTDKRT\nVCBSb290IENBIFgzMB4X\nDTIwMTAwNzE9MjE0MFoXDTIxMDkyOTE5MjE0MFowMjEL\nMAkGA1UEBhMCVVMxFjAUBgNV\nBAoTDUxldCdzIEVuY3J5cHQxCzAJBgNVBAMTAlIz\nMIIBIjANBgkqhkiG9w0BAQEFAAOC\nAQ8AMIIBCgKCAQEAuwiVKMz2oJTTDxLsjVWSw/iC8ZmmekKIp10mqrUrucVMsa+0a/11\nyKPXD0eUFFU1V4yeqKI5GfWC\nPEKpTm7108Mu243AsFzzWTjn7c9p8FoLG77A1CQ1\nh/o3cbMT5xys4Zvv2+Q7RVJF1qnBU840yFLu\nta7tj95gc0K1VKu2bQ6XpUA0ayvT\nvGbrZjR8+muLj1cpmfgwF126cm/7gcWt0oZYPRfH5wm78Sv3\nhtzB2nFd1EbjzK0l\nwYi8YGd1ZrPxGPeiXOZT/zqItkel/xMY6pgJdz+dU/nPAeX1pnAXFK9jpP+Z\ns50d\n3F0nBv5IhR2haa41dbsTzFID9e1RoYvbFQIDAQAB04IBaDCCAWQwEgYDVR0TAQH/\nBAgwBgEB\n/wIBADAOBgNVHQ8BAf8EBAMCAYYwSwYIKwYBBQUHAQEEPzA9MDsG\nCCsGAQUFBzAChi9odHRwOi8v\nYXBwcy5pZGVudHJ1c3QuY29tL3Jvb3RzL2RzdHJv\nb3RjYXgzLnA3YzAfBgNVHSMEGDAWgBTEp7Gk\neyxx+tvhS5B1/8QVYIWJEDBUBgNV\nHSAETTBLMAgGBmeBDAECATA/BgsrBgEEAYLfEwEBATAwMC4G\nCCsGAQUFBwIBFiJo\ndHRwOi8vY3BzLnJvb3QteDEubGV0c2VuY3J5cHQub3JnMDwGA1Ud\nHwQ1MDMw\nMaAvoC2GK2h0dHA6Ly9jcmwuaWRlbnRydXN0LmNvbS9EU1RST09UQ0FY\nM0NSTC5jcmwwHQYDVR0O\nBBYEFBQusxe3WFbLr1AJQOYfr52LFMLGMB0GA1UdJQQW\nMBQGCCsGAQUFBwMBBggrBgEFBQcDAjAN\nBgkqhkiG9w0BAQsFAAOCAQEA2UzgyfWE\niDcx27sT4rP8i2tiEmxYt01+PAK3qB8oYev04C5z70kH\nejWEHx2taPDY/laBL21/\nWKZuNTYQHHPD5b1tXgHX\nbnL7KqC401dk5VvCadTQsvd8S8MXjohyc9z9\n/G2948kL\njmE6F1h9dDYrVYA9x20+hEPGOaE0a1eePynBgPayvUfLqjBstzLhWVQLGAkXXmNs\n+5Zn\nPBxzDJOLxhF2JIbeQAcH5H0tZrUlo5ZYy0qA7s9p05b8503AM/OJ+CktFBQt\nfvBhcJVd9wv1wPsk\n+uy0y2HI7mNxKKgsBTt375teA2TwUdHkhVNcsAKX1H7GNNL\nOEADksd86wuoXvg==\n-----END CERTIFICATE-----",
    "PrivateKey": "...",
    "Action": "bind"
}
```

**请求示例 (解绑):**

```Plain
POST /cert/SetCertificate HTTP/1.1
Host: xxx.com
Content-Type: application/json

{
    "Domains": "www.test.com",
    "Action": "unbind"
}
```

**返回示例:**

```Plain
{
    "RequestId": "4c48efa2ba244266a73cdd438ad7b764"
}
```

### 1.7 证书信息查询

```
cert/GetCertificates
```

用于查询域名绑定的证书内容，以核实是否与客户最新提交证书一致。

#### 1.7.1 请求参数

| 参数名 | 必选 | 类型及范围 | 说明           |
| ------ | ---- | ---------- | -------------- |
| Domain | 是   | String     | 需要查询的域名 |

#### 1.7.2 返回参数

| 参数名             | 类型及范围 | 说明                                                         |
| ------------------ | ---------- | ------------------------------------------------------------ |
| IssueDomain        | String     | CA 颁发时证书绑定的域名                                      |
| IssueTime          | String     | 证书颁发时间                                                 |
| ExpirationTime     | String     | 证书过期时间                                                 |
| CertificateContent | String     | 证书内容，PEM 格式                                           |
| CertificateType    | String     | 证书类型，分别是 EV、DV、OV                                  |
| ConfigDomainNames  | String     | 证书已绑定域名，如该证书绑定了多个域名，域名之间用半角英文逗号“,”相隔 |

#### 1.7.3 示例

**请求示例:**

```Plain
POST /cert/GetCertificate HTTP/1.1
Host: xxx.com
Content-Type: application/json

{
    "Domain": "www.test.com"
}
```

**返回示例:**

```Plain
{
    "IssueDomain": "*.test.com",
    "IssueTime": "1533547545",
    "ExpirationTime": "1536139545",
    "CertificateContent": "-----BEGIN CERTIFICATE-----\n...",
    "CertificateType": "DV",
    "ConfigDomainNames": "[www.test.com](https://www.test.com)"
}
```

