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

import Store from "./Store";

export default class PersistentStore extends Store {
    constructor(options) {
        super(options);
        this._busy = false;
        this._delayedSaveTimer = null;
        this._delayedSavePromise = null;

        if (typeof (this.options.autoSave) === "number") {
            setInterval(() => {
                if (!this._busy) {
                    this.delayedSave();
                }
            }, this.options.autoSave);
        }
    };

    addModel(model) {
        this._busy = true;

        return super.addModel(model)
            .then(() => {
                this._busy = false;
            });
    };

    whenSaved = (type) => {
        return this.getDiff(type)
            .then(({inserted, updated, deleted}) => {

                if (inserted.length === 0 && updated.length === 0 && deleted.length === 0) {
                    return true;
                } else {
                    return Promise.reject("Save must be invoked manually");
                }
            });
    };

    save = () => {
        return this._save(true);
    };

    _save = (force = true) => {
        this._busy = true;
        this.pubSub.publish("save", "start");

        if (this._delayedSaveTimer) {
            clearTimeout(this._delayedSaveTimer);
        }

        return Promise.all(
            Object.keys(this.models)
                .filter(m => this.models[m].model.options.autoSave !== false || force) // explicit false check (null = true)
                .map(i => this._saveByType(i, true))
        )
            .then(data => {
                this._busy = false;
                this.pubSub.publish("save", "end");

                return data;
            })
            .catch(error => {
                this._busy = false;
                this.pubSub.publish("save", "end");
                this.pubSub.publish("error", error);
                return Promise.reject(error);
            });
    };

    insert(type, objects) {
        return super.insert(type, objects)
            .then(data => {
                return this.delayedSave()
                    .then(() => data);
            });
    };

    mock(type, objects) {
        return super.mock(type, objects);
    };

    delete(typeOrObjects, filterFunction) {
        return super.delete(typeOrObjects, filterFunction)
            .then(data => {
                return this.delayedSave()
                    .then(() => data);
            });
    };

    update(objects, skipSave) {
        return super.update(objects)
            .then(objects => {

                if (skipSave) {
                    for (let object of objects) {
                        const type = object.getModel().getType();
                        this.models[type].storedObjects[object.getId()].fingerprint = object.getFingerprint();
                    }
                    return objects;
                } else {
                    return this.delayedSave()
                        .then(() => objects);
                }
            });
    };

    _saveDiff = (type, {inserted, updated, deleted}) => {
        const model = this.models[type].model;

        // Validate objects
        const correctInserted = inserted.filter(object => model.isObjectValid(object.object));
        const correctUpdated = updated.filter(object => model.isObjectValid(object.object));
        const correctDeleted = deleted.filter(object => model.isObjectValid(object.object));

        // Operations order:
        // 1) insert
        // 2) update
        // 3) delete
        return model.insertObjects(correctInserted.map(i => i.object))
            .then(() => this.applyDiff({inserted: correctInserted}, type))
            .then(() => model.updateObjects(correctUpdated.map(i => i.object)))
            .then(() => this.applyDiff({updated: correctUpdated}, type))
            .then(() => model.deleteObjects(correctDeleted.map(i => i.object)))
            .then(() => this.applyDiff({deleted: correctDeleted}, type));
    };

    _saveByType = (type, ifLoaded) => {
        return this.getDiff(type, ifLoaded)
            .then(diff => this._saveDiff(type, diff));
    };

    delayedSave = () => {
        return new Promise((resolve, reject) => {
            if (this.options.autoSave) {
                if (this._delayedSaveTimer) {
                    if (this._delayedSavePromise) {
                        this._delayedSavePromise();
                        this._delayedSavePromise = null;
                    }
                    clearTimeout(this._delayedSaveTimer);
                    this._delayedSaveTimer = null;
                }
                this._delayedSavePromise = resolve;
                this._delayedSaveTimer = setTimeout(() => {
                    resolve(this._save(false));
                    this._delayedSavePromise = null;
                }, this.options.saveDelay);
            } else {
                resolve();
            }
        });
    };


}