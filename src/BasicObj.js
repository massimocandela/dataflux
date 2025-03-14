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

import moment from "moment/moment";
import {v4 as uuidv4} from "uuid";

export const dateRegex = new RegExp("^[0-9][0-9][0-9][0-9]-[0-9].*T[0-9].*Z$");
const globalError = "_object";

export function setValues(values, model, SubObj, parent, context) {

    if (!values) {
        throw new Error(`The parameter "values" cannot be null`);
    }

    Object.keys(values)
        .forEach(key => {
            const value = values[key];

            if (model.options.parseMoment && value != null && dateRegex.test(value)) {
                const mmnt = moment(value);
                context[key] = mmnt.isValid() ? mmnt : value;
            } else if (model.options.deep && value != null && typeof (value) === "object" && !Array.isArray(value)) {
                if (context[key] && typeof (context[key]) === "object") {
                    setValues(value, model, SubObj, parent, context[key]);
                } else {
                    context[key] = new SubObj(parent, key, value, model);
                }
            } else if (model.options.deep && value != null && Array.isArray(value) && !value.some(str => ["string", "number"].includes(typeof (str)))) {

                const out = [];

                value.forEach((item, order) => {
                    const old = context[key]?.find(i => i.id === item?.id);

                    if (old && old.id && typeof (old) === "object") {
                        setValues(item, model, SubObj, parent, old);
                        out.push(old);
                    } else {
                        out.push(new SubObj(parent, key, item, model));
                    }
                });

                context[key] = out;
            } else {
                context[key] = value;
            }
        });

}

export class BasicObj {
    #setHidden = {};
    #id = null;
    #error = {};
    #model;

    constructor(values, model) {
        this.#model = model;
    };

    isDataflux = () => true;

    isMock = () => false;

    setId = (id) => {
        this.id = id;
    };

    getId = () => {
        if (!this.#id) {
            if (this.id != null && (typeof (this.id) === "string" || typeof (this.id) === "number")) {
                this.#id = this.id.toString();
                delete this.setId;
            } else {
                this.#id = uuidv4();
            }
        }

        return this.#id;
    };

    get = (attribute, defaultValue) => {
        return this.#setHidden[attribute] ?? this[attribute] ?? defaultValue;
    };

    set(attribute, value, hidden) {
        if (hidden) {
            this.#setHidden[attribute] = value;
        } else {
            if (attribute === "id") {
                throw new Error("You cannot change the ID");
            }
            this[attribute] = value;
            this.#model.validateObjectAttribute(this, attribute);
        }

        return this.update();
    };

    getError = (attribute = null) => {
        const key = attribute ? attribute : globalError;
        return this.#error[key] ?? false;
    };

    setError = (error, attribute = null) => {

        if (error && attribute) {
            this.#error[attribute] = error;
        } else if (error && !attribute) {
            this.#error[globalError] = error;
        } else if (!error && attribute) {
            delete this.#error[attribute];
        } else {
            this.#error = {};
        }
    };

    setConstant = (attribute, value) => {
        this.#setHidden[attribute] = this.#setHidden[attribute] ?? value;
    };

    toJSON = () => {
        const attrs = Object.keys(this);
        const out = {};

        for (let a of attrs) {
            if (this[a] == null) {
                out[a] = this[a];
            } else if (this[a] instanceof moment) {
                out[a] = this[a].toISOString();
            } else if (this[a] instanceof Date) {
                out[a] = moment(this[a]).toISOString();
            } else if (typeof (this[a]) === "object" && this[a].toJSON) {
                out[a] = this[a].toJSON();
            } else if (Array.isArray(this[a]) && this[a].every(i => typeof (i) === "object" && i.toJSON)) {
                out[a] = this[a].map(i => i.toJSON());
            } else if (typeof (this[a]) !== "function") {
                out[a] = this[a];
            }
        }

        return out;
    };

    toString = () => {
        return JSON.stringify(this.toJSON());
    };

    update = () => {
        return Promise.resolve();
    };
}
