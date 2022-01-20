
const getDataStringHook = (url, method="get", data=null, axios) => {
    return axios({
        url,
        method,
        data,
        reponseType: 'json'
    })
        .then(data => data.data);
};

const createHookItem = (optionItem, defaultMethod, defaultUrl) => {
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
                url: optionItem.url || defaultUrl
            };
        default:
            throw new Error(`Invalid ${defaultMethod} configuration`);
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


export const executeHook = (type, hook, data, axios) => {
    const hookType = typeof(hook);

    switch(hookType) {
        case "object" :
            return getDataStringHook(hook.url, hook.method, data, axios);
        case "function":
            return hook(data);
        default:
            return Promise.reject(`The ${type} hook must be a URL or a function returning a promise`);
    }
}
