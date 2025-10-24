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

// 流量统计
const api = 'stats_data.cdn.domain.node.flow.bandwidth'; // 接口地址
try {
  

    const reqParams = {
        "acct_id": 0,
        "start_time": "2025-10-22 11:39:00",
        "end_time": "2025-10-22 11:55:59",
        "sub_domains": [
            "cdn.listlive.cn"
        ],
        "interval": "1m"
    }
    console.log(`\n调用 API: ${api}...`);
    console.log(`证书名称: ${reqParams.ca_name}`);
    
    const resp = await sdkObj.post(api, { data: reqParams });

    if (resp.bizCode === 1) {
        console.log(`${api} - 业务处理成功`);
        console.log(`  http_code: ${resp.httpCode}`);
    } else {
        // 业务失败，打印失败信息
        console.log(`${api} - 业务处理失败: ${resp.bizMsg}`);
        console.log(`  http_code: ${resp.httpCode}`);
    }

} catch (err) {
    // 网络请求或SDK内部错误
    console.error(`API '${api}' 调用失败:`, err.message);
}

/* [DEBUG] Response: {
  httpCode: 200,
  respBody: '{"status":{"code":1,"message":"操作成功"},"data":{"hit_cache_flow":{"description":"hit cache flow trend","trend":{"x_data":["2025-10-22 11:39:00","2025-10-22 11:40:00","2025-10-22 11:41:00","2025-10-22 11:42:00","2025-10-22 11:43:00","2025-10-22 11:44:00","2025-10-22 11:45:00","2025-10-22 11:46:00","2025-10-22 11:47:00","2025-10-22 11:48:00","2025-10-22 11:49:00","2025-10-22 11:50:00","2025-10-22 11:51:00","2025-10-22 11:52:00","2025-10-22 11:53:00","2025-10-22 11:54:00","2025-10-22 11:55:00"],"y_data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"total":{"unit":"B","total":0},"proportion":{"percent":0}},"fetch_source_flow":{"description":"fetch source flow trend","trend":{"x_data":["2025-10-22 11:39:00","2025-10-22 11:40:00","2025-10-22 11:41:00","2025-10-22 11:42:00","2025-10-22 11:43:00","2025-10-22 11:44:00","2025-10-22 11:45:00","2025-10-22 11:46:00","2025-10-22 11:47:00","2025-10-22 11:48:00","2025-10-22 11:49:00","2025-10-22 11:50:00","2025-10-22 11:51:00","2025-10-22 11:52:00","2025-10-22 11:53:00","2025-10-22 11:54:00","2025-10-22 11:55:00"],"y_data":[0,0,0,0,0,0,0,0,31001,0,0,2026,4432,0,0,0,0]},"total":{"unit":"B","total":37459},"proportion":{"percent":100}},"total_flow":{"description":"total flow trend","trend":{"x_data":["2025-10-22 11:39:00","2025-10-22 11:40:00","2025-10-22 11:41:00","2025-10-22 11:42:00","2025-10-22 11:43:00","2025-10-22 11:44:00","2025-10-22 11:45:00","2025-10-22 11:46:00","2025-10-22 11:47:00","2025-10-22 11:48:00","2025-10-22 11:49:00","2025-10-22 11:50:00","2025-10-22 11:51:00","2025-10-22 11:52:00","2025-10-22 11:53:00","2025-10-22 11:54:00","2025-10-22 11:55:00"],"y_data":[0,0,0,0,0,0,0,0,31001,0,0,2026,4432,0,0,0,0]},"total":{"unit":"B","total":37459},"max":{"unit":"B","max_key":"2025-10-22 11:47:00","max":31001},"min":{"unit":"B","min_key":"2025-10-22 11:39:00","min":0}},"fetch_source_bandwidth":{"description":"fetch source bandwidth trend","trend":{"x_data":["2025-10-22 11:39:00","2025-10-22 11:40:00","2025-10-22 11:41:00","2025-10-22 11:42:00","2025-10-22 11:43:00","2025-10-22 11:44:00","2025-10-22 11:45:00","2025-10-22 11:46:00","2025-10-22 11:47:00","2025-10-22 11:48:00","2025-10-22 11:49:00","2025-10-22 11:50:00","2025-10-22 11:51:00","2025-10-22 11:52:00","2025-10-22 11:53:00","2025-10-22 11:54:00","2025-10-22 11:55:00"],"y_data":[0,0,0,0,0,0,0,0,4133,0,0,270,590,0,0,0,0]},"max":{"unit":"bps","max_key":"2025-10-22 11:47:00","max":4133}},"total_bandwidth":{"description":"total bandwidth trend","trend":{"x_data":["2025-10-22 11:39:00","2025-10-22 11:40:00","2025-10-22 11:41:00","2025-10-22 11:42:00","2025-10-22 11:43:00","2025-10-22 11:44:00","2025-10-22 11:45:00","2025-10-22 11:46:00","2025-10-22 11:47:00","2025-10-22 11:48:00","2025-10-22 11:49:00","2025-10-22 11:50:00","2025-10-22 11:51:00","2025-10-22 11:52:00","2025-10-22 11:53:00","2025-10-22 11:54:00","2025-10-22 11:55:00"],"y_data":[0,0,0,0,0,0,0,0,4133,0,0,270,590,0,0,0,0]},"total":{"unit":"bps","total":4993},"max":{"unit":"bps","max_key":"2025-10-22 11:47:00","max":4133},"min":{"unit":"bps","min_key":"2025-10-22 11:39:00","min":0}},"hit_cache_bandwidth":{"description":"hit cache bandwidth trend","trend":{"x_data":["2025-10-22 11:39:00","2025-10-22 11:40:00","2025-10-22 11:41:00","2025-10-22 11:42:00","2025-10-22 11:43:00","2025-10-22 11:44:00","2025-10-22 11:45:00","2025-10-22 11:46:00","2025-10-22 11:47:00","2025-10-22 11:48:00","2025-10-22 11:49:00","2025-10-22 11:50:00","2025-10-22 11:51:00","2025-10-22 11:52:00","2025-10-22 11:53:00","2025-10-22 11:54:00","2025-10-22 11:55:00"],"y_data":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},"max":{"unit":"bps","max_key":"2025-10-22 11:39:00","max":0}},"95_bandwidth":{"description":"95 bandwidth trend","trend":{"x_data":["2025-10-22 11:39:00","2025-10-22 11:40:00","2025-10-22 11:41:00","2025-10-22 11:42:00","2025-10-22 11:43:00","2025-10-22 11:44:00","2025-10-22 11:45:00","2025-10-22 11:46:00","2025-10-22 11:47:00","2025-10-22 11:48:00","2025-10-22 11:49:00","2025-10-22 11:50:00","2025-10-22 11:51:00","2025-10-22 11:52:00","2025-10-22 11:53:00","2025-10-22 11:54:00","2025-10-22 11:55:00"],"y_data":[826,826,826,826,826,826,826,826,826,826,826,826,826,826,826,826,826]},"total":{"unit":"bps","total":826}}}}',
  bizCode: 1,
  bizMsg: '操作成功',
  bizData: {
    hit_cache_flow: {
      description: 'hit cache flow trend',
      trend: [Object],
      total: [Object],
      proportion: [Object]
    },
    fetch_source_flow: {
      description: 'fetch source flow trend',
      trend: [Object],
      total: [Object],
      proportion: [Object]
    },
    total_flow: {
      description: 'total flow trend',
      trend: [Object],
      total: [Object],
      max: [Object],
      min: [Object]
    },
    fetch_source_bandwidth: {
      description: 'fetch source bandwidth trend',
      trend: [Object],
      max: [Object]
    },
    total_bandwidth: {
      description: 'total bandwidth trend',
      trend: [Object],
      total: [Object],
      max: [Object],
      min: [Object]
    },
    hit_cache_bandwidth: {
      description: 'hit cache bandwidth trend',
      trend: [Object],
      max: [Object]
    },
    '95_bandwidth': {
      description: '95 bandwidth trend',
      trend: [Object],
      total: [Object]
    }
  }
}
  */