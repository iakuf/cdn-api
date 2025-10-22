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

// 上传自有证书
const api = 'Web.ca.self.add'; // 接口地址
try {
    // 证书文件路径
    const certDir = path.join(process.cwd(), 'Nginx_PEM', 'PEM');
    const crtFile = path.join(certDir, '_.listlive.cn.pem'); // 替换为你的证书文件名
    const keyFile = path.join(certDir, '_.listlive.cn.key');     // 替换为你的私钥文件名

    // 读取证书文件内容
    console.log('读取证书文件...');
    const ca_crt = readCertFile(crtFile);
    const ca_key = readCertFile(keyFile);

    const reqParams = {
        "ca_name": "ca001",        // 证书名称，可自定义
        "ca_crt": ca_crt,          // 证书内容
        "ca_key": ca_key           // 私钥内容
    };

    console.log(`\n调用 API: ${api}...`);
    console.log(`证书名称: ${reqParams.ca_name}`);
    
    const resp = await sdkObj.post(api, { data: reqParams });

    if (resp.bizCode === 1) {
        console.log(`${api} - 业务处理成功`);
        console.log(`  http_code: ${resp.httpCode}`);
        console.log('  证书上传成功！');
        console.log('  证书ID:', resp.bizData.id);
        console.log('  证书编号:', resp.bizData.ca_sn);
    } else {
        // 业务失败，打印失败信息
        console.log(`${api} - 业务处理失败: ${resp.bizMsg}`);
        console.log(`  http_code: ${resp.httpCode}`);
    }

} catch (err) {
    // 网络请求或SDK内部错误
    console.error(`API '${api}' 调用失败:`, err.message);
}