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

// 批量将证书绑定到域名
const api = 'Web.ca.batch.operat'; // 接口地址
try {
    const reqParams = {
        "id": [29],  // 证书ID
        "type": "relation"  // 操作类型：关联证书到域名
    }
    
    console.log(`\n调用 API: ${api}...`);
    console.log(`证书ID: ${reqParams.id.join(', ')}`);
    console.log(`操作类型: ${reqParams.type}`);
    
    const resp = await sdkObj.post(api, { data: reqParams });

    if (resp.bizCode === 1) {
        console.log(`${api} - 业务处理成功`);
        console.log(`  http_code: ${resp.httpCode}`);
        console.log(`  操作结果:`);
        if (resp.bizData) {
            console.log(`    总数: ${resp.bizData.total}`);
            console.log(`    失败数: ${resp.bizData.fail_total}`);
            if (resp.bizData.fail_list && resp.bizData.fail_list.length > 0) {
                console.log(`    失败列表:`, resp.bizData.fail_list);
            }
            if (resp.bizData.remark) {
                console.log(`    备注: ${resp.bizData.remark}`);
            }
        }
    } else {
        // 业务失败，打印失败信息
        console.log(`${api} - 业务处理失败: ${resp.bizMsg}`);
        console.log(`  http_code: ${resp.httpCode}`);
    }

} catch (err) {
    // 网络请求或SDK内部错误
    console.error(`API '${api}' 调用失败:`, err.message);
}