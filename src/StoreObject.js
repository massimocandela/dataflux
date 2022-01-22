import fingerprint from "./fingerprint";
import { v4 as uuidv4 } from "uuid";

export default class Obj {
    #loaded = false;
    constructor(values, model) {
        this.getModel = () => model;
        Object.keys(values)
            .forEach(key => {
                this[key] = values[key];
            });

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
            return this.getModel()
                .load(this)
                .then(() => {
                    this.#loaded = true;

                    return this;
                });
        }
    };

    getFingerprint = () => {
        return fingerprint(this.toJson());
    };

    get = (attribute) => {
        return this[attribute];
    };

    getRelation = (type, filterFunction) => {
        return this.getModel().getRelation(this, type, filterFunction);
    };

    set = (attribute, value) => {
        if (attribute === "id") {
            throw new Error("You cannot change the ID");
        }
        this[attribute] = value;
        this.getModel().getStore().update([this]);
    };

    save = () => {
        return this.getModel().getStore().save([this]);
    };

    destroy = () => {
        return this.getModel().getStore().delete([this]);
    };

    toJson = () => {
        const attrs = Object.keys(this);
        const out = {};

        for (let a of attrs) {
            if (typeof(this[a]) !== "function") {
                out[a] = this[a];
            }
        }

        return out;
    };

    toString = () => {
        return JSON.stringify(this.toJson());
    };
}
