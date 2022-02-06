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
