import axios from "axios";

const getDataStringHook = (url, method="get", data=null) => {
    return axios({
        url,
        method,
        data,
        reponseType: 'json'
    })
        .then(data => data.data);
};

const createHookItem = (optionItem, defaultMethod, defaultUrl) => {
    if (typeof(optionItem) === "function") {
        return optionItem;
    } else {
        return {
            method: optionItem.method || defaultMethod,
            url: optionItem.url || defaultUrl
        };
    }
}

export const getHooksFromOptions = (options) => {
    const defaultUrl = typeof(options.retrieve) === "function" ? null : options.retrieve.url;

    return [
        createHookItem(options.retrieve, "get", defaultUrl),
        createHookItem(options.insert, "post", defaultUrl),
        createHookItem(options.update, "put", defaultUrl),
        createHookItem(options.delete, "delete", defaultUrl)
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


export const executeHook = (type, hook, data) => {
    const hookType = typeof(hook);

    switch(hookType) {
        case "object" :
            return getDataStringHook(hook.url, hook.method, data);
        case "function":
            return hook(data);
        default:
            return Promise.reject(`The ${type} hook must be a URL or a function returning a promise`);
    }
}
