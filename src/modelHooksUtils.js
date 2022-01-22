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

    if (hook.fields) {
        setFields(options, hook);
    }

    return axios(options)
        .then(data => data.data);
};

const setFields = (options, hook) => {
    options.headers = options.headers || {};
    options.headers['X-Fields'] = hook.fields;

    options.url = brembo.build(options.url, {
        params: {fields: hook.fields.join(",")}
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
                    url: defaultUrl
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
            return hook(data);
        default:
            return Promise.reject(`The ${type} hook must be a URL or a function returning a promise`);
    }
}
