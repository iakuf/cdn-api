import sdk from './src/sdk.js';



const sdkObj = new sdk(
    '9JLZCITlaE61511PGx7r',
    'EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b',
    'http://apiv4.diansuyun.com/V4/',
    { debug: true }
);

// 取得刷新的记录
const api = 'Web.ca.self.list'; // 接口地址
try {

    console.log(`\n调用 API: ${api}...`);

    const commonQueryParams = {
        domain: 'cdn.listlive.cn',
        page: 1,
        per_page: 20,
    };

    const resp = await sdkObj.get(api,{query:commonQueryParams})

    if (resp.bizCode === 1) {
        console.log(`${api} - 业务处理成功`);
        console.log(`  http_code: ${resp.httpCode}`);
        // 成功后，从 resp.bizData.list 中获取数据
        console.log('  成功添加的域名列表:', resp.bizData.list);
    } else {
        // 业务失败，打印失败信息
        console.log(`${api} - 业务处理失败: ${resp.bizMsg}`);
        console.log(`  http_code: ${resp.httpCode}`);
    }

} catch (err) {
    // 网络请求或SDK内部错误
    console.error(`API '${api}' 调用失败:`, err.message);
}


/*
Response: {
[DEBUG] Response: {
    httpCode: 200,
    respBody: `{"status":{"code":1,"message":"操作成功"},"data":{"total":"3","list":[{"id":"25","member_id":"19","ca_name":"cdn.listlive.cn-Let‘s Encrypt-25","issuer":"Let's Encrypt","issuer_start_time":"-","issuer_expiry_time":"-","issuer_expiry_time_desc":"-","issuer_expiry_time_auto_renew_status":0,"renew_status":"1","binded":false,"ca_domain":["cdn.listlive.cn"],"apply_status":"1","progress":70,"ca_type":"2","type":"1","ca_type_domain":"1","code":"1","msg":""},{"id":"23","member_id":"19","ca_name":"cdn.listlive.cn-Let‘s Encrypt-23","issuer":"Let's Encrypt","issuer_start_time":"2025-10-22 10:48:09","issuer_expiry_time":"2026-01-20 10:48:08","issuer_expiry_time_desc":"","issuer_expiry_time_auto_renew_status":1,"renew_status":"1","binded":false,"ca_domain":["cdn.listlive.cn"],"apply_status":"2","progress":100,"ca_type":"2","type":"1","ca_type_domain":"1","code":"1","msg":""},{"id":"21","member_id":"19","ca_name":"cdn.listlive.cn-Let‘s Encrypt-21","issuer":"Let's Encrypt","issuer_start_time":"2025-10-22 10:48:18","issuer_expiry_time":"2026-01-20 10:48:17","issuer_expiry_time_desc":"","issuer_expiry_time_auto_renew_status":1,"renew_status":"1","binded":false,"ca_domain":["cdn.listlive.cn"],"apply_status":"2","progress":100,"ca_type":"2","type":"1","ca_type_domain":"1","code":"1","msg":""}],"issuer_list":["Let's Encrypt"]}}`,
    bizCode: 1,
    bizMsg: '操作成功',
    bizData: {
      total: '3',
      list: [ [Object], [Object], [Object] ],
      issuer_list: [ "Let's Encrypt" ]
    }
  }
    */