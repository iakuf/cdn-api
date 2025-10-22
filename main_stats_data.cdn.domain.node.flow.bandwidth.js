import sdk from './src/sdk.js';
import fs from 'fs';
import path from 'path';


const sdkObj = new sdk(
    '9JLZCITlaE61511PGx7r',
    'EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b',
    'http://apiv4.diansuyun.com/V4/',
    { debug: true }
);

/**
 * 读取证书文件内容
 * @param {string} filePath - 文件路径
 * @returns {string} 文件内容
 */
const readCertFile = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        throw new Error(`读取文件失败 ${filePath}: ${err.message}`);
    }
};

// 流量统计
const api = 'stats_data.cdn.domain.node.flow.bandwidth'; // 接口地址
try {
  

    const reqParams = {
        "acct_id": 0,
        "start_time": "2025-10-22 11:39:00",
        "end_time": "2025-10-22 11:55:59",
        "sub_domains": [
            "cdn.listlive.cn"
        ],
        "interval": "1m"
    }
    console.log(`\n调用 API: ${api}...`);
    console.log(`证书名称: ${reqParams.ca_name}`);
    
    const resp = await sdkObj.post(api, { data: reqParams });

    if (resp.bizCode === 1) {
        console.log(`${api} - 业务处理成功`);
        console.log(`  http_code: ${resp.httpCode}`);
    } else {
        // 业务失败，打印失败信息
        console.log(`${api} - 业务处理失败: ${resp.bizMsg}`);
        console.log(`  http_code: ${resp.httpCode}`);
    }

} catch (err) {
    // 网络请求或SDK内部错误
    console.error(`API '${api}' 调用失败:`, err.message);
}