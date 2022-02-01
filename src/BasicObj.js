import moment from "moment/moment";

export const dateRegex = new RegExp("^[0-9][0-9][0-9][0-9]-[0-9].*T[0-9].*Z$");

export class BasicObj {
    #setHidden = {};
    constructor(values, model) {};

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
            if (this[a] instanceof moment) {
                out[a] = this[a].toISOString();
            } else if (this[a] instanceof Date) {
                out[a] = moment(this[a]).toISOString();
            } else if (this[a].toJSON) {
                out[a] = this[a].toJSON();
            } else if (Array.isArray(this[a]) && this[a].every(i => i.toJSON)) {
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
