import sdk from './src/sdk.js';

const sdkObj = new sdk(
    '9JLZCITlaE61511PGx7r',
    'EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b',
    'http://apiv4.diansuyun.com/V4/',
    { debug: true }
);

// 查询防火墙策略列表 - 测试是否有权限
const api = 'firewall.policy.list'; // 尝试查询接口
try {
    const reqParams = {
        query: {
            "domain_id": "89",
            "page": "1",
            "per_page": "20"
        }
    };

    console.log(`\n调用 API: ${api}...`);
    console.log(`查询域名ID: ${reqParams.query.domain_id}`);
    
    const resp = await sdkObj.get(api, reqParams);

    if (resp.bizCode === 1) {
        console.log(`\n${api} - 业务处理成功`);
        console.log(`  http_code: ${resp.httpCode}`);
        console.log(`  策略列表:`, JSON.stringify(resp.bizData, null, 2));
    } else {
        console.log(`\n${api} - 业务处理失败: ${resp.bizMsg}`);
        console.log(`  http_code: ${resp.httpCode}`);
        console.log(`  错误码: ${resp.bizCode}`);
    }

} catch (err) {
    console.error(`\nAPI '${api}' 调用失败:`, err.message);
}

