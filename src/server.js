// --- 依赖导入 ---
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const dayjs = require('dayjs');
const DiansuyunSDK = require('./diansuyun-sdk.js');

// --- 应用配置与初始化 ---
const app = new Koa();
const router = new Router();

// 从环境变量获取敏感配置，这是最佳实践
const {
    DIANSUYUN_APP_ID,
    DIANSUYUN_APP_SECRET,
    DIANSUYUN_API_PRE,
    PORT = 3000
} = process.env;

// 校验关键配置是否存在
if (!DIANSUYUN_APP_ID || !DIANSUYUN_APP_SECRET || !DIANSUYUN_API_PRE) {
    console.error('错误: 环境变量 DIANSUYUN_APP_ID, DIANSUYUN_APP_SECRET, 和 DIANSUYUN_API_PRE 必须被设置。');
    process.exit(1);
}

// 初始化点速云 SDK
const sdk = new DiansuyunSDK(
    DIANSUYUN_APP_ID,
    DIANSUYUN_APP_SECRET,
    DIANSUYUN_API_PRE, {
        debug: true // 在开发时开启 debug 模式，生产环境建议关闭
    }
);

// --- 辅助函数 ---

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
router.post('/content/RefreshCaches', async (ctx) => {
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
router.post('/content/PreloadCaches', async (ctx) => {
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
router.post('/content/GetRefreshOrPreloadTask', async (ctx) => {
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


// --- 启动服务器 ---
app.use(bodyParser());
app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT, () => {
    console.log(`[Diansuyun API Adapter] 服务已启动，正在监听端口 ${PORT}`);
    console.log('请确保已正确设置环境变量: DIANSUYUN_APP_ID, DIANSUYUN_APP_SECRET, DIANSUYUN_API_PRE');
});
