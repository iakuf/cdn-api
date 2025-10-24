import sdk from './src/sdk.js';

const sdkObj = new sdk(
    '9JLZCITlaE61511PGx7r',
    'EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b',
    'http://apiv4.diansuyun.com/V4/',
    { debug: true }
);

// 查询域名详情
const api = 'Web.Domain.Info'; // 接口地址
try {
    const reqParams = {
        "domain": "cdn.listlive.cn"  // 要查询的域名
    }
    
    console.log(`\n调用 API: ${api}...`);
    console.log(`查询域名: ${reqParams.domain}`);
    
    const resp = await sdkObj.get(api, { query: reqParams });

    if (resp.bizCode === 1) {
        console.log(`${api} - 业务处理成功`);
        console.log(`  http_code: ${resp.httpCode}`);
        console.log(`\n域名详情:`);
        if (resp.bizData) {
            const data = resp.bizData;
            console.log(`  域名ID: ${data.id}`);
            console.log(`  用户ID: ${data.member_id}`);
            console.log(`  域名: ${data.domain}`);
            console.log(`  主域名: ${data.pri_domain}`);
            console.log(`  域名状态: ${data.status} (${data.status_desc})`);
            console.log(`  审核状态: ${data.check_status} (${data.check_status_desc})`);
            console.log(`  接入状态: ${data.access_progress}`);
            console.log(`  保护模式: ${data.protected_mode} (${data.protected_mode_desc})`);
            console.log(`  保护状态: ${data.protected_status} (${data.protected_status_desc})`);
            console.log(`  域名类型: ${data.domain_type}`);
            console.log(`  显隐转发状态: ${data.xy_refer_status}`);
            console.log(`  CNAME: ${data.cname}`);
            console.log(`  WAF防护: ${data.isWafAntiStatus === '1' ? '已开启' : '未开启'}`);
            console.log(`  创建时间: ${data.created_at}`);
            console.log(`  配置推送时间: ${data.ng_push_time}`);
            if (data.groups) {
                console.log(`  关联域名组:`, data.groups);
            }
            if (data.ori_domain) {
                console.log(`  原始域名: ${data.ori_domain}`);
            }
            if (data.back_source_reason) {
                console.log(`  回源原因: ${data.back_source_reason}`);
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


/* 响应示例
respBody: '{"status":{"code":1,"message":"操作成功"},"data":{"id":"89","member_id":"19","ca_id":"29","domain":"cdn.listlive.cn","pri_domain":"listlive.cn","status":"1","use_my_cname":"1","use_my_dns":"0","check_status":"4","is_record":"2","record_code":"","record_lock":"0","not_usemy_num":"0","zombiedomain":"0","back_source_reason":"","is_lock":"0","wait_active":"0","remark":"","hwws_status":"0","tjkd_status":"0","txt_verify":"1","file_verify":"1","protected_mode":"1","protected_status":"1","created_at":"2025-10-22 10:18:14","is_transfer":"0","is_transfer_alias":"0","transfer_alias_domain_id":"0","transfer_multi_port_status":"0","is_overseas":"0","biz_cover":"1","agent_member_id":"0","agent_app_id":"","agent_plat_type":"0","v3_domain_id":"0","v3_domain_type":"","is_new_dispatch":"0","icp_last_updated_at":"1999-09-09 09:09:09","domain_type":"1","cfw_migrate":"2","down_up_config":"pause","xy_refer_status":"1","fw_policy_status":"2","v3_disp_rsync":"","biz_type":"1","disp_v3":"0","ng_push_time":"2025-10-23 12:03:16","no_icp_action":"","first_protected_status":"1","status_change_time":"2025-10-22 10:18:14","del_node_action_status":"","config_updated_at":"2025-10-23 12:03:16.795959","gray_status":"normal","domain_redirect_status":1,"nodes":["183.204.220.83"],"ori_domain":"cdn.listlive.cn","private_node_status":"0","status_desc":"审核通过","check_status_desc":"手动审核成功","use_my_cname_desc":"已接入","protected_mode_desc":"cname","protected_status_desc":"开启","hwws_status_desc":"未开启","tjkd_status_desc":"未开启","cname_remark":"域名已配置源站且审核通过，可正常接入cname域名","cname":"265963d7.listlive.cn.cname.dswlcloud.com.","cname_arr":{"master":"265963d7.listlive.cn.cname.dswlcloud.com.","slaves":["265963d7.listlive.cn.cname.dswlcloud.com."]},"change_node_status":1,"tjkd_protected_status":"0","tjkd_plus_protected_status":"0","use_my":"1","use_my_errors":[],"use_my_desc":"已接入","cloud_dns_domain_id":0,"cdntpl_id":0,"cdntpl_name":"","isJoin":1,"isOpen":1,"isWafAntiStatus":1,"groups":[],"products":{"WEBAQJS":{"YD-WEBAQJS-SY":{"meal_flag":"YD-WEBAQJS-SY","product_flag":"WEBAQJS","package_id":"49"}}},"records":[{"id":"79","listen_port_id":"21","type":"A","view":"primary","value":"47.99.158.135","priority":"1","port":"443","listen_port":"443"}],"listen_ports":[{"id":"21","member_id":"19","domain_id":"89","listen_port":"443","protocol":"1","get_source_protocol":"1","load_balance":"1","back_source_type":"0","created_at":"2025-10-22 11:26:53","updated_at":"2025-10-22 15:08:08","records_list":[{"id":"79","domain_id":"89","listen_port_id":"21","type":"A","view":"primary","value":"47.99.158.135","priority":"1","port":"443","mx":"0","ttl":"600","record_sort":"0","status":"1","created_at":"2025-10-22 15:08:08","updated_at":"2025-10-22 15:08:08"}]}],"tcp_package":[],"scdn_package":{"meal_flag":"YD-WEBAQJS-SY","product_flag":"WEBAQJS","package_id":"49","package_name":"商业版","package_diy_name":"商业版"},"access_progress":5,"show_live":0},"fromCache":false}',
*/