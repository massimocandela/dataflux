import fingerprint from "./fingerprint";
import {BasicObj, setValues} from "./BasicObj";
import SubObj from "./SubObj";

export default class Obj extends BasicObj{
    #loaded = false;
    constructor(values, model) {
        super(values, model);

        setValues(values, model, SubObj, this, this);

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
