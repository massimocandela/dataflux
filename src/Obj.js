import fingerprint from "./fingerprint";
import { v4 as uuidv4 } from "uuid";
import {BasicObj, dateRegex} from "./BasicObj";
import moment from "moment/moment";
import SubObj from "./SubObj";

export default class Obj extends BasicObj{
    #loaded = false;
    constructor(values, model) {
        super(values, model);

        Object.keys(values)
            .forEach(key => {
                const value = values[key];
                if (model.options.parseMoment && dateRegex.test(value)) {
                    const mmnt = moment(value);
                    this[key] = mmnt.isValid() ? mmnt : value;
                } else if (model.options.deep && typeof(value) === "object" && !Array.isArray(value)){
                    this[key] = new SubObj(this, value, model);
                } else if (model.options.deep && Array.isArray(value)){
                    this[key] = value.map(i => new SubObj(this, i, model));
                } else {
                    this[key] = value;
                }
            });

        this.getModel = () => model;
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

    getRelation = (type, filterFunction) => {
        return this.getModel().getRelation(this, type, filterFunction);
    };

    save = () => {
        return this.getModel().getStore().save([this]);
    };

    destroy = () => {
        return this.getModel().getStore().delete([this]);
    };

    update = () => {
        return this.getModel().getStore().update([this]);
    };
}
