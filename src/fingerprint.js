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

import moment from "moment";

const CRC32 = require('crc-32');

const _getFingerprint = (object) => {

    switch(typeof(object)) {
        case "object":
            if (object == null) {
                return "o:null";
            } else if (object._isAMomentObject) {
                return `m:${object.toISOString()}`;
            } else if (object instanceof Date) {
                return `m:${moment(object).toISOString()}`;
            } else {
                return `o:${getObjectFingerprint(object)}`;
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