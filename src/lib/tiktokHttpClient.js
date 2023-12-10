const axios = require('axios');
const TikTokCookieJar = require('./tiktokCookieJar');
const { deserializeMessage } = require('./webcastProtobuf.js');
const { signWebcastRequest } = require('./tiktokSignatureProvider');

const Config = require('./webcastConfig.js');
const proxy = {
    protocol: 'http',
    host: 'api.zyte.com',
    port: 8011,
    auth: {
        username: '',
        password: ''
    }
};
class TikTokHttpClient {
    constructor(customHeaders, axiosOptions, sessionId) {
        const { Cookie } = customHeaders || {};

        if (Cookie) {
            delete customHeaders['Cookie'];
        }

        this.axiosInstance = axios.create({
            timeout: 10000,
            headers: {
                ...Config.DEFAULT_REQUEST_HEADERS,
                ...customHeaders,
            },
            ...(axiosOptions || {}),
        });

        this.cookieJar = new TikTokCookieJar(this.axiosInstance);

        if (Cookie) {
            Cookie.split('; ').forEach((v) => this.cookieJar.processSetCookieHeader(v));
        }

        if (sessionId) {
            this.setSessionId(sessionId);
        }
    }

    #get(url, responseType) {
        return this.axiosInstance.get(url, { responseType });
    }

    #zyteProxyGet(url, responseType) {
        return this.axiosInstance.get(url, { responseType, proxy });
    }

    #zyteGet(url, responseType) {
        return this.axiosInstance.post(
            'https://api.zyte.com/v1/extract',
            { 
                url,
                "httpResponseBody": true,
            },
            {
                auth: { username: '' }
            }
        ).then((response) => { 
            const httpResponseBody = Buffer.from(
              response.data.httpResponseBody, 
              "base64"
            )
            return httpResponseBody;
        });
    }

    #post(url, params, data, responseType) {
        return this.axiosInstance.post(url, data, { params, responseType });
    }

    setSessionId(sessionId) {
        this.cookieJar.setCookie('sessionid', sessionId);
        this.cookieJar.setCookie('sessionid_ss', sessionId);
        this.cookieJar.setCookie('sid_tt', sessionId);
    }

    async #buildUrl(host, path, params, sign) {
        let fullUrl = `${host}${path}?${new URLSearchParams(params || {})}`;

        if (sign) {
            fullUrl = await signWebcastRequest(fullUrl, this.axiosInstance.defaults.headers, this.cookieJar);
        }

        return fullUrl;
    }

    async getMainPage(path) {
        let response = await this.#zyteGet(`${Config.TIKTOK_URL_WEB}${path}`);
        return response.data;
    }

    async getDeserializedObjectFromWebcastApi(path, params, schemaName, shouldSign) {
        let url = await this.#buildUrl(Config.TIKTOK_URL_WEBCAST, path, params, shouldSign);
        let response = await this.#get(url, 'arraybuffer');
        return deserializeMessage(schemaName, response.data);
    }

    async getJsonObjectFromWebcastApi(path, params, shouldSign) {
        let url = await this.#buildUrl(Config.TIKTOK_URL_WEBCAST, path, params, shouldSign);
        let response = await this.#get(url, 'json');
        return response.data;
    }

    async postFormDataToWebcastApi(path, params, formData) {
        let response = await this.#post(`${Config.TIKTOK_URL_WEBCAST}${path}`, params, formData, 'json');
        return response.data;
    }

    async getJsonObjectFromTiktokApi(path, params, shouldSign) {
        let url = await this.#buildUrl(Config.TIKTOK_URL_WEB, path, params, shouldSign);
        let response = await this.#get(url, 'json');
        return response.data;
    }
}

module.exports = TikTokHttpClient;
