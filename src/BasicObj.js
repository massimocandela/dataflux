import moment from "moment/moment";
import {v4 as uuidv4} from "uuid";

export const dateRegex = new RegExp("^[0-9][0-9][0-9][0-9]-[0-9].*T[0-9].*Z$");

export function setValues (values, model, SubObj, parent, context) {
    Object.keys(values)
        .forEach(key => {
            const value = values[key];
            if (model.options.parseMoment && value != null && dateRegex.test(value)) {
                const mmnt = moment(value);
                context[key] = mmnt.isValid() ? mmnt : value;
            } else if (model.options.deep && value != null && typeof(value) === "object" && !Array.isArray(value)){
                context[key] = new SubObj(parent, key, value, model);
            } else if (model.options.deep && value != null && Array.isArray(value)){
                context[key] = value.map(i => new SubObj(parent, key, i, model));
            } else {
                context[key] = value;
            }
        });
}

export class BasicObj {
    #setHidden = {};
    #id = null;
    constructor(values, model) {};

    getId = () => {
        if (!this.#id) {
            if (this.id && (typeof (this.id) === "string" || typeof (this.id) === "number")) {
                this.#id = this.id.toString();
            } else {
                this.#id = uuidv4();
            }
        }

        return this.#id;
    }

    get = (attribute, defaultValue) => {
        return this.#setHidden[attribute] ?? this[attribute] ?? defaultValue;
    };

    set = (attribute, value, hidden) => {
        if (hidden) {
            this.#setHidden[attribute] = value;
        } else {
            if (attribute === "id") {
                throw new Error("You cannot change the ID");
            }
            this[attribute] = value;
        }
        return this.update();
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
            } else if (typeof(this[a]) === "object" && this[a].toJSON) {
                out[a] = this[a].toJSON();
            } else if (Array.isArray(this[a]) && this[a].every(i => typeof(i) === "object" && i.toJSON)) {
                out[a] = this[a].map(i => i.toJSON());
            } else if (typeof(this[a]) !== "function") {
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