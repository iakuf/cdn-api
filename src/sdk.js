const crypto = require('crypto');

const SDK_VERSION = "1.0.0";

/**
 * diansuyun.com API SDK for JavaScript/Node.js
 */
class Sdk {
    /**
     * @param {string} appId 分配的 app_id
     * @param {string} appSecret 分配的 app_secret, 用于签名
     * @param {string} apiPre API 地址前缀, e.g., 'https://api.local.com/V4/'
     * @param {object} [options={}] 可选参数
     * @param {number} [options.userId=0] 当前使用者的用户ID
     * @param {number} [options.timeout=30] 请求超时时间 (秒)
     * @param {boolean} [options.debug=false] 是否开启调试模式
     */
    constructor(appId, appSecret, apiPre, options = {}) {
        if (!appId || !appSecret || !apiPre) {
            throw new Error('appId, appSecret, and apiPre are required.');
        }
        this.appId = appId;
        this.appSecret = appSecret;
        this.apiPre = apiPre.endsWith('/') ? apiPre : `${apiPre}/`;
        this.userId = options.userId || 0;
        this.timeout = (options.timeout || 30) * 1000; // a fetch timeout is in ms
        this.debug = options.debug || false;
        this.userAgent = `Sdk-js ${SDK_VERSION}; node ${process.version}; arch/${process.arch}; os/${process.platform}`;
    }

    /**
     * 递归地将对象的所有值转换为字符串。
     * @param {*} data - The input data.
     * @returns {*} - The data with all values converted to strings.
     * @private
     */
    _mapStrval(data) {
        if (data === null || typeof data !== 'object') {
            return String(data);
        }

        const result = Array.isArray(data) ? [] : {};

        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                if (value === null) {
                    result[key] = '';
                } else if (typeof value === 'object') {
                    result[key] = this._mapStrval(value); // 递归调用
                } else {
                    result[key] = String(value);
                }
            }
        }
        return result;
    }

    /**
     * 将对象扁平化以便于排序和签名。
     * @param {object} obj - The object to flatten.
     * @param {string} [prefix=''] - The prefix for keys.
     * @param {object} [res={}] - The result object.
     * @returns {object} - The flattened object.
     * @private
     */
    _flattenObject(obj, prefix = '', res = {}) {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const newKey = prefix ? `${prefix}[${key}]` : key;
                const value = obj[key];
                if (value !== null && typeof value === 'object') {
                    this._flattenObject(value, newKey, res);
                } else {
                    res[newKey] = value;
                }
            }
        }
        return res;
    }

    /**
     * 为 GET 请求构建查询字符串，key 按字母顺序排序。
     * @param {object} data - The data object for the query string.
     * @returns {string} - The URL-encoded query string.
     * @private
     */
    _buildQueryString(data) {
        const flattened = this._flattenObject(this._mapStrval(data));
        const keys = Object.keys(flattened).sort();
        return keys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(flattened[k])}`).join('&');
    }

    /**
     * 创建一个JSON字符串，其对象的键按字母顺序排序。
     * 这对于匹配Go实现的签名至关重要。
     * @param {*} data - The data to stringify.
     * @returns {string} - The JSON string with sorted keys.
     * @private
     */
    _getSortedJsonString(data) {
        if (data === null || typeof data !== 'object') {
            return JSON.stringify(data);
        }

        if (Array.isArray(data)) {
            const arrayItems = data.map(item => this._getSortedJsonString(item));
            return `[${arrayItems.join(',')}]`;
        }

        const sortedKeys = Object.keys(data).sort();
        const objectParts = sortedKeys.map(key => {
            const value = this._getSortedJsonString(data[key]);
            return `${JSON.stringify(key)}:${value}`;
        });

        return `{${objectParts.join(',')}}`;
    }

    /**
     * 生成签名.
     * @param {object} signData - 用于签名的数据.
     * @returns {string} The generated signature.
     * @private
     */
    _sign(signData) {
        // 使用自定义的字符串化函数以确保键已排序，从而匹配Go的行为。
        const jsonString = this._getSortedJsonString(signData);
        
        if (this.debug) {
            console.log(`[DEBUG] JSON string for signing: ${jsonString}`);
        }

        // Base64 编码并替换特殊字符以匹配 Go SDK 的逻辑
        const encodedPayload = Buffer.from(jsonString).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        const hmac = crypto.createHmac('sha256', this.appSecret);
        hmac.update(encodedPayload);
        const hashedSig = hmac.digest('base64');

        // 再次替换特殊字符
        const encodedSig = hashedSig
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        return encodedSig;
    }

    /**
     * 准备请求的 payload 和 headers。
     * @param {string} method - The HTTP method.
     * @param {object} reqParams - The request parameters.
     * @returns {{headers: object, data: object, query: object}}
     * @private
     */
    _preparePayload(method, reqParams) {
        const issuedAt = Math.floor(Date.now() / 1000);
        const headers = reqParams.headers || {};
        const query = reqParams.query || {};
        const data = reqParams.data || {};

        const basePayload = {
            user_id: String(this.userId),
            client_ip: '', // 根据 Go SDK，这里为空
            client_userAgent: this.userAgent,
            algorithm: 'HMAC-SHA256',
            issued_at: issuedAt,
        };

        let signData;
        if (method === 'GET') {
            Object.assign(query, basePayload);
            signData = this._mapStrval(query);
        } else {
            Object.assign(data, basePayload);
            signData = data;
        }

        const signStr = this._sign(signData);

        headers['X-Auth-Sign'] = signStr;
        headers['X-Auth-App-Id'] = this.appId;
        headers['X-Auth-Sdk-Version'] = SDK_VERSION;
        headers['Content-Type'] = 'application/json; charset=utf-8';
        headers['User-Agent'] = this.userAgent;
        
        return { headers, data, query };
    }

    /**
     * 执行 HTTP 请求。
     * @param {string} api - The API endpoint URI.
     * @param {string} method - The HTTP method (GET, POST, etc.).
     * @param {object} [reqParams={}] - The request parameters.
     * @returns {Promise<object>} - The response from the API.
     */
    async request(api, method, reqParams = {}) {
        const upperMethod = method.toUpperCase();
        
        const { headers, data, query } = this._preparePayload(upperMethod, {
            query: reqParams.query ? { ...reqParams.query } : {},
            data: reqParams.data ? { ...reqParams.data } : {},
            headers: reqParams.headers ? { ...reqParams.headers } : {}
        });

        let url = this.apiPre + (api.startsWith('/') ? api.substring(1) : api);
        const queryString = this._buildQueryString(query);
        if (queryString) {
            url += `?${queryString}`;
        }
        
        const requestOptions = {
            method: upperMethod,
            headers: headers,
            signal: AbortSignal.timeout(this.timeout),
        };

        if (upperMethod !== 'GET' && upperMethod !== 'HEAD') {
            requestOptions.body = JSON.stringify(data);
        }
        
        if (this.debug) {
            console.log(`[DEBUG] Request URL: ${url}`);
            console.log(`[DEBUG] Request Options:`, requestOptions);
        }

        try {
            const httpResponse = await fetch(url, requestOptions);
            const respBody = await httpResponse.text();
            
            const response = {
                httpCode: httpResponse.status,
                respBody: respBody,
                bizCode: 0,
                bizMsg: `HTTP Error: ${httpResponse.statusText}`,
                bizData: null,
            };

            if (httpResponse.ok) {
                try {
                    const parsedBody = JSON.parse(respBody);
                    if (parsedBody.status && typeof parsedBody.status.code !== 'undefined') {
                        response.bizCode = parsedBody.status.code;
                        response.bizMsg = parsedBody.status.message;
                        response.bizData = parsedBody.data || null;
                    } else {
                        response.bizMsg = "The json format of response body has no status field.";
                    }
                } catch (e) {
                    response.bizMsg = `JSON parse response body error: ${e.message}`;
                    throw new Error(response.bizMsg);
                }
            }
            
            if (this.debug) {
                 console.log(`[DEBUG] Response:`, response);
            }

            return response;
        } catch (error) {
            if (this.debug) {
                console.error(`[DEBUG] Request failed:`, error);
            }
            // 包装错误以便上层可以捕获
            throw new Error(`Request failed: ${error.message}`);
        }
    }

    /**
     * 发送 GET 请求
     * @param {string} api - The API endpoint URI.
     * @param {object} [reqParams={}] - The request parameters.
     * @returns {Promise<object>}
     */
    async get(api, reqParams = {}) {
        return this.request(api, 'GET', reqParams);
    }

    /**
     * 发送 POST 请求
     * @param {string} api - The API endpoint URI.
     * @param {object} [reqParams={}] - The request parameters.
     * @returns {Promise<object>}
     */
    async post(api, reqParams = {}) {
        return this.request(api, 'POST', reqParams);
    }

    /**
     * 发送 PUT 请求
     * @param {string} api - The API endpoint URI.
     * @param {object} [reqParams={}] - The request parameters.
     * @returns {Promise<object>}
     */
    async put(api, reqParams = {}) {
        return this.request(api, 'PUT', reqParams);
    }

    /**
     * 发送 DELETE 请求
     * @param {string} api - The API endpoint URI.
     * @param {object} [reqParams={}] - The request parameters.
     * @returns {Promise<object>}
     */
    async delete(api, reqParams = {}) {
        return this.request(api, 'DELETE', reqParams);
    }
}

module.exports = Sdk;
