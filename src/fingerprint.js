const md5 = require("md5");

const _getFingerprint = (object) => {

    switch(typeof(object)) {
        case "object":
            return markType(object, (object !== null) ? getObjectFingerprint(object) : "null");
        case "boolean":
            return markType(object, object.toString());
        case "function":
            throw new Error("You cannot pass a function as data item");
        case "number":
            return markType(object, object.toString());
        case "string":
            return markType(object, object);
        case "undefined":
            return markType(object, "undefined");
    }
};


const markType = (object, fingerprint) => {
    return typeof(object) + ":" + fingerprint;
};

const getObjectFingerprint = (value) => {
    const sortedKeys = Object.keys(value).sort();
    let buff = "";

    for (let key of sortedKeys) {
        buff += key + "<" + fingerprint(value[key]) + ">";
    }

    return buff;
};

export default function fingerprint(object) {
    return md5(_getFingerprint(object));
}