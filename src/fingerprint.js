import moment from "moment";

const CRC32 = require('crc-32');

const _getFingerprint = (object) => {

    switch(typeof(object)) {
        case "object":
            if (object._isAMomentObject) {
                return `m:${object.toISOString()}`;
            } else if (object instanceof Date) {
                return `m:${moment(object).toISOString()}`;
            } else if (object !== null) {
                return `o:${getObjectFingerprint(object)}`;
            } else {
                return "o:null";
            }
        case "boolean":
            return `b:${object?"t":"f"}`;
        case "function":
            throw new Error("You cannot pass a function as data item");
        case "number":
            return `n:${object.toString()}`;
        case "string":
            return `s:${object}`;
        case "undefined":
            return `u`;
    }
};

const getObjectFingerprint = (value) => {
    const sortedKeys = Object.keys(value).sort();
    let buff = "";

    for (let key of sortedKeys) {
        buff += `${key}<${fingerprint(value[key])}>`;
    }

    return buff;
};

export default function fingerprint(object) {
    return CRC32.str(_getFingerprint(object)).toString(16);
}