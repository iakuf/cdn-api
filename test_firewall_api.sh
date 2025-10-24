#!/bin/bash

# 测试 firewall.policy.save API

# 注意：这个脚本需要手动计算签名，这里只是展示请求结构

curl -X POST "http://apiv4.diansuyun.com/V4/firewall.policy.save" \
  -H "Content-Type: application/json" \
  -H "X-Auth-App-Id: 9JLZCITlaE61511PGx7r" \
  -d '{
    "domain_id": 89,
    "from": "diy",
    "remark": "测试封禁",
    "type": "cdn",
    "action": "block",
    "action_data": {
        "time_unit": "hour",
        "interval": 10
    },
    "rules": [
        {
            "rule_type": "url",
            "logic": "equals",
            "data": ["/index.html"]
        }
    ]
}'

