import sdk from './src/sdk.js';

const sdkObj = new sdk(
    '9JLZCITlaE61511PGx7r',
    'EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b',
    'http://apiv4.diansuyun.com/V4/',
    { debug: true }
);

// 封禁指定URL
const api = 'firewall.policy.save'; // 接口地址
try {
    const reqParams = {
        data: {
            domain_id: 89,
            from: "diy",
            type: "cdn",  // 策略类型：必需参数
            remark: "封禁 /index.html",
            action: "block",
            action_data: {
                time_unit: "hour",
                interval: 10
            },
            rules: [
                {
                    rule_type: "url",
                    logic: "equals",
                    data: ["/index.html"]
                }
            ]
        }
    };
    
    console.log(`\n调用 API: ${api}...`);
    console.log(`域名ID: ${reqParams.data.domain_id}`);
    console.log(`封禁URL: http://cdn.listlive.cn${reqParams.data.rules[0].data[0]}`);
    console.log(`封禁时长: ${reqParams.data.action_data.interval}${reqParams.data.action_data.time_unit}`);
    
    const resp = await sdkObj.post(api, reqParams);

    if (resp.bizCode === 1) {
        console.log(`\n${api} - 业务处理成功`);
        console.log(`  http_code: ${resp.httpCode}`);
        console.log(`  策略ID: ${resp.bizData?.id}`);
        console.log(`  消息: ${resp.bizMsg}`);
        console.log(`\n封禁策略已成功创建！`);
    } else {
        // 业务失败，打印失败信息
        console.log(`\n${api} - 业务处理失败: ${resp.bizMsg}`);
        console.log(`  http_code: ${resp.httpCode}`);
        if (resp.bizData) {
            console.log(`  详细信息:`, resp.bizData);
        }
    }

} catch (err) {
    // 网络请求或SDK内部错误
    console.error(`\nAPI '${api}' 调用失败:`, err.message);
    console.error(`错误详情:`, err);
}

/* 响应示例
[DEBUG] Response: {
  httpCode: 200,
  respBody: '{"status":{"code":1,"message":"操作成功"},"data":{"id":"31"}}',
  bizCode: 1,
  bizMsg: '操作成功',
  bizData: { id: '31' }
}

*/