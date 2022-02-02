import { v4 as uuidv4 } from "uuid";
import {BasicObj, dateRegex} from "./BasicObj";
import moment from "moment/moment";

export default class SubObj extends BasicObj {
    #model;
    #parent;
    constructor(parent, values, model) {
        super(values, model);
        this.#model = model;
        this.#parent = parent;

        Object.keys(values)
            .forEach(key => {
                const value = values[key];
                if (model.options.parseMoment && dateRegex.test(value)) {
                    const mmnt = moment(value);
                    this[key] = mmnt.isValid() ? mmnt : value;
                } else if (model.options.deep && typeof(value) === "object" && !Array.isArray(value)){
                    this[key] = new SubObj(this.#parent, value, model);
                } else if (model.options.deep && Array.isArray(value)){
                    this[key] = value.map(i => new SubObj(this.#parent, i, model));
                } else {
                    this[key] = value;
                }
            });
    };

    save = () => {
        return this.#model.getStore().save([this.#parent]);
    };

    destroy = () => {
        return this.#model.getStore().delete([this.#parent]);
    };

    update = () => {
        return this.#model.getStore().update([this.#parent]);
    };
}
