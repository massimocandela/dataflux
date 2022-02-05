import {BasicObj, setValues} from "./BasicObj";

export default class SubObj extends BasicObj {
    #model;
    #parent;
    #parentField;
    constructor(parent, field, values, model) {
        super(values, model);
        this.#model = model;
        this.#parent = parent;
        this.#parentField = field;

        setValues(values, model, SubObj, this.#parent, this);
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
