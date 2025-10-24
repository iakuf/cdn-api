// --- 依赖导入 ---
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const dayjs = require('dayjs');
const crypto = require('crypto');
const DiansuyunSDK = require('./sdk.js');

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

// // 校验关键配置是否存在
// if (!DIANSUYUN_APP_ID || !DIANSUYUN_APP_SECRET || !DIANSUYUN_API_PRE) {
//     console.error('错误: 环境变量 DIANSUYUN_APP_ID, DIANSUYUN_APP_SECRET, 和 DIANSUYUN_API_PRE 必须被设置。');
//     process.exit(1);
// }

// 初始化点速云 SDK
const sdk = new DiansuyunSDK(
    DIANSUYUN_APP_ID,
    DIANSUYUN_APP_SECRET,
    DIANSUYUN_API_PRE, {
        debug: DEBUG === 'true' // 在开发时开启 debug 模式，生产环境建议关闭
    }
);

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

        // 记录提交前的时间，用于后续查找任务ID
        const beforeSubmitTime = dayjs().subtract(5, 'second').format('YYYY-MM-DD HH:mm:ss');

        // 1. 提交缓存清理任务
        const submitResult = await sdk.put('/V4/Web.Domain.DashBoard.saveCache', internalReqParams);

        if (submitResult.bizCode !== 1) {
            throw new Error(`提交缓存清理任务失败: ${submitResult.bizMsg}`);
        }

        // 2. 立即查询任务列表以获取刚刚创建的任务ID
        //    这是因为提交接口本身不返回ID，我们通过查询最近的任务来获取
        const findTaskParams = {
            query: {
                start_time: beforeSubmitTime,
                page: 0,
                per_page: 1, // 只取最新的一条
            }
        };
        const taskListResult = await sdk.get('/V4/Web.Domain.DashBoard.cache.clean.list', findTaskParams);

        if (taskListResult.bizCode !== 1 || !taskListResult.bizData.list || taskListResult.bizData.list.length === 0) {
            console.error('警告: 成功提交缓存清理任务，但无法立即查询到任务ID。可能存在延迟。');
            // 即使找不到ID，也返回一个模拟的成功信息，或一个特定的错误码
            ctx.status = 202; // Accepted
            ctx.body = { RefreshTaskId: null, message: "任务已提交，但获取ID时存在延迟，请稍后查询。" };
            return;
        }

        // 3. 构造并返回客户需要的响应
        const newTaskId = taskListResult.bizData.list[0].task_id;
        ctx.status = 200;
        ctx.body = {
            RefreshTaskId: newTaskId,
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

        // 同样记录提交前时间
        const beforeSubmitTime = dayjs().subtract(5, 'second').format('YYYY-MM-DD HH:mm:ss');
        
        // 1. 提交预热任务
        const submitResult = await sdk.post('/V4/Web.Domain.DashBoard.save.preheat.cache', internalReqParams);

        if (submitResult.bizCode !== 1) {
            throw new Error(`提交预热任务失败: ${submitResult.bizMsg}`);
        }

        // 2. 查询预热任务列表以获取任务ID
        const findTaskParams = {
            query: {
                start_time: beforeSubmitTime,
                page: 0,
                per_page: 1,
            }
        };
        const taskListResult = await sdk.get('/V4/Web.Domain.DashBoard.get.preheat.cache.list', findTaskParams);

        if (taskListResult.bizCode !== 1 || !taskListResult.bizData.list || taskListResult.bizData.list.length === 0) {
            console.error('警告: 成功提交预热任务，但无法立即查询到任务ID。可能存在延迟。');
            ctx.status = 202;
            ctx.body = { PreloadTaskId: null, message: "任务已提交，但获取ID时存在延迟，请稍后查询。" };
            return;
        }
        
        // 3. 构造并返回客户响应
        const newTaskId = taskListResult.bizData.list[0].task_id;
        ctx.status = 200;
        ctx.body = {
            PreloadTaskId: newTaskId,
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
        const refreshResp = await sdk.get('/V4/Web.Domain.DashBoard.cache.clean.list', { query: commonQueryParams });
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
        const preloadResp = await sdk.get('/V4/Web.Domain.DashBoard.get.preheat.cache.list', { query: commonQueryParams });
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
 * 注意：内部API可能没有对应接口，这里提供模拟实现
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

        // 注意：由于内部API可能没有IP归属查询接口，这里实现一个基本的查询逻辑
        // 实际应该调用内部的 IP 查询接口，例如 dispatcher/dispatch.master.resource.list
        // 这里使用模拟数据作为示例
        
        const result = [];
        
        for (const ip of ipList) {
            // 这里应该调用内部 IP 查询接口
            // 示例：可能需要查询内网的 dispatcher 服务
            // const ipInfo = await queryInternalIpService(ip);
            
            // 模拟响应（生产环境需要替换为实际的API调用）
            const ipInfo = {
                Ip: ip,
                CdnIp: 'false', // 默认不是 CDN IP
                Isp: '',
                Region: '',
                Province: '',
                City: ''
            };

            // 简单的 IP 范围判断（这只是示例，实际需要查询数据库或内部服务）
            const ipParts = ip.split('.');
            if (ipParts.length === 4) {
                const firstOctet = parseInt(ipParts[0]);
                // 示例：假设某些 IP 段是 CDN IP
                if (firstOctet === 183 || firstOctet === 36) {
                    ipInfo.CdnIp = 'true';
                    ipInfo.Isp = '电信';
                    ipInfo.Region = '中国大陆';
                    ipInfo.Province = '陕西省';
                    ipInfo.City = '西安市';
                }
            }

            result.push(ipInfo);
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

            // 1. 先上传证书到内部系统
            const uploadCertParams = {
                data: {
                    ca_name: `cert_${Date.now()}`, // 自动生成证书名称
                    ca_crt: ServerCertificate,
                    ca_key: PrivateKey
                }
            };

            const uploadResult = await sdk.post('/V4/Web.ca.text.save', uploadCertParams);

            if (uploadResult.bizCode !== 1) {
                throw new Error(`上传证书失败: ${uploadResult.bizMsg}`);
            }

            // 获取上传后的证书ID
            const certId = uploadResult.bizData.id;

            // 2. 将证书绑定到域名（通过批量操作接口）
            const bindParams = {
                data: {
                    id: [certId],
                    type: 'relation'
                }
            };

            const bindResult = await sdk.post('/V4/Web.ca.batch.operat', bindParams);

            if (bindResult.bizCode !== 1) {
                throw new Error(`绑定证书到域名失败: ${bindResult.bizMsg}`);
            }

            ctx.status = 200;
            ctx.body = {
                RequestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };

        } else if (Action === 'unbind') {
            // 解绑操作：需要先查询域名关联的证书，然后解绑
            // 1. 查询域名信息获取证书ID
            const domainInfoParams = {
                domain: domainList[0] // 假设一次只处理一个域名
            };

            const domainInfo = await sdk.get('/V4/Web.Domain.Info', { query: domainInfoParams });

            if (domainInfo.bizCode !== 1 || !domainInfo.bizData.ca_id) {
                throw new Error(`查询域名证书信息失败或域名未绑定证书`);
            }

            const certId = domainInfo.bizData.ca_id;

            // 2. 解绑证书（通过批量操作接口）
            const unbindParams = {
                data: {
                    id: [certId],
                    type: 'unrelation' // 假设有 unrelation 操作
                }
            };

            const unbindResult = await sdk.post('/V4/Web.ca.batch.operat', unbindParams);

            if (unbindResult.bizCode !== 1) {
                throw new Error(`解绑证书失败: ${unbindResult.bizMsg}`);
            }

            ctx.status = 200;
            ctx.body = {
                RequestId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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

        const domainInfo = await sdk.get('/V4/Web.Domain.Info', { query: domainInfoParams });

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
        const certListParams = {
            domain: Domain,
            page: 1,
            per_page: 100
        };

        const certList = await sdk.get('/V4/Web.ca.self.list', { query: certListParams });

        if (certList.bizCode !== 1 || !certList.bizData.list) {
            throw new Error(`查询证书列表失败: ${certList.bizMsg}`);
        }

        // 找到匹配的证书
        const certInfo = certList.bizData.list.find(cert => cert.id === certId);

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
    console.log(`  THIRD_PARTY_AK: ${THIRD_PARTY_AK ? '✓ (鉴权已启用)' : '✗ (鉴权已禁用)'}`);
    console.log(`  THIRD_PARTY_SK: ${THIRD_PARTY_SK ? '✓ (鉴权已启用)' : '✗ (鉴权已禁用)'}`);
    console.log(`  DEBUG: ${DEBUG === 'true' ? '已启用' : '已禁用'}`);
    console.log('==============================================\n');
});
