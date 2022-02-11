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

import {executeHook, getHooksFromOptions, getHooksFromUrl} from "./modelHooksUtils";
import axios from "axios";
import {setValues} from "./BasicObj";
import SubObj from "./SubObj";

export default class Model {
    #type;
    #store;
    #includes;
    #retrieveHook;
    #updateHook;
    #insertHook;
    #deleteHook;
    #singleItemQuery;
    #batchSize;
    #axios
    #loadFunction;
    #hiddenFields;

    constructor(name, options={}) {
        this.#type = name;
        this.options = {
            ...options,
            deep: options.deep ?? true,
            parseMoment: options.parseMoment ?? false,
            lazyLoad: options.lazyLoad
        };
        this.#store = null;
        this.#includes = {};
        this.#axios = this.options.axios || axios;
        this.#hiddenFields = this.options.hiddenFields || [];
        this.#loadFunction = this.options.load || null;

        if (!name || !options) {
            throw new Error("A Model requires at least a name and a hook");
        }

        if (this.#loadFunction && typeof(this.#loadFunction) !== "function") {
            throw new Error("The load option must be a function");
        }

        const [retrieveHook, insertHook, updateHook, deleteHook] = (typeof(options) === "object") ?
            getHooksFromOptions(options) : getHooksFromUrl(options);

        this.#retrieveHook = retrieveHook;
        this.#updateHook = updateHook;
        this.#insertHook = insertHook;
        this.#deleteHook = deleteHook;

        this.#singleItemQuery = false; // By default use arrays
        this.#batchSize = 4; // For HTTP requests in parallel if your API doesn't support multiple resources
    };

    getStore = () => {
        return this.#store;
    };

    setStore = (store) => {
        if (!this.#store) {
            this.#store = store;
        } else {
            throw new Error("This model was already assigned to a store.");
        }
    };

    load = (obj) => {

        if (this.#loadFunction) {

            return this.getStore()
                .whenSaved(this.getType())
                .catch((e) => {
                    throw new Error("You cannot perform load() on an unsaved object.");
                })
                .then(() => {
                    const res = this.#loadFunction(obj.toJSON()); // toJSON to avoid side effects;

                    if (typeof(res) === "string") {
                        return this.#axios({
                            method: "get",
                            url: res,
                            responseType: "json"
                        })
                            .then(data => data.data);
                    } else {
                        return res;
                    }
                })
                .then(data => {
                    setValues(data, this, SubObj, null, obj);

                    return data;
                })
                .catch((error) => {
                    return this.#error(error);
                });

        } else {
            return this.#error("You must define a loading function in the model to enable load().");
        }
    };

    #error (error) {
        error = error.message || error;
        this.getStore().pubSub.publish("error", error);
        return Promise.reject(error);
    }

    addRelation = (model, param2, param3) => {

        if (model) {
            this.getStore().validateModel(model);

            if (typeof(param2) === "string" && (!param3 || typeof(param3) === "string")) { // explicit model, from, to
                return this.#addRelationByField(model, param2, param3);
            } else if (!param3 && typeof(param2) === "function") { // explicit model, filterFunction
                return this.#addRelationByFilter(model, param2);
            } else if (!param2 && !param3) { // implicit model, from, to (it uses the type as local key and the id as remote key)
                return this.#addRelationByField(model, model.getType(), "id");
            } else {
                throw new Error("Invalid relation declaration");
            }

        } else {
            throw new Error("A relation needs a model");
        }

    };

    getRelation = (parentObject, includedType, filterFunction) => {
        const filterRelation = this.#includes[includedType];

        if (filterRelation) {
            return (parentObject.getModel().options.load ?
                parentObject.load().catch(() => {}) :
                Promise.resolve())
                .then(() => {
                    return this.getStore()
                        .find(includedType, (item) => filterRelation(parentObject, item))
                        .then(data => filterFunction ? data.filter(filterFunction) : data);
                })

        } else {
            return this.#error("The relation doesn't exist");
        }
    };

    getType = () => {
        return this.#type;
    };

    retrieveAll = () => {
        return executeHook("retrieve", this.#retrieveHook, null, this.#axios)
            .then(data => {
                if (!Array.isArray(data)) {
                    this.#singleItemQuery = true;
                }

                return this.#toArray(data);
            });
    };

    insertObjects = (objects) => {
        return objects.length ? this.#bulkOperation(objects, this.#insertObjects) : Promise.resolve();
    };

    updateObjects = (objects) => {
        return objects.length ? this.#bulkOperation(objects, this.#updateObjects) : Promise.resolve();
    };

    deleteObjects = (objects) => {
        return objects.length ? this.#bulkOperation(objects, this.#deleteObjects) : Promise.resolve();
    };

    factory = (params) => {
        if (!this.options.lazyLoad) {
            return Promise.reject("Factory can be used only on a model declared with lazyLoad: true");
        } else {
            return executeHook("retrieve", this.#retrieveHook, params, this.#axios)
                .then(data => {
                    if (!Array.isArray(data)) {
                        this.#singleItemQuery = true;
                    }

                    return this.#toArray(data);
                });
        }
    };

    #addRelationByField = (model, localField, remoteField="id") => {

        const filterFunction = (parentObject, child) => {
            return parentObject[localField] === child[remoteField];
        };

        return this.#addRelationByFilter(model, filterFunction);
    };

    #addRelationByFilter = (model, filterFunction) => {
        const includedType = model.getType();

        this.#includes[includedType] = filterFunction;
    };

    #removeHiddenFields = (json) => {
        for (let attribute of this.#hiddenFields) {
            delete json[attribute];
        }

        return json;
    };

    #bulkOperation = (objects, action) => {
        const parsed = objects.map(i => ({
            target: i.getId(),
            data: this.#removeHiddenFields(i.toJSON())
        }));
        return action(parsed);
    };

    #toArray = (data) => {
        if (Array.isArray(data)) {
            if (data.length && data.every(str => ["string", "number"].includes(typeof(str)))) {
                return [{value: data}];
            } else {
                return data;
            }
        } else {
            if (["string", "number"].includes(typeof(data))) {
                return [{value: data}];
            } else {
                return [data];
            }
        }
    };

    #unWrap = (data) => {
        if (data.value != null && Object.keys(data).length === 1) {
            return data.value;
        } else if (Array.isArray(data) && data.length === 1 && data[0].value != null && Object.keys(data[0]).length === 1) {
            return data[0].value;
        } else {
            return data;
        }
    };

    #insertObjects = (data) => {
        const targets = data.map(i => i.target);
        const jsons = data.map(i => i.data);

        return executeHook("insert", this.#insertHook, this.#unWrap(jsons), this.#axios)
            .catch(error => {
                this.#removeFromStoreSilentlyAfterFailure(targets);
                return Promise.reject({...(error?.response?.data || error), targets, operation: "insert" } );
            })
            .then(this.#toArray);
    };

    #updateObjects = (data) => {
        const targets = data.map(i => i.target);
        const jsons = data.map(i => i.data);

        return executeHook("update", this.#updateHook, this.#unWrap(data), this.#axios)
            .catch(error => Promise.reject({...(error?.response?.data || error), targets, operation: "update" } ))
            .then(this.#toArray)

    };

    #deleteObjects = (data) => {
        const targets = data.map(i => i.target);
        const jsons = data.map(i => i.data);

        return executeHook("delete", this.#deleteHook, this.#unWrap(data), this.#axios)
            .catch(error => Promise.reject({...(error?.response?.data || error), targets, operation: "delete" } ))
            .then(this.#toArray);
    };

    #removeFromStoreSilentlyAfterFailure = (targets) => {
        for (let target of targets) {
            delete this.getStore().models[this.getType()].storedObjects[target];
        }
    };

}