// --- 依赖导入 ---
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import dayjs from 'dayjs';
import crypto from 'crypto';
import DiansuyunSDK from './sdk.js';
import { Reader } from 'mmdb-lib';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ESM 模块需要手动获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 应用配置与初始化 ---
const app = new Koa();
const router = new Router();

// 从环境变量获取敏感配置，这是最佳实践
const {

    // 第三方鉴权配置 (用于验证来自第三方的请求)
    THIRD_PARTY_AK,
    THIRD_PARTY_SK,
    PORT = 3000,
    DEBUG = 'true'
} = process.env;


const DIANSUYUN_APP_ID="9JLZCITlaE61511PGx7r";
const DIANSUYUN_APP_SECRET="EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b";
const DIANSUYUN_API_PRE="http://apiv4.diansuyun.com/V4/";

// 内部 dispatcher API 配置 (用于 IP 归属查询)
const DISPATCHER_API_BASE = process.env.DISPATCHER_API_BASE || "http://192.168.200.31:60021";
const DISPATCHER_ADMIN_ID = process.env.DISPATCHER_ADMIN_ID || "1";

// 初始化点速云 SDK
const sdk = new DiansuyunSDK(
    DIANSUYUN_APP_ID,
    DIANSUYUN_APP_SECRET,
    DIANSUYUN_API_PRE, {
        debug: DEBUG === 'true' // 在开发时开启 debug 模式，生产环境建议关闭
    }
);

// 初始化 IPIP MMDB 数据库读取器
let ipipReader = null;
try {
    const ipipDbPath = path.join(__dirname, '..', 'data', 'ipip.mmdb');
    console.log(`[IPIP] 加载 IP 数据库: ${ipipDbPath}`);
    
    // mmdb-lib 需要 Buffer 对象，而不是文件路径
    const buffer = fs.readFileSync(ipipDbPath);
    ipipReader = new Reader(buffer);
    
    console.log(`[IPIP] 成功加载 IP 数据库: ${ipipDbPath} (大小: ${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
} catch (error) {
    console.warn(`[IPIP] 警告: 无法加载 IP 数据库，IP 查询功能将受限:`, error.message);
}

// --- 辅助函数 ---

/**
 * 第三方鉴权中间件
 * 验证 token = SHA1(ak + sk + t)，10分钟内有效
 */
const authMiddleware = async (ctx, next) => {
    const { ak, t, token } = ctx.query;

    // 如果没有配置 AK/SK，则跳过鉴权（开发模式）
    if (!THIRD_PARTY_AK || !THIRD_PARTY_SK) {
        console.warn('[Auth] 警告: 未配置 THIRD_PARTY_AK/SK，跳过鉴权');
        await next();
        return;
    }

    if (!ak || !t || !token) {
        ctx.status = 401;
        ctx.body = { error: '鉴权失败', message: '缺少必要的鉴权参数: ak, t, token' };
        return;
    }

    // 验证时间戳（10分钟有效期）
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(t);
    if (Math.abs(currentTime - requestTime) > 600) {
        ctx.status = 401;
        ctx.body = { error: '鉴权失败', message: 'token 已过期（超过10分钟）' };
        return;
    }

    // 验证 AK
    if (ak !== THIRD_PARTY_AK) {
        ctx.status = 401;
        ctx.body = { error: '鉴权失败', message: 'ak 不正确' };
        return;
    }

    // 计算期望的 token
    const expectedToken = crypto.createHash('sha1')
        .update(ak + THIRD_PARTY_SK + t)
        .digest('hex');

    if (token !== expectedToken) {
        ctx.status = 401;
        ctx.body = { error: '鉴权失败', message: 'token 验证失败' };
        return;
    }

    // 鉴权通过，继续处理请求
    await next();
};

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

/**
 * 查询 dispatcher API 以检查 IP 是否为 CDN IP
 * @param {string} ip - IP 地址
 * @returns {Promise<Object|null>} CDN IP 信息或 null
 */
const checkCdnIpFromDispatcher = async (ip) => {
    try {
        const url = `${DISPATCHER_API_BASE}/api/v1/dispatcher/dispatch.master.resource.list?sys_plat=adminV5Api`;
        
        if (DEBUG === 'true') {
            console.log(`[Dispatcher API] 查询 IP: ${ip}`);
            console.log(`[Dispatcher API] URL: ${url}`);
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Ydauth-Admin-ID': DISPATCHER_ADMIN_ID,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ master_ip: ip }),
        });

        if (!response.ok) {
            console.error(`[Dispatcher API] HTTP 错误: ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        if (DEBUG === 'true') {
            console.log(`[Dispatcher API] 响应:`, JSON.stringify(data, null, 2));
        }
        
        if (data.status && data.status.code === 1 && data.data && data.data.list && data.data.list.length > 0) {
            console.log(`[Dispatcher API] ✓ IP ${ip} 是 CDN IP`);
            // 返回第一个匹配的 CDN IP 信息
            return data.data.list[0];
        }
        
        console.log(`[Dispatcher API] IP ${ip} 不是 CDN IP`);
        return null;
    } catch (error) {
        console.error(`[Dispatcher API] 查询失败:`, error.message);
        console.error(`[Dispatcher API] 错误详情:`, error);
        return null;
    }
};

/**
 * 使用 IPIP 数据库查询 IP 地理位置信息
 * @param {string} ip - IP 地址
 * @returns {Object|null} IP 地理位置信息或 null
 */
const queryIpipDatabase = (ip) => {
    if (!ipipReader) {
        console.warn('[IPIP] IP 数据库未加载，无法查询');
        return null;
    }

    try {
        const result = ipipReader.get(ip);
        
        if (!result) {
            if (DEBUG === 'true') {
                console.log(`[IPIP] IP ${ip} 未找到数据`);
            }
            return null;
        }

        if (DEBUG === 'true') {
            console.log(`[IPIP] 原始数据:`, JSON.stringify(result, null, 2));
        }

        // IPIP MMDB 数据库返回的是嵌套对象，需要提取实际的字符串值
        // 辅助函数：从嵌套的 names 对象中提取中文或英文值
        const extractName = (obj) => {
            if (!obj) return '';
            if (typeof obj === 'string') return obj;
            if (obj.names) {
                return obj.names['zh-CN'] || obj.names['en'] || '';
            }
            return '';
        };

        // 提取并格式化数据
        const formattedResult = {
            country: extractName(result.country),
            region: extractName(result.continent),
            province: extractName(result.subdivisions?.[0]) || extractName(result.province),
            city: extractName(result.city),
            isp: extractName(result.isp) || extractName(result.traits?.isp),
        };

        if (DEBUG === 'true') {
            console.log(`[IPIP] 格式化后数据:`, formattedResult);
        }

        return formattedResult;
    } catch (error) {
        console.error(`[IPIP] 查询 IP ${ip} 失败:`, error.message);
        return null;
    }
};


// --- API 路由实现 ---

/**
 * 1. 刷新接口 (Adapter for /content/RefreshCaches)
 * 将客户的刷新请求转换为内部的缓存清理任务
 */
router.post('/content/RefreshCaches', authMiddleware, async (ctx) => {
    try {
        const { Files, Dirs, Regexes } = ctx.request.body;

        // 内部接口不支持正则刷新，如果客户提供了，我们在此处记录并忽略
        if (Regexes && Regexes.length > 0) {
            console.warn('警告: 接收到正则刷新请求，但后端接口不支持，该部分将被忽略。');
        }

        const specialurl = extractUrls(Files);
        const specialdir = extractUrls(Dirs);

        if (specialurl.length === 0 && specialdir.length === 0) {
            ctx.status = 400;
            ctx.body = { error: '请求失败', message: 'Files 和 Dirs 列表不能同时为空。' };
            return;
        }

        const internalReqParams = {
            data: {
                specialurl,
                specialdir,
            },
        };

        // 提交缓存清理任务
        console.log('internalReqParams', internalReqParams);
        const submitResult = await sdk.put('Web.Domain.DashBoard.saveCache', internalReqParams);
        console.log('submitResult', submitResult);

        if (submitResult.bizCode !== 1) {
            throw new Error(`提交缓存清理任务失败: ${submitResult.bizMsg}`);
        }

        // API 直接返回 task_id，无需再次查询
        const taskId = submitResult.bizData.task_id;
        
        if (!taskId) {
            console.error('警告: API 返回成功但未包含 task_id');
            ctx.status = 202; // Accepted
            ctx.body = { RefreshTaskId: null, message: "任务已提交，但未返回任务ID。" };
            return;
        }

        // 构造并返回客户需要的响应
        ctx.status = 200;
        ctx.body = {
            RefreshTaskId: taskId,
        };

    } catch (error) {
        console.error('[/content/RefreshCaches] 接口处理异常:', error);
        ctx.status = 500;
        ctx.body = { error: '内部服务器错误', message: error.message };
    }
});

/**
 * 2. 预热接口 (Adapter for /content/PreloadCaches)
 * 将客户的预热请求转换为内部的预热任务
 */
router.post('/content/PreloadCaches', authMiddleware, async (ctx) => {
    try {
        const { Urls } = ctx.request.body;
        const preheat_url = extractUrls(Urls);

        if (preheat_url.length === 0) {
            ctx.status = 400;
            ctx.body = { error: '请求失败', message: 'Urls 列表不能为空。' };
            return;
        }

        const internalReqParams = {
            data: {
                preheat_url,
            },
        };
        
        // 提交预热任务
        const submitResult = await sdk.post('Web.Domain.DashBoard.save.preheat.cache', internalReqParams);

        if (submitResult.bizCode !== 1) {
            throw new Error(`提交预热任务失败: ${submitResult.bizMsg}`);
        }

        // API 直接返回 task_id，无需再次查询
        const taskId = submitResult.bizData.task_id;
        
        if (!taskId) {
            console.error('警告: API 返回成功但未包含 task_id');
            ctx.status = 202;
            ctx.body = { PreloadTaskId: null, message: "任务已提交，但未返回任务ID。" };
            return;
        }
        
        // 构造并返回客户响应
        ctx.status = 200;
        ctx.body = {
            PreloadTaskId: taskId,
        };

    } catch (error) {
        console.error('[/content/PreloadCaches] 接口处理异常:', error);
        ctx.status = 500;
        ctx.body = { error: '内部服务器错误', message: error.message };
    }
});


/**
 * 3. 刷新/预热进度查询 (Adapter for /content/GetRefreshOrPreloadTask)
 * 将客户的查询请求转换为对内部刷新和预热两个接口的查询，并合并结果
 */
router.post('/content/GetRefreshOrPreloadTask', authMiddleware, async (ctx) => {
    try {
        const { StartTime, EndTime, TaskId, PageSize, PageNumber } = ctx.request.body;

        // 构造两个内部查询的通用参数
        const commonQueryParams = {
            start_time: formatIsoToInternal(StartTime) || undefined,
            end_time: formatIsoToInternal(EndTime) || undefined,
            // 内部API页码从0开始，客户API从1开始
            page: (PageNumber && PageNumber > 0) ? PageNumber - 1 : 0,
            per_page: PageSize || 20,
        };

        let allTasks = [];
        let totalCount = 0;

        // 由于无法从 TaskId 判断任务类型，如果提供了 TaskId，我们需要同时查询两个详情接口
        // 但这里我们简化处理，优先查询列表。更复杂的 TaskId 查询需要单独处理。
        // 为简化逻辑，此适配器暂不支持按 TaskId 精确查询，仅支持按时间范围查询。
        if (TaskId) {
             console.warn(`警告: 按 TaskId 查询的逻辑较为复杂，当前版本将忽略 TaskId 并按时间范围查询。`);
        }

        // 1. 查询刷新任务列表
        const refreshResp = await sdk.get('Web.Domain.DashBoard.cache.clean.list', { query: commonQueryParams });
        if (refreshResp.bizCode === 1 && refreshResp.bizData.list) {
            totalCount += refreshResp.bizData.total;
            const refreshTasks = refreshResp.bizData.list.map(task => ({
                Type: 'refresh',
                // 后端接口列表不返回URL，这是一个API限制。我们用任务类型填充。
                Url: `任务类型: ${task.sub_type}`, 
                Progress: task.status === '已完成' ? 100.0 : (task.ongoing > 0 ? 50.0 : 0.0),
                Status: task.status === '已完成' ? 'success' : (task.ongoing > 0 ? 'progressing' : 'failed'),
                TaskId: task.task_id,
                CreateTime: formatInternalToIso(task.created_at),
            }));
            allTasks = allTasks.concat(refreshTasks);
        }

        // 2. 查询预热任务列表
        const preloadResp = await sdk.get('Web.Domain.DashBoard.get.preheat.cache.list', { query: commonQueryParams });
        if (preloadResp.bizCode === 1 && preloadResp.bizData.list) {
            totalCount += preloadResp.bizData.total;
            const preloadTasks = preloadResp.bizData.list.map(task => ({
                Type: 'preload',
                Url: '预热任务', // 同样，列表接口不返回URL
                Progress: task.state === '完成' ? 100.0 : (task.ongoing > 0 ? 50.0 : 0.0),
                Status: task.state === '完成' ? 'success' : (task.ongoing > 0 ? 'progressing' : 'failed'),
                TaskId: task.task_id,
                CreateTime: formatInternalToIso(task.created_at),
            }));
            allTasks = allTasks.concat(preloadTasks);
        }
        
        // 3. 构造最终响应
        ctx.body = {
            StartTime: StartTime || dayjs().subtract(7, 'day').toISOString(),
            EndTime: EndTime || dayjs().toISOString(),
            Urls: ctx.request.body.Urls || [], // 将请求的Urls原样返回
            PageSize: commonQueryParams.per_page,
            PageNumber: commonQueryParams.page + 1,
            TotalCount: totalCount,
            Datas: allTasks,
        };

    } catch (error) {
        console.error('[/content/GetRefreshOrPreloadTask] 接口处理异常:', error);
        ctx.status = 500;
        ctx.body = { error: '内部服务器错误', message: error.message };
    }
});

/**
 * 4. IP 归属查询接口 (Adapter for /service/IpCheck)
 * 查询指定 IP 是否为 CDN IP 及其归属信息
 * 优先查询 dispatcher API，如果不是 CDN IP，则使用 IPIP 数据库查询地理位置信息
 */
router.post('/service/IpCheck', authMiddleware, async (ctx) => {
    try {
        const { Ip } = ctx.request.body;

        if (!Ip) {
            ctx.status = 400;
            ctx.body = { error: '请求失败', message: 'Ip 参数不能为空。' };
            return;
        }

        // 将逗号分隔的 IP 字符串转换为数组
        const ipList = Ip.split(',').map(ip => ip.trim()).filter(Boolean);

        if (ipList.length === 0) {
            ctx.status = 400;
            ctx.body = { error: '请求失败', message: '未提供有效的 IP 地址。' };
            return;
        }

        const result = [];
        
        for (const ip of ipList) {
            if (DEBUG === 'true') {
                console.log(`\n[IpCheck] 开始查询 IP: ${ip}`);
            }
            
            // 1. 先查询 dispatcher API 检查是否为 CDN IP
            const cdnInfo = await checkCdnIpFromDispatcher(ip);
            
            if (DEBUG === 'true') {
                console.log(`[IpCheck] Dispatcher 返回:`, cdnInfo ? 'CDN IP' : '非 CDN IP');
            }
            
            if (cdnInfo) {
                // 这是 CDN IP，使用 dispatcher API 返回的信息
                const ipInfo = {
                    Ip: ip,
                    CdnIp: 'true',
                    Isp: '',
                    Region: '中国大陆',
                    Province: '',
                    City: ''
                };
                
                // 从 location 字段提取区域信息（例如: "hen" -> "河南"）
                const locationMap = {
                    'hen': '河南',
                    'bj': '北京',
                    'sh': '上海',
                    'gz': '广州',
                    'gd': '广东',
                    'sx': '陕西',
                    'shandong': '山东',
                    'zj': '浙江',
                    'js': '江苏',
                    // 可以根据实际情况扩展映射表
                };
                
                const location = cdnInfo.location || '';
                ipInfo.Province = locationMap[location] || '';
                
                // 从 pool_name 推断省份（如果 location 映射不到）
                if (!ipInfo.Province && cdnInfo.pool_name) {
                    if (cdnInfo.pool_name.includes('河南')) ipInfo.Province = '河南省';
                    else if (cdnInfo.pool_name.includes('陕西')) ipInfo.Province = '陕西省';
                    else if (cdnInfo.pool_name.includes('北京')) ipInfo.Province = '北京市';
                    else if (cdnInfo.pool_name.includes('上海')) ipInfo.Province = '上海市';
                    else if (cdnInfo.pool_name.includes('广东') || cdnInfo.pool_name.includes('广州')) ipInfo.Province = '广东省';
                }
                
                // 从 isp_id_list 或 pool_name 推断运营商
                if (cdnInfo.pool_name) {
                    if (cdnInfo.pool_name.includes('移动')) {
                        ipInfo.Isp = '移动';
                    } else if (cdnInfo.pool_name.includes('电信')) {
                        ipInfo.Isp = '电信';
                    } else if (cdnInfo.pool_name.includes('联通')) {
                        ipInfo.Isp = '联通';
                    }
                }
                
                // 从 pool_name 提取城市信息
                if (cdnInfo.pool_name) {
                    const cityPatterns = [
                        { pattern: '郑州', city: '郑州市' },
                        { pattern: '西安', city: '西安市' },
                        { pattern: '北京', city: '北京市' },
                        { pattern: '上海', city: '上海市' },
                        { pattern: '广州', city: '广州市' },
                        { pattern: '深圳', city: '深圳市' },
                        { pattern: '杭州', city: '杭州市' },
                        { pattern: '南京', city: '南京市' },
                    ];
                    
                    for (const { pattern, city } of cityPatterns) {
                        if (cdnInfo.pool_name.includes(pattern)) {
                            ipInfo.City = city;
                            break;
                        }
                    }
                }
                
                result.push(ipInfo);
                
            } else {
                // 2. 不是 CDN IP，使用 IPIP 数据库查询地理位置
                const geoInfo = queryIpipDatabase(ip);
                
                const ipInfo = {
                    Ip: ip,
                    CdnIp: 'false'
                };
                
                // 只有当 IPIP 数据库有返回数据时，才添加地理位置字段
                if (geoInfo && (geoInfo.country || geoInfo.province || geoInfo.city || geoInfo.isp)) {
                    if (geoInfo.isp) ipInfo.Isp = geoInfo.isp;
                    if (geoInfo.country) ipInfo.Region = geoInfo.country;
                    if (geoInfo.province) ipInfo.Province = geoInfo.province;
                    if (geoInfo.city) ipInfo.City = geoInfo.city;
                }
                
                result.push(ipInfo);
            }
        }

        ctx.status = 200;
        ctx.body = { result };

    } catch (error) {
        console.error('[/service/IpCheck] 接口处理异常:', error);
        ctx.status = 500;
        ctx.body = { error: '内部服务器错误', message: error.message };
    }
});

/**
 * 5. 证书绑定/解绑接口 (Adapter for /cert/SetCertificate)
 * 用于对客户加速域名绑定或解绑证书
 */
router.post('/cert/SetCertificate', authMiddleware, async (ctx) => {
    try {
        const { Domains, ServerCertificate, PrivateKey, Action } = ctx.request.body;

        if (!Domains || !Action) {
            ctx.status = 400;
            ctx.body = { error: '请求失败', message: 'Domains 和 Action 参数是必需的。' };
            return;
        }

        if (!['bind', 'unbind'].includes(Action)) {
            ctx.status = 400;
            ctx.body = { error: '请求失败', message: 'Action 必须是 bind 或 unbind。' };
            return;
        }

        // 将逗号分隔的域名转换为数组
        const domainList = Domains.split(',').map(d => d.trim()).filter(Boolean);

        if (domainList.length === 0) {
            ctx.status = 400;
            ctx.body = { error: '请求失败', message: '未提供有效的域名。' };
            return;
        }

        if (Action === 'bind') {
            // 绑定操作需要证书和私钥
            if (!ServerCertificate || !PrivateKey) {
                ctx.status = 400;
                ctx.body = { error: '请求失败', message: '绑定证书时必须提供 ServerCertificate 和 PrivateKey。' };
                return;
            }

            console.log(`[SetCertificate] 开始绑定证书到域名: ${domainList.join(', ')}`);

            // 步骤1: 查询域名信息，检查是否已绑定证书
            let oldCertId = null;
            try {
                console.log(`[SetCertificate] 步骤1: 查询域名信息 ${domainList[0]}`);
                const domainInfo = await sdk.get('Web.Domain.Info', { 
                    query: { domain: domainList[0] } 
                });

                if (domainInfo.bizCode === 1 && domainInfo.bizData.ca_id && domainInfo.bizData.ca_id !== '0') {
                    oldCertId = domainInfo.bizData.ca_id;
                    console.log(`[SetCertificate] 域名已绑定旧证书，ID: ${oldCertId}`);
                } else {
                    console.log(`[SetCertificate] 域名未绑定证书`);
                }
            } catch (error) {
                console.warn(`[SetCertificate] 查询域名信息失败，继续执行: ${error.message}`);
            }

            // 步骤2: 检查证书是否已存在，避免重复上传
            let newCertId = null;
            let isNewUpload = false;
            
            // 2.1 检查是否有可复用的证书（可选优化）
            // 注意：由于 API 的 domain 参数对泛域名支持有限，这里获取所有证书列表
            try {
                console.log(`[SetCertificate] 步骤2.1: 检查证书是否已存在`);
                
                // 查询证书列表（不使用 domain 参数，因为泛域名匹配有问题）
                const certListResult = await sdk.get('Web.ca.self.list', {
                    query: {
                        page: 1,
                        per_page: 100
                        // 不使用 domain 参数，因为泛域名 *.listlive.cn 与 cdn.listlive.cn 无法匹配
                    }
                });

                if (certListResult.bizCode === 1 && certListResult.bizData.list) {
                    const existingCerts = certListResult.bizData.list;
                    console.log(`[SetCertificate] 查询到 ${existingCerts.length} 个证书`);
                    
                    for (const cert of existingCerts) {
                        // 检查证书域名是否匹配（支持泛域名）
                        if (cert.ca_domain && Array.isArray(cert.ca_domain)) {
                            const matchesDomain = cert.ca_domain.some(certDomain => {
                                // 精确匹配
                                if (certDomain === domainList[0]) return true;
                                // 泛域名匹配 (*.example.com 匹配 sub.example.com)
                                if (certDomain.startsWith('*.')) {
                                    const baseDomain = certDomain.substring(2); // 去掉 *.
                                    return domainList[0].endsWith(baseDomain);
                                }
                                return false;
                            });
                            
                            if (matchesDomain) {
                                console.log(`[SetCertificate] 找到匹配的证书: ${cert.id} - ${cert.ca_name} (域名: ${cert.ca_domain.join(', ')})`);
                                // 这里可以进一步检查证书是否即将过期等，决定是否复用
                                // 暂时仍然上传新证书以确保使用最新的
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`[SetCertificate] 查询证书列表失败，继续上传: ${error.message}`);
            }

            // 2.2 上传新证书（无论是否存在，都上传新的以确保是最新的）
            const certName = `${domainList[0]}_${Date.now()}`;
            console.log(`[SetCertificate] 步骤2.2: 上传新证书 ${certName}`);
            
            const uploadCertParams = {
                data: {
                    ca_name: certName,
                    ca_crt: ServerCertificate,
                    ca_key: PrivateKey
                }
            };

            const uploadResult = await sdk.post('Web.ca.text.save', uploadCertParams);

            if (uploadResult.bizCode !== 1) {
                console.error(`[SetCertificate] 上传新证书失败: ${uploadResult.bizMsg}`);
                throw new Error(`上传证书失败: ${uploadResult.bizMsg}`);
            }

            // 获取新证书ID
            newCertId = uploadResult.bizData.id;
            if (!newCertId && uploadResult.bizData.ca_id_names) {
                const ids = Object.keys(uploadResult.bizData.ca_id_names);
                if (ids.length > 0) {
                    newCertId = ids[0];
                }
            }

            if (!newCertId) {
                console.error(`[SetCertificate] 无法获取新证书ID`);
                throw new Error('上传证书成功但未返回证书ID');
            }

            isNewUpload = true;
            console.log(`[SetCertificate] 新证书上传成功，ID: ${newCertId}`);

            // 步骤3: 绑定新证书到域名
            console.log(`[SetCertificate] 步骤3: 绑定新证书到域名`);
            const bindParams = {
                data: {
                    id: [parseInt(newCertId)],
                    type: 'relation',
                    is_confirm: 0  // 不再次检查证书到期
                }
            };

            // 如果有旧证书，必须通过 del_id 参数指定要被替换的旧证书
            // 这是 API 的强制要求：替换已绑定的证书时，必须明确指定要替换哪个旧证书
            if (oldCertId) {
                bindParams.data.del_id = [parseInt(oldCertId)];
                console.log(`[SetCertificate] 替换旧证书: ${oldCertId} -> ${newCertId}`);
            }

            const bindResult = await sdk.post('Web.ca.batch.operat', bindParams);

            if (bindResult.bizCode !== 1) {
                console.error(`[SetCertificate] 绑定新证书失败: ${bindResult.bizMsg}`);
                console.error(`[SetCertificate] 绑定响应:`, bindResult.bizData);
                
                // 绑定失败，尝试删除刚上传的新证书
                try {
                    console.log(`[SetCertificate] 清理：删除上传失败的新证书 ${newCertId}`);
                    await sdk.delete('Web.ca.self.del', {
                        data: { ids: newCertId.toString() }
                    });
                } catch (cleanupError) {
                    console.warn(`[SetCertificate] 清理失败: ${cleanupError.message}`);
                }
                
                throw new Error(`绑定证书失败: ${bindResult.bizMsg}`);
            }

            console.log(`[SetCertificate] 新证书绑定成功`);

            // 步骤4: 验证并清理旧证书
            // 注意：使用 del_id 参数后，旧证书可能已被自动解绑，但证书文件可能仍存在
            if (oldCertId) {
                try {
                    console.log(`[SetCertificate] 步骤4: 清理旧证书 ${oldCertId}`);
                    
                    // 尝试删除旧证书文件
                    const deleteResult = await sdk.delete('Web.ca.self.del', {
                        data: { ids: oldCertId.toString() }
                    });

                    if (deleteResult.bizCode === 1) {
                        console.log(`[SetCertificate] 旧证书已清理`);
                    } else {
                        // 如果旧证书不存在，说明已被 del_id 自动清理
                        if (deleteResult.bizMsg && (
                            deleteResult.bizMsg.includes('不存在') || 
                            deleteResult.bizMsg.includes('已删除')
                        )) {
                            console.log(`[SetCertificate] 旧证书已被自动清理`);
                        } else {
                            console.warn(`[SetCertificate] 清理旧证书失败: ${deleteResult.bizMsg}，但不影响绑定结果`);
                        }
                    }
                } catch (error) {
                    console.warn(`[SetCertificate] 清理旧证书异常: ${error.message}，但不影响绑定结果`);
                }
            }

            console.log(`[SetCertificate] 证书绑定流程完成`);

            ctx.status = 200;
            ctx.body = {
                RequestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };

        } else if (Action === 'unbind') {
            console.log(`[SetCertificate] 开始解绑域名证书: ${domainList.join(', ')}`);

            // 解绑操作：根据 API 限制，证书解绑需要特殊处理
            // 1. 查询域名信息获取证书ID
            const domainInfoParams = {
                domain: domainList[0] // 假设一次只处理一个域名
            };

            console.log(`[SetCertificate] 查询域名信息: ${domainList[0]}`);
            const domainInfo = await sdk.get('Web.Domain.Info', { query: domainInfoParams });

            if (domainInfo.bizCode !== 1) {
                console.error(`[SetCertificate] 查询域名信息失败: ${domainInfo.bizMsg}`);
                throw new Error(`查询域名证书信息失败: ${domainInfo.bizMsg}`);
            }

            console.log(`[SetCertificate] 域名详细信息:`, {
                domain: domainInfo.bizData.domain,
                ca_id: domainInfo.bizData.ca_id,
                status: domainInfo.bizData.status,
                check_status: domainInfo.bizData.check_status
            });

            if (!domainInfo.bizData.ca_id || domainInfo.bizData.ca_id === '0') {
                console.warn(`[SetCertificate] 域名未绑定证书`);
                // 如果域名未绑定证书，直接返回成功（幂等性）
                ctx.status = 200;
                ctx.body = {
                    RequestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    message: '域名未绑定证书，无需解绑'
                };
                return;
            }

            const certId = domainInfo.bizData.ca_id;
            console.log(`[SetCertificate] 当前绑定的证书ID: ${certId}`);

            // 2. 根据 API 文档，证书解绑功能有限制：
            //    - unrelation 接口对于正常使用中的证书返回"证书到期或未绑定"错误
            //    - delete 接口对于正在使用的证书返回"正在使用中，无法删除"错误
            //    
            //    实际应用场景中，通常是**替换证书**而不是**解绑证书**
            //    因此这里返回一个提示信息，建议用户通过绑定新证书来替换
            
            console.warn(`[SetCertificate] API 限制：无法直接解绑正在使用的证书`);
            console.warn(`[SetCertificate] 建议：请通过绑定新证书来替换当前证书（旧证书会自动解绑并删除）`);
            
            ctx.status = 400;
            ctx.body = {
                error: '操作不支持',
                message: `当前 API 不支持直接解绑正在使用的证书。建议：请通过绑定新证书来替换当前证书ID ${certId}（旧证书会自动解绑并删除）。如需强制解绑，请联系管理员手动操作。`,
                certId: certId,
                domain: domainList[0]
            };
        }

    } catch (error) {
        console.error('[/cert/SetCertificate] 接口处理异常:', error);
        ctx.status = 500;
        ctx.body = { 
            error: '内部服务器错误', 
            message: error.message 
        };
    }
});

/**
 * 6. 证书信息查询接口 (Adapter for /cert/GetCertificates)
 * 用于查询域名绑定的证书内容
 */
router.post('/cert/GetCertificates', authMiddleware, async (ctx) => {
    try {
        const { Domain } = ctx.request.body;

        if (!Domain) {
            ctx.status = 400;
            ctx.body = { error: '请求失败', message: 'Domain 参数不能为空。' };
            return;
        }

        // 1. 查询域名信息
        const domainInfoParams = {
            domain: Domain
        };

        const domainInfo = await sdk.get('Web.Domain.Info', { query: domainInfoParams });

        if (domainInfo.bizCode !== 1) {
            throw new Error(`查询域名信息失败: ${domainInfo.bizMsg}`);
        }

        const certId = domainInfo.bizData.ca_id;

        if (!certId || certId === '0') {
            ctx.status = 404;
            ctx.body = { error: '未找到证书', message: '该域名未绑定证书。' };
            return;
        }

        // 2. 查询证书列表，找到对应的证书
        // 注意：不使用 domain 参数，因为泛域名证书无法通过子域名查询到
        const certListParams = {
            page: 1,
            per_page: 100
        };

        const certList = await sdk.get('Web.ca.self.list', { query: certListParams });

        if (certList.bizCode !== 1 || !certList.bizData.list) {
            throw new Error(`查询证书列表失败: ${certList.bizMsg}`);
        }

        // 找到匹配的证书（通过证书ID匹配）
        const certInfo = certList.bizData.list.find(cert => cert.id === certId || cert.id === certId.toString());

        if (!certInfo) {
            ctx.status = 404;
            ctx.body = { error: '未找到证书', message: '未找到匹配的证书信息。' };
            return;
        }

        // 3. 构造响应（注意：内部API可能不返回完整的证书内容，需要额外处理）
        const response = {
            IssueDomain: certInfo.ca_domain ? certInfo.ca_domain.join(',') : Domain,
            IssueTime: certInfo.issuer_start_time || '',
            ExpirationTime: certInfo.issuer_expiry_time || '',
            CertificateContent: '', // 内部API列表接口不返回完整证书内容
            CertificateType: certInfo.ca_type === '2' ? 'DV' : 'OV', // 根据实际映射
            ConfigDomainNames: certInfo.ca_domain ? certInfo.ca_domain.join(',') : Domain
        };

        // 注意：如果需要获取完整证书内容，可能需要调用额外的详情接口
        // 这里暂时返回空的 CertificateContent
        console.warn('警告: CertificateContent 字段为空，内部API可能不支持返回完整证书内容');

        ctx.status = 200;
        ctx.body = response;

    } catch (error) {
        console.error('[/cert/GetCertificates] 接口处理异常:', error);
        ctx.status = 500;
        ctx.body = { error: '内部服务器错误', message: error.message };
    }
});


// --- 启动服务器 ---
app.use(bodyParser());
app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
    console.log('\n==============================================');
    console.log('[Diansuyun API Adapter] 服务已启动');
    console.log(`监听端口: ${PORT}`);
    console.log('\n已实现的 API 接口:');
    console.log('  1. POST /content/RefreshCaches       - 刷新接口');
    console.log('  2. POST /content/PreloadCaches       - 预热接口');
    console.log('  3. POST /content/GetRefreshOrPreloadTask - 刷新/预热进度查询');
    console.log('  4. POST /service/IpCheck             - IP归属查询');
    console.log('  5. POST /cert/SetCertificate         - 证书绑定/解绑');
    console.log('  6. POST /cert/GetCertificates        - 证书信息查询');
    console.log('\n配置状态:');
    console.log(`  DIANSUYUN_APP_ID: ${DIANSUYUN_APP_ID ? '✓' : '✗'}`);
    console.log(`  DIANSUYUN_APP_SECRET: ${DIANSUYUN_APP_SECRET ? '✓' : '✗'}`);
    console.log(`  DIANSUYUN_API_PRE: ${DIANSUYUN_API_PRE ? '✓' : '✗'}`);
    console.log(`  DISPATCHER_API_BASE: ${DISPATCHER_API_BASE}`);
    console.log(`  IPIP 数据库: ${ipipReader ? '✓ 已加载' : '✗ 未加载'}`);
    console.log(`  THIRD_PARTY_AK: ${THIRD_PARTY_AK ? '✓ (鉴权已启用)' : '✗ (鉴权已禁用)'}`);
    console.log(`  THIRD_PARTY_SK: ${THIRD_PARTY_SK ? '✓ (鉴权已启用)' : '✗ (鉴权已禁用)'}`);
    console.log(`  DEBUG: ${DEBUG === 'true' ? '已启用' : '已禁用'}`);
    console.log('==============================================\n');
});
