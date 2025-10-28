// 域名配置检查脚本 - 诊断缓存刷新失败问题
import DiansuyunSDK from './src/sdk.js';

const sdkObj = new DiansuyunSDK(
    '9JLZCITlaE61511PGx7r',
    'EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b',
    'http://apiv4.diansuyun.com/V4/',
    { debug: true }
);

async function checkDomain() {
    try {
        console.log('\n========================================');
        console.log('诊断: 缓存刷新失败 (错误码 -27)');
        console.log('========================================\n');
        
        const testDomain = 'cdn.listlive.cn';
        const testUrl = 'http://cdn.listlive.cn/test.txt';
        
        // 1. 检查域名信息
        console.log('步骤 1: 检查域名是否已配置...');
        console.log('测试域名:', testDomain);
        console.log('测试URL:', testUrl);
        console.log('');
        
        const domainInfoResp = await sdkObj.get('/V4/Web.Domain.Info', {
            query: { domain: testDomain }
        });
        
        console.log('域名信息查询结果:');
        console.log('  业务代码 (bizCode):', domainInfoResp.bizCode);
        console.log('  业务消息 (bizMsg):', domainInfoResp.bizMsg);
        
        if (domainInfoResp.bizCode === 1) {
            console.log('\n✓ 域名已配置在CDN系统中');
            console.log('\n域名详细信息:');
            console.log(JSON.stringify(domainInfoResp.bizData, null, 2));
        } else {
            console.log('\n✗ 域名未配置或查询失败');
            console.log('');
            console.log('【问题诊断】');
            console.log('缓存刷新失败的原因可能是:');
            console.log('1. 域名 "cdn.listlive.cn" 未在点速云CDN系统中添加');
            console.log('2. 域名配置异常或已被删除');
            console.log('3. 当前账号无权限访问该域名');
            console.log('');
            console.log('【解决方案】');
            console.log('1. 登录点速云控制台检查域名是否存在');
            console.log('2. 如果域名不存在,需要先添加域名到CDN系统');
            console.log('3. 确认域名状态为"运行中"');
            console.log('4. 使用已配置的域名进行测试');
        }
        
        // 2. 尝试使用POST方法提交缓存刷新
        console.log('\n========================================');
        console.log('步骤 2: 尝试使用POST方法提交缓存刷新');
        console.log('========================================\n');
        
        const reqParams = {
            data: {
                specialurl: [testUrl],
                specialdir: []
            }
        };
        
        console.log('请求参数:', JSON.stringify(reqParams, null, 2));
        console.log('');
        
        // 先用POST试试
        console.log('方法: POST');
        const postResult = await sdkObj.post('/V4/Web.Domain.DashBoard.saveCache', reqParams);
        console.log('POST结果:');
        console.log('  bizCode:', postResult.bizCode);
        console.log('  bizMsg:', postResult.bizMsg);
        console.log('  bizData:', JSON.stringify(postResult.bizData, null, 2));
        
        if (postResult.bizCode === 1) {
            console.log('\n✓ POST方法成功!');
        } else if (postResult.bizCode === -27) {
            console.log('\n✗ POST方法也返回 -27 错误');
            
            // 3. 再用PUT试试
            console.log('\n方法: PUT');
            const putResult = await sdkObj.put('/V4/Web.Domain.DashBoard.saveCache', reqParams);
            console.log('PUT结果:');
            console.log('  bizCode:', putResult.bizCode);
            console.log('  bizMsg:', putResult.bizMsg);
            console.log('  bizData:', JSON.stringify(putResult.bizData, null, 2));
            
            if (putResult.bizCode === 1) {
                console.log('\n✓ PUT方法成功!');
            } else {
                console.log('\n✗ PUT方法也失败');
            }
        }
        
        console.log('\n========================================');
        console.log('诊断完成');
        console.log('========================================\n');
        
    } catch (error) {
        console.error('\n✗ 执行失败:', error.message);
        console.error('错误详情:', error);
    }
}

// 运行诊断
checkDomain().catch(console.error);

