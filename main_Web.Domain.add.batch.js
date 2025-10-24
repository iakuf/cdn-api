import sdk from './src/sdk.js';



const sdkObj = new sdk(
    '9JLZCITlaE61511PGx7r',
    'EIR7D2E93vd9ATTGHW4LFq1bu4tCgA1b',
    'http://apiv4.diansuyun.com/V4/',
    { debug: true }
);

const api = 'Web.Domain.add.batch'; // 接口地址
try {

    const reqParams = {
        data: {
            // 根据 API 文档，请求 body 需要一个 domain 数组
            domain: [
                "cdn1.listlive.cn"
            ]
        }
    };

    console.log(`\n调用 API: ${api}...`);
    const resp = await sdkObj.post(api, reqParams);

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
/* 响应示例
[DEBUG] Response: {
  httpCode: 200,
  respBody: '{"status":{"code":1,"message":"操作成功"},"data":{"list":{"91":"cdn1.listlive.cn"},"list2":[{"id":"91","member_id":"19","ca_id":"0","domain":"cdn1.listlive.cn","pri_domain":"listlive.cn","status":"1","rsync":"1","check":"0","use_my_cname":"0","use_my_dns":"0","in_observe":"0","check_status":"4","is_record":"2","record_code":"","record_lock":"0","dns_server_used":"0","not_usemy_num":"0","zombiedomain":"0","back_source_reason":"","is_lock":"0","wait_active":"0","cname_name":"6e1c52bc","cname_server":"dswlcloud.com","remark":"","hwws_status":"0","tjkd_status":"0","txt_verify":"1","file_verify":"1","protected_mode":"1","protected_status":"0","created_at":"2025-10-24 14:24:45","is_transfer":"0","is_transfer_alias":"0","transfer_alias_domain_id":"0","transfer_multi_port_status":"0","is_overseas":"0","biz_cover":"1","agent_member_id":"0","agent_app_id":"","agent_plat_type":"0","v3_domain_id":"0","v3_domain_type":"","is_new_dispatch":"0","icp_last_updated_at":"1999-09-09 09:09:09","domain_type":"1","cfw_migrate":"2","down_up_config":"pause","xy_refer_status":"1","fw_policy_status":"2","v3_disp_rsync":"","biz_type":"1","updated_at":"2025-10-24 14:24:45","disp_v3":"0","ng_push_time":"0000-00-00 00:00:00","no_icp_action":"","first_protected_status":"0","status_change_time":"2025-10-24 14:24:45","del_node_action_status":"","config_updated_at":"2025-10-24 14:24:45.212029","gray_status":"normal","cname_remark":"请先为域名配置源站，然后找运营人员审核通过，再正式接入cname域名","cname":"6e1c52bc.listlive.cn.cname.dswlcloud.com.","cname_slaves":["6e1c52bc.listlive.cn.cname.dswlcloud.com."]}]}}',
  bizCode: 1,
  bizMsg: '操作成功',
  bizData: { list: { '91': 'cdn1.listlive.cn' }, list2: [ [Object] ] }
}
  */