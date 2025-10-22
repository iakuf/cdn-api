import sdk from './src/sdk.js';



const sdkObj = new sdk(
    '9JLZCITlaE61511PGx7r',
    'EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b',
    'http://apiv4.diansuyun.com/V4/',
    { debug: true }
);

// 提交刷新接口
const api = 'Web.Domain.DashBoard.saveCache'; // 接口地址
try {

    const reqParams = {
        data: {
            // 根据 API 文档，请求 body 需要一个 domain 数组
            "specialurl": [
                "https://cdn.listlive.cn/assets/img/hero-icon.png"
            ]
        }
    };

    console.log(`\n调用 API: ${api}...`);
    const resp = await sdkObj.put(api, reqParams);

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