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

const getDataStringHook = (hook, data=null, axios) => {

    const options = {
        url: hook.url,
        method: hook.method || "get",
        data,
        reponseType: 'json'
    };

    if (hook.headers) {
        options.headers = hook.headers;
    }

    if (hook?.fields?.length) {
        setFields(options, hook);
    }

    return axios(options)
        .then(data => data.data);
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

                return ()=> Promise.resolve([]);
            } else {
                return {
                    method: defaultMethod,
                    url: defaultUrl,
                    fields: options.fields || [],
                    headers: options.headers || {}
                };
            }
        case "function":
            return (data)=> Promise.resolve(optionItem(data));
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
    const hookType = typeof(hook);

    switch(hookType) {
        case "object" :
            return getDataStringHook(hook, data, axios);
        case "function":
            const res = hook(data);
            return typeof(res) === "string" ? getDataStringHook(res, data, axios) : res;
        default:
            return Promise.reject(`The ${type} hook must be a URL or a function returning a promise`);
    }
}
