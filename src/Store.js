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

import Obj from "./Obj";
import PubSub from "./PubSub";
import batchPromises from "batch-promises";
import SubObj from './SubObj';
import {setValues} from './BasicObj';

const objectStatuses = ["new", "old", "mock", "deleted"];

export default class Store {
    constructor(options={}) {
        this.options = {
            axios: options.axios ?? null,
            autoSave: options.autoSave ?? true,
            saveDelay: options.saveDelay || 1000,
            lazyLoad: options.lazyLoad ?? false,
            batchPersistence: options.batchPersistence ?? 1000,
            autoRefresh: options.autoRefresh === true ? 120000 : options.autoRefresh
        };
        this.models = {};
        this.pubSub = new PubSub();
    };

    getModels = () => {
        return Object.keys(this.models);
    };

    on(channel, callback) {
        this.pubSub.subscribe(channel, callback);
    };

    validateModel(model) {
        const type = model.getType();

        if (typeof(type) !== "string" || type === "") {
            throw new Error("Not valid model object: type missing");
        }

    };

    addModel (model) {
        return new Promise((resolve, reject) => {
            this.validateModel(model);

            const type = model.getType();

            if (!this.models[type]) {
                this.models[type] = {
                    model,
                    storedObjects: {}
                };
                model.setStore(this);
                const lazyLoad = model.options.lazyLoad ?? this.options.lazyLoad;

                if (lazyLoad) {
                    resolve();
                } else {
                    resolve(this.#loadObjects(type));
                }
            } else {
                const error = "The model already exists";
                this.pubSub.publish("error", error);
                reject(error);
            }
        });
    };

    update (objects) {
        return Promise.resolve(objects); // Nothing to do at this level
    };

    delete (typeOrObjects, filterFunction) {
        if (typeof(typeOrObjects) === "string" && typeof(filterFunction) === "function") {
            const type = typeOrObjects;
            return this.#deleteByFilter(type, filterFunction);
        } else if (Array.isArray(typeOrObjects) && typeOrObjects.length && !filterFunction) {
            const objects = typeOrObjects;
            return Promise.all(objects.map(this.#deleteByObject))
                .then((data) => data.flat());
        } else {
            const error = "Invalid delete request. You have to provide a list of objects or a type and a filter function";
            this.pubSub.publish("error", error);
            return Promise.reject(error);
        }
    };

    insert (type, objects) {
        return this._getPromise(type)
            .then(() => objects.map(object => this.#insertObject(type, object, "new")));
    };

    mock (type, objects) {
        return this._getPromise(type)
            .then(() => objects.map(object => this.#insertObject(type, object, "mock")));
    };

    get (type, id) {
        return this._getPromise(type)
            .then(() => {
                try {
                    return this.models[type].storedObjects[id].object;
                } catch (error) {
                    return Promise.reject("Object not found");
                }
            });
    };

    findSync = (type, filterFunction) => {
        const all = Object.values(this.models[type].storedObjects)
            .filter(i => i.status !== "deleted")
            .map(i => i.object);

        return filterFunction ? all.filter(filterFunction) : all;
    }

    find (type, filterFunction) {
        return this._getPromise(type)
            .then(() => this.findSync(type, filterFunction))
            .catch(error => {
                this.pubSub.publish("error", error);

                return Promise.reject(error);
            });
    };

    applyDiff ({inserted=[], updated=[], deleted=[]}, type) {
        return new Promise((resolve, reject) => {
            try {

                for (let object of inserted.concat(updated)) {

                    type = type || object.object.getModel().getType();
                    const newId = object.object.getId();
                    const oldId = object.id;

                    const item = this.models[type].storedObjects[object.id];

                    if (newId !== oldId) {
                        this.models[type].storedObjects[newId] = item;
                        delete this.models[type].storedObjects[object.id];
                    }

                    item.fingerprint = object.object.getFingerprint();
                    item.status = "old";
                }

                for (let object of deleted) {
                    delete this.models[type || object.object.getModel().getType()].storedObjects[object.id];
                }

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    };

    hasChanged (type, object) {

        const _hasChanged = (type, object) => {
            const obj = this.models[type].storedObjects[object.getId()];

            return !obj || obj.fingerprint !== obj.object.getFingerprint();
        }

        if (object) {
            return _hasChanged(type, object);
        } else {
            return Object.values(this.models[type].storedObjects).some(i => _hasChanged(type, i));
        }
    };

    preload(type){
        return this._getPromise(type);
    }

    getDiff (type, ifLoaded) {
        return this._getPromise(type, ifLoaded)
            .then(() => {
                const objects = Object.values(this.models[type].storedObjects);

                const inserted = [];
                const updated = [];
                const deleted = [];

                for (let object of objects) {

                    if (object.status === "new") {
                        inserted.push(object);
                    } else if (object.status === "deleted") {
                        deleted.push(object);
                    } else if (object.status === "old" && this.hasChanged(type, object.object)) {
                        updated.push(object);
                    } // Nothing for mock objects
                }

                return { inserted, updated, deleted };
            });
    };

    factory (type, params) {
        const item = this.models[type];
        this.pubSub.publish("loading", {status: "start", model: type});
        item.promise = item.model.factory(params)
            .then(items => {
                for (let item of items) {
                    this.#insertObject(type, item, "old");
                }
                this.pubSub.publish("loading", {status: "end", model: type});
            });

        return item.promise;
    };

    refreshObjectByType = (type, force=false) => {
        return this._getPromise(type)
            .then(() => {
                const item = this.models[type];
                const inserted = [];
                const deleted = [];
                const updated = [];

                item.promise = item.model
                    .retrieveAll()
                    .catch(() => {
                        const objects = Object.values(this.models[type].storedObjects);
                        let list = [];

                        return batchPromises(4, objects, object => {

                            return item.model
                                .factory(object.object)
                                .then(items => {
                                    list = list.concat(items);
                                });
                        })
                            .then(() => list);
                    })
                    .then(objects => {

                        for (let object of objects) {

                            const wrapper = new Obj(object, item.model);
                            const id = wrapper.getId();
                            const currentObject = item?.storedObjects[id];

                            if (currentObject) {
                                currentObject.deleted = false;
                                const newFingerprint = wrapper.getFingerprint();
                                const oldFingerprint = currentObject.fingerprint;

                                if (oldFingerprint !== newFingerprint) { // Nothing to do otherwise
                                    if (force) {
                                        this.#wipe(currentObject.object);
                                        this.#merge(currentObject.object, wrapper.toJSON());
                                        currentObject.fingerprint = newFingerprint;
                                        updated.push(currentObject.object);

                                    } else if (this.hasChanged(type, currentObject.object)) { // Was the object edited locally?

                                        // Nothing for now

                                    } else { // Update with the new object
                                        this.#merge(currentObject.object, wrapper.toJSON())
                                        currentObject.fingerprint = newFingerprint;
                                        updated.push(currentObject.object);
                                    }
                                }

                            } else {
                                const newObject = this.#insertObject(type, object, "old");
                                item.storedObjects[newObject.getId()].deleted = false;

                                inserted.push(newObject);
                            }
                        }

                        for (let id in item?.storedObjects) {
                            const obj = item.storedObjects[id];
                            if (obj.deleted === undefined) {
                                deleted.push(obj.object);
                                delete item.storedObjects[id];
                            } else {
                                delete obj.deleted;
                            }
                        }

                        return [inserted, updated, deleted];
                    });

                return item.promise;
            });
    };

    #merge = (originalObject, newObject) => {

        setValues(newObject, originalObject.getModel(), SubObj, originalObject, originalObject);
    };

    #wipe = (originalObject) => {
        for (let key in originalObject) {
            if (key !== "id" && typeof(originalObject[key]) !== "function") {
                delete originalObject[key];
            }
        }
    };

    #error (error) {
        error = error.message || error;
        this.pubSub.publish("error", error);
        return Promise.reject(error);
    };

    #deleteByObject = (object) => {
        const id = object.getId();
        const filterFunction = (item) => {
            return id === item.getId();
        };

        return this.#deleteByFilter(object.getModel().getType(), filterFunction);
    };

    #deleteByFilter (type, filterFunction) {

        return this._getPromise(type)
            .then(() => {
                const deleted = Object.values(this.models[type].storedObjects)
                    .filter(i => filterFunction(i.object));

                for (let object of deleted) {
                    object.status = "deleted";
                }

                return deleted.map(i => i.object);
            });
    };

    _getPromise (type, ifLoaded=false) {
        if (!this.models[type]) {
            return Promise.reject("The model doesn't exist");
        } else if (!this.models[type].promise && !this.options.lazyLoad) {
            return Promise.reject("The model is not loaded");
        } else if (!this.models[type].promise && this.options.lazyLoad && !ifLoaded) {
            return this.#loadObjects(type)
                .then(() =>  this.models[type].promise);
        } else if (!this.models[type].promise && this.options.lazyLoad && ifLoaded) {
            return Promise.resolve();
        } else {
            return this.models[type].promise;
        }
    };

    #insertObject = (type, item, status) => {
        const model = this.models[type].model;
        const wrapper = new Obj(item, model);
        const id = wrapper.getId();

        if (this.models[type].storedObjects[id]) {
            throw new Error(`The IDs provided for the model ${type} are not unique`);
        }

        if (!objectStatuses.includes(status)) {
            throw new Error(`The provided status is not valid`);
        }

        if (status === "mock") {
            wrapper.insert = () => {
                this.models[type].storedObjects[id].status = "new";
                this.update([wrapper]);
                delete wrapper.insert;
            };
        }

        this.models[type].storedObjects[id] = {
            id,
            fingerprint: wrapper.getFingerprint(),
            object: wrapper,
            status
        }

        return wrapper;
    };

    #loadObjects (type) {
        const item = this.models[type];

        this.pubSub.publish("loading", {status: "start", model: type});
        item.promise = item.model.retrieveAll()
            .then(items => {
                for (let item of items) {
                    this.#insertObject(type, item, "old");
                }
                this.pubSub.publish("loading", {status: "end", model: type});
            });

        return item.promise;
    };
}