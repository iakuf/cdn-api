## 概述

本文档提供了对CDN域名CA证书管理相关API的详细说明，旨在帮助开发人员理解和使用这些接口。所有接口的基地址为 `https://apiv4.diansuyun.com`。

1. ## 证书管理

### 1.1 申购证书

为指定的域名申请一个新的CA证书。

- **`POST`** `/V4/Web.ca.apply.add`

#### 请求参数

| 字段   | 类型     | 必填 | 描述                     |
| ------ | -------- | ---- | ------------------------ |
| domain | string[] | 是   | 需要申请证书的域名数组。 |

#### 请求示例

```Plain
{
    "domain": [
        "test0318.lvluoyun.com"
    ]
}
```

#### 响应说明

**请求成功 (200)**

返回新证书的ID与域名、ID与名称的键值对映射。

| 字段               | 类型   | 描述                                        |
| ------------------ | ------ | ------------------------------------------- |
| status.code        | Number | 业务状态码，1 表示成功，非 1 表示失败。     |
| status.message     | String | 业务状态信息。                              |
| data.ca_id_domains | Object | 证书包含的域名，键值对结构为 证书ID: 域名。 |
| data.ca_id_names   | Object | 证书的名称，键值对结构为 证书ID: 证书名称。 |

**成功响应示例**

```Plain
{
    "status": {
        "code": 1,
        "message": "操作成功"
    },
    "data": {
        "ca_id_domains": {
            "430977": "test0318.lvluoyun.com"
        },
        "ca_id_names": {
            "430977": "test0318.lvluoyun.com-Let's Encrypt"
        }
    }
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

### 1.2 上传自有证书（`Web.ca.self.add`）

通过文件上传的方式添加一个已有的域名证书。此接口仅适用于CDN套餐。

- **`POST`** `/V4/Web.ca.self.add`

#### 请求参数

| 字段         | 类型   | 必填 | 描述               |
| ------------ | ------ | ---- | ------------------ |
| ca_name      | String | 是   | 证书的自定义名称。 |
| ca_crt       | File   | 是   | 证书的公钥文件。   |
| ca_key       | File   | 是   | 证书的私钥文件。   |
| product_flag | String | 否   | 产品标识。         |

#### 请求示例 (控制台)

```Plain
{
    "ca_name": "ca001",
    "ca_crt": "(file_content)",
    "ca_key": "(file_content)"
}
```

#### 响应说明

**请求成功 (200)**

返回新上传证书的ID和证书编号。

| 字段                      | 类型   | 描述                                    |
| ------------------------- | ------ | --------------------------------------- |
| status.code               | Number | 业务状态码，1 表示成功，非 1 表示失败。 |
| status.message            | String | 业务状态信息。                          |
| [data.id](http://data.id) | String | 证书ID。                                |
| data.ca_sn                | String | 证书编号。                              |

**成功响应示例**

```Plain
{
     "status": {
          "code"     : 1,
          "message"  : "操作成功",
          "create_at": "2017-01-12 13:50:50"
     },
     "data": {
         "id": "16",
         "ca_sn": "ssldshUz9"
     }
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

### 1.3 新增/编辑证书 (文本内容)

通过提交文本内容的方式新增或编辑一个证书。当 `id` 字段不传时为新增操作，传入时为编辑操作。

- **`POST`** `/V4/Web.ca.text.save`

#### 请求参数

| 字段         | 类型   | 必填 | 描述                             |
| ------------ | ------ | ---- | -------------------------------- |
| id           | Number | 否   | 证书ID。不传此参数则为新增证书。 |
| ca_name      | String | 是   | 证书的自定义名称。               |
| ca_cert      | String | 是   | 证书的公钥内容 (PEM格式)。       |
| ca_key       | String | 是   | 证书的私钥内容 (PEM格式)。       |
| product_flag | String | 否   | 产品标识。                       |

#### 请求示例

```Plain
{
    "id": 11,
    "ca_name": "ca002",
    "ca_cert": "-----BEGIN CERTIFICATE-----\nMIIFnDCCBISWR1xzhs4YY\n-----END CERTIFICATE-----",
    "ca_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA8pe2L1RRe8JfdnsJiUUmOgtJA==\n-----END RSA PRIVATE KEY-----"
}
```

#### 响应说明

**请求成功 (200)**

返回操作证书的ID和证书编号。

| 字段                      | 类型   | 描述                                    |
| ------------------------- | ------ | --------------------------------------- |
| status.code               | Number | 业务状态码，1 表示成功，非 1 表示失败。 |
| status.message            | String | 业务状态信息。                          |
| [data.id](http://data.id) | String | 证书ID。                                |
| data.ca_sn                | String | 证书编号。                              |

**成功响应示例**

```Plain
{
     "status": {
          "code"     : 1,
          "message"  : "操作成功",
          "create_at": "2019-11-08 09:41:35"
     },
     "data": {
         "id": "11",
         "ca_sn": "ca001"
     }
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

### 1.4 编辑证书 (文件)

**注意：** 此接口与 1.3 功能相似，但接受文件上传。为避免混淆，建议统一使用 1.3 接口通过文本内容进行编辑。

- **`POST`** `/V4/``Web.ca.info``.edit`

#### 请求参数

| 字段         | 类型   | 必填 | 描述               |
| ------------ | ------ | ---- | ------------------ |
| id           | Number | 是   | 要编辑的证书ID。   |
| ca_name      | String | 是   | 证书的新名称。     |
| ca_cert      | File   | 是   | 新的证书公钥文件。 |
| ca_key       | File   | 是   | 新的证书私钥文件。 |
| product_flag | String | 否   | 产品标识。         |

#### 请求示例

```Plain
{
    "id": 11,
    "ca_name": "ca002",
    "ca_cert": "(file_content)",
    "ca_key": "(file_content)"
}
```

#### 响应说明

**请求成功 (200)**

返回被编辑证书的ID和编号。

| 字段                      | 类型   | 描述                                    |
| ------------------------- | ------ | --------------------------------------- |
| status.code               | Number | 业务状态码，1 表示成功，非 1 表示失败。 |
| status.message            | String | 业务状态信息。                          |
| [data.id](http://data.id) | Number | 证书ID。                                |
| data.ca_sn                | String | 证书编号。                              |

**成功响应示例**

```Plain
{
     "status": {
          "code"     : 1,
          "message"  : "操作成功",
          "create_at": "2019-11-08 09:41:35"
     },
     "data": {
         "id": 11,
         "ca_sn": "ca001"
     }
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

### 1.5 删除证书

根据证书ID批量删除一个或多个证书。

- **`DELETE`** `/V4/Web.ca.self.del`

#### 请求参数

| 字段         | 类型   | 必填 | 描述                                 |
| ------------ | ------ | ---- | ------------------------------------ |
| ids          | String | 是   | 证书ID字符串，多个ID之间用逗号分隔。 |
| product_flag | String | 否   | 产品标识。                           |

#### 请求示例

```Plain
{
    "ids": "1,2,3,4"
}
```

#### 响应说明

**请求成功 (200)**

| 字段                          | 类型   | 描述                                    |
| ----------------------------- | ------ | --------------------------------------- |
| status.code                   | Number | 业务状态码，1 表示成功，非 1 表示失败。 |
| status.message                | String | 业务状态信息。                          |
| [data.info](http://data.info) | String | 操作结果的描述信息。                    |

**成功响应示例**

```Plain
{
    "status": {
        "code": 1,
        "message": "操作成功"
    },
    "data": {
        "info": "删除自有证书成功"
    }
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

### 1.6 修改证书名称

修改指定ID证书的名称。

- **`POST`** `/V4/Web.ca.self.editcaname`

#### 请求参数

| 字段         | 类型   | 必填 | 描述           |
| ------------ | ------ | ---- | -------------- |
| id           | Number | 是   | 证书ID。       |
| ca_name      | String | 是   | 新的证书名称。 |
| product_flag | String | 否   | 产品标识。     |

#### 请求示例

```Plain
{
    "id": 11,
    "ca_name": "ca002"
}
```

#### 响应说明

**请求成功 (200)**

| 字段                          | 类型   | 描述                                    |
| ----------------------------- | ------ | --------------------------------------- |
| status.code                   | Number | 业务状态码，1 表示成功，非 1 表示失败。 |
| status.message                | String | 业务状态信息。                          |
| [data.info](http://data.info) | String | 操作结果的描述信息。                    |

**成功响应示例**

```Plain
{
    "status": {
        "code": 1,
        "message": "操作成功"
    },
    "data": {
        "info": "修改自有证书名称成功"
    }
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

1. 证书查询

### 2.1 查询证书详情

根据证书ID获取单个证书的详细信息。

- **`GET`** `/V4/Web.ca.self`

#### 查询参数

| 字段 | 类型   | 必填 | 描述     |
| ---- | ------ | ---- | -------- |
| id   | Number | 是   | 证书ID。 |

#### 请求示例

```
/V4/Web.ca.self?id=1
```

#### 响应说明

**请求成功 (200)**

返回证书的完整信息。

| 字段                         | 类型     | 描述                                                 |
| ---------------------------- | -------- | ---------------------------------------------------- |
| [data.id](http://data.id)    | String   | 证书ID                                               |
| data.ca_name                 | String   | 证书名称                                             |
| data.issuer                  | String   | 颁发机构                                             |
| data.issuer_start_time       | String   | 颁发开始时间                                         |
| data.issuer_expiry_time      | String   | 颁发结束时间                                         |
| data.issuer_expiry_time_desc | String   | 颁发结束时间描述 (例如: "已到期")                    |
| data.binded                  | Boolean  | 绑定状态: true-已绑定，false-未绑定                  |
| data.ca_domain               | String[] | 证书内包含的域名                                     |
| data.apply_status            | String   | 申请状态: 1-申请中, 2-已颁发, 3-审核失败, 4-上传托管 |
| data.ca_type                 | String   | 证书类型: 1-上传, 2-lets申购                         |
| data.ca_type_domain          | String   | 证书域名类型: 1-单域名, 2-多域名, 3-泛域名           |
| data.created_at              | String   | 创建时间                                             |
| data.updated_at              | String   | 更新时间                                             |
| ...                          | ...      | 其他详细字段                                         |

**成功响应示例**

```Plain
{
    "status": {
        "code": 1,
        "message": "操作成功"
    },
    "data": {
        "id": "55",
        "ca_id": "55",
        "member_id": "24",
        "ca_name": "test",
        "issuer": "Let's Encrypt",
        "issuer_start_time": "2022-09-19 12:52:17",
        "issuer_expiry_time": "2022-12-18 12:52:16",
        "issuer_expiry_time_desc": "已到期",
        "issuer_expiry_time_auto_renew_status": 0,
        "renew_status": "1",
        "binded": true,
        "ca_domain": [
            "*.xujianing.top"
        ],
        "apply_status": "4",
        "ca_type": "1",
        "ca_type_domain": "1",
        "code": "1",
        "msg": "",
        "created_at": "2022-12-19 16:16:53",
        "updated_at": "2023-06-01 17:14:12",
        "issuer_organization": "Let's Encrypt",
        "serial_number": "353969913270273855561671899933126828869328",
        "issuer_object": "*.xujianing.top",
        "country": "中国",
        "authentication_usable_domain": "[\"*.xujianing.top\"]"
    }
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

### 2.2 查询证书列表

根据筛选条件分页查询证书列表。

- **`GET`** `/V4/Web.ca.self.list`

#### 查询参数

| 字段            | 类型   | 必填 | 描述                                                         |
| --------------- | ------ | ---- | ------------------------------------------------------------ |
| page            | Number | 否   | 当前页码。                                                   |
| per_page        | Number | 否   | 每页记录数，默认 20。                                        |
| domain          | String | 否   | 按域名搜索。                                                 |
| ca_name         | String | 否   | 按证书名称搜索。                                             |
| binded          | String | 否   | 绑定状态：true-已绑定, false-未绑定。                        |
| apply_status    | String | 否   | 申购状态：1-申请中, 2-已颁发, 3-审核失败, 4-上传托管。       |
| issuer          | String | 否   | 颁发机构。                                                   |
| expiry_time     | String | 否   | 是否到期：true-已到期, false-未到期, inno-即将到期(30天内)。 |
| is_exact_search | String | 否   | 是否精准搜索：on-是, off-否 (默认)。                         |
| product_flag    | String | 否   | 产品标识。                                                   |

#### 请求示例

```
/V4/Web.ca.self.list?domain=www.local.com&page=1&per_page=10
```

#### 响应说明

**请求成功 (200)**

返回证书列表、总数以及可用的颁发机构列表。

| 字段             | 类型     | 描述                                             |
| ---------------- | -------- | ------------------------------------------------ |
| data.total       | Number   | 符合条件的总记录数。                             |
| data.list        | Array    | 证书对象数组，对象结构同 2.1 查询证书详情。      |
| data.issuer_list | String[] | 当前系统所有证书的颁发机构列表，可用于前端筛选。 |

**成功响应示例**

```Plain
{
    "status": {
        "code": 1,
        "message": "操作成功"
    },
    "data": {
        "total": "1",
        "list": [
            {
                "id": "4",
                "member_id": "4",
                "ca_name": "local.com-Let‘s Encrypt-413164",
                "issuer": "Let's Encrypt",
                "issuer_start_time": "-",
                "issuer_expiry_time": "-",
                "issuer_expiry_time_desc": "-",
                "issuer_expiry_time_auto_renew_status": 0,
                "renew_status": "1",
                "binded": false,
                "ca_domain": [
                    "local.com"
                ],
                "apply_status": "3",
                "ca_type": "2",
                "ca_type_domain": "1",
                "code": "661005",
                "msg": "操作失败:本次申购HTTP验证失败"
            }
        ],
        "issuer_list": [
            "Let's Encrypt",
            "TrustAsia Technologies, Inc."
        ]
    }
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

### 2.3 查询域名关联的证书列表

根据域名列表批量查询它们所关联的证书信息。

- **`POST`** `/V4/Web.Domain.batch.ca.list`

#### 请求参数

| 字段    | 类型     | 必填 | 描述                 |
| ------- | -------- | ---- | -------------------- |
| domains | String[] | 是   | 需要查询的域名列表。 |

#### 请求示例

```Plain
{
    "domains": [
        "www.7xinxian.cn",
        "7xinxian.cn"
    ]
}
```

#### 响应说明

**请求成功 (200)**

返回一个包含证书基本信息的对象数组。

| 字段               | 类型   | 描述         |
| ------------------ | ------ | ------------ |
| id                 | String | 证书ID       |
| member_id          | String | 用户ID       |
| ca_sn              | String | 证书序列号   |
| ca_name            | String | 证书名称     |
| issuer_start_time  | String | 证书开始时间 |
| issuer_expiry_time | String | 证书过期时间 |

**成功响应示例**

```Plain
{
    "status": {
        "code": 1,
        "message": "操作成功"
    },
    "data": [
        {
            "id": "180",
            "member_id": "27541",
            "ca_sn": "ssl3TOpAG",
            "ca_name": "www4duucom59e71f031edb5",
            "issuer_start_time": "2017-10-16 00:00:00",
            "issuer_expiry_time": "2027-10-14 00:00:00"
        }
    ]
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

1. 批量操作

### 3.1 批量将证书绑定到域名

将一个或多个证书批量与其包含的域名进行关联操作。

- **`POST`** `/V4/Web.ca.batch.operat`

#### 请求参数

| 字段         | 类型     | 必填 | 描述                                      |
| ------------ | -------- | ---- | ----------------------------------------- |
| id           | Number[] | 是   | 需要操作的证书ID数组。                    |
| type         | String   | 是   | 操作类型，目前固定为 relation。           |
| is_confirm   | Number   | 否   | 是否再次检查证书到期: 0-否, 1-是 (默认)。 |
| del_id       | String[] | 否   | 需要从本次操作中剔除的证书ID数组。        |
| product_flag | String   | 否   | 产品标识。                                |

#### 请求示例

```Plain
{
    "id": [
        11,
        22
    ],
    "type": "relation"
}
```

#### 响应说明

**请求成功 (200)**

返回批量操作的统计结果。

| 字段            | 类型   | 描述                                           |
| --------------- | ------ | ---------------------------------------------- |
| data.total      | Number | 操作的证书总数。                               |
| data.fail_total | Number | 操作失败的证书个数。                           |
| data.fail_list  | Array  | 操作失败的证书列表。                           |
| data.remark     | String | 操作结果备注信息，可能包含成功个数或失败原因。 |

**成功响应示例**

```Plain
{
    "status": {
        "code": 1,
        "message": "操作成功"
    },
    "data": {
        "total": 1,
        "fail_total": 1,
        "fail_list": [],
        "remark": "证书到期或证书未绑定域名！"
    }
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```

### 3.2 导出证书

根据证书ID批量导出证书文件，并返回文件的下载链接。

- **`GET`** `/V4/Web.ca.self.export`

#### 查询参数

| 字段         | 类型           | 必填 | 描述                                         |
| ------------ | -------------- | ---- | -------------------------------------------- |
| id           | String / Array | 是   | 证书ID，可以是单个ID字符串，也可以是ID数组。 |
| product_flag | String         | 否   | 产品标识。                                   |

#### 请求示例

```
/V4/Web.ca.self.export?id[]=11&id[]=22
```

#### 响应说明

**请求成功 (200)**

返回一个包含文件信息的对象数组，每个对象对应一个打包的zip文件。

| 字段     | 类型   | 描述                                |
| -------- | ------ | ----------------------------------- |
| hash     | String | 文件的hash值。                      |
| key      | String | 文件访问的key，等同于真实访问地址。 |
| real_url | String | 真实文件下载地址。                  |

**成功响应示例**

```Plain
{
    "status": {
        "code": 1,
        "message": "操作成功"
    },
    "data": [
        {
            "hash": "a54b5eef3xxxxxxxxxxxxxx800ce6",
            "key": "http://static.local.com/ssl_files20220810114xxxx0503b21.zip",
            "real_url": "http://static.local.com/ssl_files2022081011461316601ffffffffff03b21.zip"
        }
    ]
}
```

**失败响应示例**

```Plain
{
    "status": {
        "code": 0,
        "message": "操作失败"
    },
    "data": {}
}
```