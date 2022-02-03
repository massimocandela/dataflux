import {BasicObj, dateRegex} from "./BasicObj";
import moment from "moment/moment";

export default class SubObj extends BasicObj {
    #model;
    #parent;
    #parentField;
    constructor(parent, field, values, model) {
        super(values, model);
        this.#model = model;
        this.#parent = parent;
        this.#parentField = field;

        Object.keys(values)
            .forEach(key => {
                const value = values[key];
                if (model.options.parseMoment && dateRegex.test(value)) {
                    const mmnt = moment(value);
                    this[key] = mmnt.isValid() ? mmnt : value;
                } else if (model.options.deep && typeof(value) === "object" && !Array.isArray(value)){
                    this[key] = new SubObj(this.#parent, key, value, model);
                } else if (model.options.deep && Array.isArray(value)){
                    this[key] = value.map(i => new SubObj(this.#parent, key, i, model));
                } else {
                    this[key] = value;
                }
            });
    };

    save = () => {
        return this.#model.getStore().save([this.#parent]);
    };

    destroy = () => {
        if (Array.isArray(this.#parent[this.#parentField])) {
            this.#parent[this.#parentField] = this.#parent[this.#parentField].filter(i => i.getId() !== this.getId());
        } else if (this.#parent[this.#parentField]?.getId) {
            this.#parent[this.#parentField] = null;
        }
        return this.#model.getStore().update([this.#parent]);
    };

    update = () => {
        return this.#model.getStore().update([this.#parent]);
    };
}
