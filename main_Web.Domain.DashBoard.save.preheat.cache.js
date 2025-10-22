import sdk from './src/sdk.js';
import dayjs from 'dayjs';


const sdkObj = new sdk(
    '9JLZCITlaE61511PGx7r',
    'EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b',
    'http://apiv4.diansuyun.com/V4/',
    { debug: true }
);

/**
 * 从客户请求体中提取 URL 列表
 * @param {Array<Object>} urlObjects - 格式为 [{Url: "http://..."}, ...] 的数组
 * @returns {Array<string>} URL 字符串数组
 */
const extractUrls = (urlObjects) => {
    if (!Array.isArray(urlObjects)) return [];
    return urlObjects.map(item => item.Url).filter(Boolean);
};

/**
 * 格式化日期为内部 API 所需的 'YYYY-MM-DD HH:mm:ss' 格式
 * @param {string} isoDate - ISO8601 格式的日期字符串
 * @returns {string|null} 格式化后的日期字符串或 null
 */
const formatIsoToInternal = (isoDate) => {
    if (!isoDate) return null;
    const date = dayjs(isoDate);
    return date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : null;
};

/**
 * 格式化日期为客户所需的 ISO8601 格式
 * @param {string} internalDate - 'YYYY-MM-DD HH:mm:ss' 格式的日期字符串
 * @returns {string|null} ISO8601 格式的日期字符串或 null
 */
const formatInternalToIso = (internalDate) => {
    if (!internalDate) return null;
    const date = dayjs(internalDate, 'YYYY-MM-DD HH:mm:ss');
    return date.isValid() ? date.toISOString().replace('Z', '+08:00') : null; // 假设为北京时间
};
// 取预热记录
const api = 'Web.Domain.DashBoard.get.preheat.cache.list'; // 接口地址
try {

    const reqParams = {
        data: {
            // 根据 API 文档，请求 body 需要一个 domain 数组
            "specialurl": [
                "http://cdn.listlive.cn/path/to/file.html"
            ]
        }
    };

    console.log(`\n调用 API: ${api}...`);
    const resp = await sdkObj.post(api,reqParams);

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