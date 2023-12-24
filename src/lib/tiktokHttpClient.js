const axios = require('axios');
const request = require('postman-request');
const fs = require('fs');
const path = require('path');

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

    #zyteProxyGet(url, responseType) {
        return this.axiosInstance.get(url, { responseType, proxy });
    }

    #get(url, responseType, zyte = false, zyteProxy = false) {
        const options = { 
            url
        };
        if (zyteProxy) {
            
            // BEGIN trying to use zyte smart proxy
            /*
            console.log(`zyteProxyGet ${url}`);
            var proxyRequest = request.defaults({
                'proxy': 'http://51213b14140b42b7ba1e16035874c797:@proxy.crawlera.com:8011'
            });
            let filePath = path.resolve(__dirname, '../proto/proto/zyte-ca.crt');

            var thisoptions = {
                url: url,
                ca: fs.readFileSync(filePath), 
                requestCert: true,
                rejectUnauthorized: true
            };

            function callback(error, response, body) {
                if (!error && response.statusCode == 200) {
                    console.log(response.headers);
                    console.log(body);
                }
                else {
                    console.log(error, response, body);
                }
            }

            proxyRequest(thisoptions, callback);
            */
            // END trying to use zyte smart proxy

            // No proxy
            return this.axiosInstance.get(url, { responseType });

            // Trying to use zyte API proxy
            // return this.axiosInstance.get(url, { responseType, proxy });
        } else {
            options.httpResponseBody = true;
        }
        if (zyte) {
            return this.axiosInstance.post(
                'https://api.zyte.com/v1/extract',
                options,
                {
                    auth: { username: '' }
                }
            ).then((response) => {
                let responseBody;
                if (responseType === 'arraybuffer') {
                    responseBody = Buffer.from(
                        response.data, 
                        "binary"
                    );
                }
                else {
                    responseBody = Buffer.from(
                        response.data.httpResponseBody, 
                        "base64"
                    );
                }
                return responseBody;
            });
        }
        return this.axiosInstance.get(url, { responseType });
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

    async getMainPage(path, zyte = false) {
        let response = await this.#get(`${Config.TIKTOK_URL_WEB}${path}`, zyte);
        return response.data;
    }

    async getDeserializedObjectFromWebcastApi(path, params, schemaName, shouldSign, zyte = false, zyteProxy = false) {
        let url = await this.#buildUrl(Config.TIKTOK_URL_WEBCAST, path, params, shouldSign);
        let response = await this.#get(url, 'arraybuffer', zyte, zyteProxy);
        return deserializeMessage(schemaName, response.data);
    }

    async getJsonObjectFromWebcastApi(path, params, shouldSign, zyte = false, zyteProxy = false) {
        let url = await this.#buildUrl(Config.TIKTOK_URL_WEBCAST, path, params, shouldSign);
        let response = await this.#get(url, 'json', zyte, zyteProxy);
        return response.data;
    }

    async postFormDataToWebcastApi(path, params, formData) {
        let response = await this.#post(`${Config.TIKTOK_URL_WEBCAST}${path}`, params, formData, 'json');
        return response.data;
    }

    async getJsonObjectFromTiktokApi(path, params, shouldSign, zyte = false, zyteProxy = false) {
        let url = await this.#buildUrl(Config.TIKTOK_URL_WEB, path, params, shouldSign);
        let response = await this.#get(url, 'json', zyte, zyteProxy);
        return response.data;
    }
}

module.exports = TikTokHttpClient;
