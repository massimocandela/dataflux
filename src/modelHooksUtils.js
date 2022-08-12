/*
 * MIT License
 *
 * Copyright (c) 2022 Massimo Candela <https://massimocandela.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import brembo from "brembo";
import batchPromises from "batch-promises";

const getDataStringHook = (hook, data=null, axios) => {

    const batch = hook.batch ?? false;
    const options = {
        url: hook.url,
        method: (hook.method || "get").toLowerCase(),
        reponseType: 'json'
    };

    if (hook.headers) {
        options.headers = hook.headers;
    }

    if (hook?.fields?.length) {
        setFields(options, hook);
    }

    if (options.method === "get") {
        return axios(options)
            .then(data => data.data);
    } else if (batch) {
        return axios({
            ...options,
            data
        })
            .then(data => data.data);
    } else {
        const out = [];
        return batchPromises(4, data, item => {
            return axios({
                ...options,
                data: item
            })
                .then(data => out.push(data.data));
        })
            .then(() => out);
    }

};

const setFields = (options, hook) => {
    options.headers = options.headers || {};
    options.headers['X-Fields'] = hook.fields;

    options.url = brembo.build(options.url, {
        params: {
            fields: hook.fields.join(",")
        }
    });
}

const createHookItem = (optionItem, defaultMethod, defaultUrl, options) => {
    switch(typeof(optionItem)) {
        case "undefined":
            if (!defaultUrl) {
                console[console.warn?"warn":"log"](`The ${defaultMethod} operations will not work, there is no valid url or function for it.`);

                return () => Promise.resolve([]);
            } else {
                return {
                    method: defaultMethod,
                    url: defaultUrl,
                    fields: options.fields || [],
                    headers: options.headers || {}
                };
            }
        case "function":
            return (data) => {
                const res = optionItem(data);

                if (typeof(res) === "string") {
                    return {
                        method: defaultMethod,
                        url: res,
                        fields: options.fields || [],
                        headers: options.headers || {}
                    };
                } else {
                    return Promise.resolve(res);
                }
            }
        case "object":
            return {
                method: optionItem.method || defaultMethod,
                url: optionItem.url || defaultUrl,
                fields: options.fields || [],
                headers: optionItem.headers || options.headers || {}
            };
        default:
            throw new Error(`Invalid ${defaultMethod} configuration`);
    }
}

export const getHooksFromOptions = (options) => {
    const defaultUrl = typeof(options.retrieve) === "function" ? null : options.retrieve.url;

    return [
        createHookItem(options.retrieve, "get", defaultUrl, options),
        createHookItem(options.insert, "post", defaultUrl, options),
        createHookItem(options.update, "put", defaultUrl, options),
        createHookItem(options.delete, "delete", defaultUrl, options)
    ];
};


export const getHooksFromUrl = (url) => {
    return [
        {
            method: "get",
            url
        },
        {
            method: "post",
            url
        },
        {
            method: "put",
            url
        },
        {
            method: "delete",
            url
        }
    ];
};


export const executeHook = (type, hook, data, axios) => {
    try {
        const hookType = typeof (hook);

        switch (hookType) {
            case "object" :
                return getDataStringHook(hook, data, axios);
            case "function":
                const res = hook(data);

                if (res.method && res.url && res.headers) {
                    return getDataStringHook(res, data, axios);
                } else {
                    return res;
                }
            default:
                return Promise.reject(`The ${type} hook must be a URL or a function returning a promise`);
        }
    } catch (e) {
        return Promise.reject(e);
    }
}
