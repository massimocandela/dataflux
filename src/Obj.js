import fingerprint from "./fingerprint";
import { v4 as uuidv4 } from "uuid";
import moment from "moment/moment";

const dateRegex = new RegExp("^[0-9][0-9][0-9][0-9]-[0-9].*T[0-9].*Z$");

export default class Obj {
    #loaded = false;
    #setHidden = {};
    constructor(values, model) {
        this.getModel = () => model;

        const frEach = model.options.parseMoment ?
            key => {
                if (dateRegex.test(values[key])) {
                    const mmnt = moment(values[key]);
                    this[key] = mmnt.isValid() ? mmnt : values[key];
                } else {
                    this[key] = values[key];
                }
            } :
            key => this[key] = values[key];

        Object.keys(values).forEach(frEach);

        let id;
        if (this.id && (typeof(this.id) === "string" || typeof(this.id) === "number")) {
            id = this.id.toString();
        } else {
            id = uuidv4();
        }

        this.getId = () => id;
    };

    load = () => {
        if (this.#loaded) {
            return Promise.resolve(this);
        } else {
            const model = this.getModel();

            return model
                .load(this)
                .then(() => {
                    this.#loaded = true;

                    return model.getStore().update([this], true); // Propagate update
                })
                .then(() => this); // return always this
        }
    };

    getFingerprint = () => {
        return fingerprint(this.toJSON());
    };

    get = (attribute) => {
        return this.#setHidden[attribute] || this[attribute];
    };

    getRelation = (type, filterFunction) => {
        return this.getModel().getRelation(this, type, filterFunction);
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
        return this.getModel().getStore().update([this]);
    };

    save = () => {
        return this.getModel().getStore().save([this]);
    };

    destroy = () => {
        return this.getModel().getStore().delete([this]);
    };

    toJSON = () => {
        const attrs = Object.keys(this);
        const out = {};

        for (let a of attrs) {
            if (this[a] instanceof moment) {
                out[a] = this[a].toISOString();
            } else if (this[a] instanceof Date) {
                out[a] = moment(this[a]).toISOString();
            } else if (typeof(this[a]) !== "function") {
                out[a] = this[a];
            }
        }

        return out;
    };

    toString = () => {
        return JSON.stringify(this.toJSON());
    };
}
