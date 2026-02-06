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

    getParent = () => this.#parent;

    set = (attribute, value, hidden) => {
        return super.set(attribute, value, hidden);
    };

    delete = (attribute) => {
        return super.delete(attribute);
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
