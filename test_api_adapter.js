/**
 * API Adapter 测试套件
 * 用于测试所有第三方 API 接口的适配实现
 * 
 * 使用方法:
 * 1. 确保服务已启动: node src/server.js
 * 2. 运行所有测试: node test_api_adapter.js
 * 3. 运行单个测试: node test_api_adapter.js <test_number>
 *    例如: node test_api_adapter.js 1  (只运行测试1)
 */

const crypto = require('crypto');

// 配置参数
const CONFIG = {
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    AK: process.env.THIRD_PARTY_AK || 'test_ak_123456',
    SK: process.env.THIRD_PARTY_SK || 'test_sk_secret',
    // 测试数据
    TEST_DOMAIN: 'cdn.listlive.cn',
    TEST_URLS: [
        'http://cdn.listlive.cn/test.txt',
        'http://cdn.listlive.cn/test.html'
    ],
    TEST_DIRS: [
        'http://cdn.listlive.cn/images/',
        'http://cdn.listlive.cn/css/'
    ],
    TEST_IPS: '183.204.220.83,36.41.170.150,1.1.1.1'
};

/**
 * 生成鉴权 token
 */
function generateAuthToken(ak, sk) {
    const t = Math.floor(Date.now() / 1000);
    const token = crypto.createHash('sha1')
        .update(ak + sk + t)
        .digest('hex');
    return { ak, t, token };
}

/**
 * 构建带鉴权参数的URL
 */
function buildAuthUrl(path) {
    const auth = generateAuthToken(CONFIG.AK, CONFIG.SK);
    const url = new URL(path, CONFIG.BASE_URL);
    url.searchParams.set('ak', auth.ak);
    url.searchParams.set('t', auth.t);
    url.searchParams.set('token', auth.token);
    return url.toString();
}

/**
 * 发送 POST 请求
 */
async function postRequest(path, body) {
    const url = buildAuthUrl(path);
    
    console.log(`\n请求URL: ${url}`);
    console.log('请求体:', JSON.stringify(body, null, 2));
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        const statusCode = response.status;
        const responseText = await response.text();
        
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            responseData = responseText;
        }

        console.log(`响应状态: ${statusCode}`);
        console.log('响应内容:', JSON.stringify(responseData, null, 2));

        return {
            statusCode,
            data: responseData,
            success: statusCode >= 200 && statusCode < 300
        };
    } catch (error) {
        console.error('请求失败:', error.message);
        return {
            statusCode: 0,
            error: error.message,
            success: false
        };
    }
}

/**
 * 测试用例
 */
const tests = {
    /**
     * 测试 1: 刷新接口
     */
    async test1_RefreshCaches() {
        console.log('\n========== 测试 1: 刷新接口 (RefreshCaches) ==========');
        
        const body = {
            Files: CONFIG.TEST_URLS.map(url => ({ Url: url })),
            Dirs: CONFIG.TEST_DIRS.map(url => ({ Url: url }))
        };

        const result = await postRequest('/content/RefreshCaches', body);
        
        if (result.success && result.data.RefreshTaskId) {
            console.log(`✓ 测试通过 - 获得任务ID: ${result.data.RefreshTaskId}`);
            return { success: true, taskId: result.data.RefreshTaskId };
        } else {
            console.log('✗ 测试失败');
            return { success: false };
        }
    },

    /**
     * 测试 2: 预热接口
     */
    async test2_PreloadCaches() {
        console.log('\n========== 测试 2: 预热接口 (PreloadCaches) ==========');
        
        const body = {
            Urls: CONFIG.TEST_URLS.map(url => ({ Url: url }))
        };

        const result = await postRequest('/content/PreloadCaches', body);
        
        if (result.success && result.data.PreloadTaskId) {
            console.log(`✓ 测试通过 - 获得任务ID: ${result.data.PreloadTaskId}`);
            return { success: true, taskId: result.data.PreloadTaskId };
        } else {
            console.log('✗ 测试失败');
            return { success: false };
        }
    },

    /**
     * 测试 3: 刷新/预热进度查询
     */
    async test3_GetRefreshOrPreloadTask() {
        console.log('\n========== 测试 3: 刷新/预热进度查询 (GetRefreshOrPreloadTask) ==========');
        
        // 获取最近7天的任务
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const body = {
            StartTime: sevenDaysAgo.toISOString().replace('Z', '+0800'),
            EndTime: now.toISOString().replace('Z', '+0800'),
            PageSize: 20,
            PageNumber: 1
        };

        const result = await postRequest('/content/GetRefreshOrPreloadTask', body);
        
        if (result.success && result.data.Datas) {
            console.log(`✓ 测试通过 - 找到 ${result.data.TotalCount} 个任务`);
            if (result.data.Datas.length > 0) {
                console.log('任务示例:', result.data.Datas[0]);
            }
            return { success: true };
        } else {
            console.log('✗ 测试失败');
            return { success: false };
        }
    },

    /**
     * 测试 4: IP归属查询
     */
    async test4_IpCheck() {
        console.log('\n========== 测试 4: IP归属查询 (IpCheck) ==========');
        
        const body = {
            Ip: CONFIG.TEST_IPS
        };

        const result = await postRequest('/service/IpCheck', body);
        
        if (result.success && result.data.result) {
            console.log(`✓ 测试通过 - 查询了 ${result.data.result.length} 个IP`);
            result.data.result.forEach(ip => {
                console.log(`  ${ip.Ip}: CdnIp=${ip.CdnIp}, Region=${ip.Region || 'N/A'}`);
            });
            return { success: true };
        } else {
            console.log('✗ 测试失败');
            return { success: false };
        }
    },

    /**
     * 测试 5: 证书绑定 (需要真实的证书文件，此处仅测试接口连通性)
     */
    async test5_SetCertificateBind() {
        console.log('\n========== 测试 5: 证书绑定 (SetCertificate - bind) ==========');
        console.log('注意: 此测试需要真实的证书文件，当前仅测试参数验证');
        
        // 测试缺少参数的情况
        const body = {
            Domains: CONFIG.TEST_DOMAIN,
            Action: 'bind'
            // 故意不提供 ServerCertificate 和 PrivateKey 以测试参数验证
        };

        const result = await postRequest('/cert/SetCertificate', body);
        
        // 预期返回 400 错误（缺少必需参数）
        if (result.statusCode === 400) {
            console.log('✓ 测试通过 - 参数验证正常工作');
            return { success: true };
        } else {
            console.log('✗ 测试失败 - 应该返回 400 错误');
            return { success: false };
        }
    },

    /**
     * 测试 6: 证书解绑
     */
    async test6_SetCertificateUnbind() {
        console.log('\n========== 测试 6: 证书解绑 (SetCertificate - unbind) ==========');
        
        const body = {
            Domains: CONFIG.TEST_DOMAIN,
            Action: 'unbind'
        };

        const result = await postRequest('/cert/SetCertificate', body);
        
        // 可能成功或失败（取决于域名是否绑定了证书）
        if (result.statusCode === 200 || result.statusCode === 500) {
            console.log('✓ 测试通过 - 接口响应正常');
            return { success: true };
        } else {
            console.log('✗ 测试失败');
            return { success: false };
        }
    },

    /**
     * 测试 7: 证书信息查询
     */
    async test7_GetCertificates() {
        console.log('\n========== 测试 7: 证书信息查询 (GetCertificates) ==========');
        
        const body = {
            Domain: CONFIG.TEST_DOMAIN
        };

        const result = await postRequest('/cert/GetCertificates', body);
        
        // 可能成功(200)、未找到(404)或错误(500)
        if (result.statusCode === 200) {
            console.log('✓ 测试通过 - 查询到证书信息');
            console.log('证书信息:', result.data);
            return { success: true };
        } else if (result.statusCode === 404) {
            console.log('✓ 测试通过 - 域名未绑定证书（符合预期）');
            return { success: true };
        } else {
            console.log('✗ 测试失败');
            return { success: false };
        }
    },

    /**
     * 测试 8: 鉴权失败测试
     */
    async test8_AuthFailure() {
        console.log('\n========== 测试 8: 鉴权失败测试 ==========');
        
        // 使用错误的 token
        const url = new URL('/content/RefreshCaches', CONFIG.BASE_URL);
        url.searchParams.set('ak', CONFIG.AK);
        url.searchParams.set('t', Math.floor(Date.now() / 1000));
        url.searchParams.set('token', 'invalid_token_12345');
        
        console.log(`请求URL: ${url.toString()}`);
        
        try {
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    Files: [{ Url: 'http://test.com/test.txt' }]
                })
            });

            const statusCode = response.status;
            console.log(`响应状态: ${statusCode}`);

            if (statusCode === 401) {
                console.log('✓ 测试通过 - 正确拒绝了无效token');
                return { success: true };
            } else {
                console.log('✗ 测试失败 - 应该返回 401 错误');
                return { success: false };
            }
        } catch (error) {
            console.error('请求失败:', error.message);
            return { success: false };
        }
    },

    /**
     * 测试 9: 参数验证测试
     */
    async test9_ParameterValidation() {
        console.log('\n========== 测试 9: 参数验证测试 ==========');
        
        // 测试空参数
        const body = {
            Files: [],
            Dirs: []
        };

        const result = await postRequest('/content/RefreshCaches', body);
        
        if (result.statusCode === 400) {
            console.log('✓ 测试通过 - 正确验证了空参数');
            return { success: true };
        } else {
            console.log('✗ 测试失败 - 应该返回 400 错误');
            return { success: false };
        }
    }
};

/**
 * 运行所有测试或指定测试
 */
async function runTests() {
    console.log('==============================================');
    console.log('API Adapter 测试套件');
    console.log('==============================================');
    console.log(`测试服务器: ${CONFIG.BASE_URL}`);
    console.log(`使用AK: ${CONFIG.AK}`);
    console.log('==============================================');

    // 检查是否指定了特定的测试
    const testNumber = process.argv[2];
    
    const testList = Object.keys(tests).sort();
    let testsToRun = [];

    if (testNumber) {
        const testName = `test${testNumber}_`;
        const matchedTests = testList.filter(t => t.startsWith(testName));
        if (matchedTests.length === 0) {
            console.error(`\n错误: 未找到测试 ${testNumber}`);
            console.log('\n可用的测试:');
            testList.forEach((name, idx) => {
                const num = name.match(/test(\d+)_/)[1];
                const desc = name.replace(/test\d+_/, '').replace(/([A-Z])/g, ' $1');
                console.log(`  ${num}. ${desc}`);
            });
            process.exit(1);
        }
        testsToRun = matchedTests;
    } else {
        testsToRun = testList;
    }

    // 运行测试
    const results = [];
    for (const testName of testsToRun) {
        try {
            const result = await tests[testName]();
            results.push({
                name: testName,
                ...result
            });
        } catch (error) {
            console.error(`\n测试 ${testName} 执行出错:`, error.message);
            results.push({
                name: testName,
                success: false,
                error: error.message
            });
        }
    }

    // 输出测试总结
    console.log('\n\n==============================================');
    console.log('测试总结');
    console.log('==============================================');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    results.forEach(r => {
        const status = r.success ? '✓ 通过' : '✗ 失败';
        console.log(`${status} - ${r.name}`);
    });
    
    console.log('----------------------------------------------');
    console.log(`总计: ${results.length} | 通过: ${passed} | 失败: ${failed}`);
    console.log('==============================================\n');

    // 如果有失败的测试，退出码为 1
    if (failed > 0) {
        process.exit(1);
    }
}

// 运行测试
runTests().catch(error => {
    console.error('测试运行出错:', error);
    process.exit(1);
});

