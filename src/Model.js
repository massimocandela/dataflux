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
import axios from "redaxios";
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
    #axios;
    #loadFunction;
    #hiddenFields;
    ready;

    constructor(name, options = {}, defaults = {}) {
        this.#type = name;

        this.options = {
            ...(typeof (options) === "object" ? options : {}),
            deep: options.deep ?? defaults.deep ?? true,
            parseMoment: options.parseMoment ?? defaults.parseMoment ?? false,
            lazyLoad: options.lazyLoad ?? defaults.lazyLoad,
            validate: options.validate ?? defaults.validate ?? {},
            autoSave: options.autoSave ?? defaults.autoSave ?? null,
            autoRefresh: options.autoRefresh ?? defaults.autoRefresh ?? false,
            pre: options.pre ?? defaults.pre ?? null,
            hiddenFields: options.hiddenFields ?? defaults.hiddenFields ?? [],
            post: options.post ?? defaults.post ?? null
        };
        this.#store = null;
        this.#includes = {};
        this.#axios = this.options.axios || axios;
        this.#hiddenFields = this.options.hiddenFields;
        this.#loadFunction = this.options.load || null;

        if (!name || !options) {
            throw new Error("A Model requires at least a name and a hook");
        }

        if (this.#loadFunction && typeof (this.#loadFunction) !== "function") {
            throw new Error("The load option must be a function");
        }

        const [retrieveHook, insertHook, updateHook, deleteHook] = (typeof (options) === "object") ?
            getHooksFromOptions(options) : getHooksFromUrl(options);

        this.#retrieveHook = retrieveHook;
        this.#updateHook = updateHook;
        this.#insertHook = insertHook;
        this.#deleteHook = deleteHook;

        this.#singleItemQuery = false; // By default use arrays
        this.#batchSize = 4; // For HTTP requests in parallel if your API doesn't support multiple resources

        if (this.options.autoRefresh && typeof (this.options.autoRefresh) === "number") {
            setInterval(() => {this.getStore().refresh(this.#type);}, this.options.autoRefresh);
        }
    };

    validateObjectAttribute = (object, key) => {
        const validate = this.options.validate;
        if (validate && validate[key]) {
            try {
                const call = validate[key](object, this.#store);
                if (call?.then) {
                    call
                        .then(() => object.setError(false, key))
                        .catch(error => object.setError(error.message, key));
                } else {
                    object.setError(false, key);
                }
            } catch (error) {
                object.setError(error.message, key);
            }
        }
    };

    isObjectValid = (object) => {
        for (let key in object) {
            if (typeof (object[key]) !== "function") {
                if (object.getError(key)) {
                    console.log("Model error", key, object.getError(key));
                    return false;
                }
            }
        }

        return true;
    };

    getStore = () => {
        return this.#store;
    };

    setStore = (store) => {
        if (!this.#store) {
            this.#store = store;
            this.#axios = this.options.axios || this.#store?.options?.axios || axios;
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

                    if (typeof (res) === "string") {
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
                    setValues(data, this, SubObj, obj, obj);

                    return data;
                })
                .catch((error) => {
                    return this.#error(error);
                });

        } else {
            return this.#error("You must define a loading function in the model to enable load().");
        }
    };

    #error(error) {
        error = error.message || error;
        this.getStore().pubSub.publish("error", error);
        return Promise.reject(error);
    }

    addRelation = (model, param2, param3) => {

        if (model) {
            this.getStore().validateModel(model);

            if (typeof (param2) === "string" && (!param3 || typeof (param3) === "string")) { // explicit model, from, to
                return this.#addRelationByField(model, param2, param3);
            } else if (!param3 && typeof (param2) === "function") { // explicit model, filterFunction
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
                });

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

                this.ready = true;

                return this.#toArray(data);
            })
            .then(data => this.options?.pre ? data.map(n => this.options.pre(n, data)) : data);
    };

    insertObjects = (objects) => {
        return objects.length ? this.#insertObjects(objects) : Promise.resolve();
    };

    updateObjects = (objects) => {
        return objects.length ? this.#updateObjects(objects) : Promise.resolve();
    };

    deleteObjects = (objects) => {
        return objects.length ? this.#deleteObjects(objects) : Promise.resolve();
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

    #addRelationByField = (model, localField, remoteField = "id") => {

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
        for (let attribute of this?.#hiddenFields ?? []) {
            delete json[attribute];
        }

        if (json && typeof (json) === "object") {
            for (let obj of Object.values(json)) {
                if (obj && typeof (obj) === "object") {
                    this.#removeHiddenFields(obj);
                }
            }
        }

        return json;
    };

    #toArray = (data) => {
        if (Array.isArray(data)) {
            if (data.length && data.every(str => ["string", "number"].includes(typeof (str)))) {
                return [{value: data}];
            } else {
                return data;
            }
        } else {
            if (["string", "number"].includes(typeof (data))) {
                return [{value: data}];
            } else {
                return [data];
            }
        }
    };

    #unWrap = (objects) => {
        const arrayObjects = Object.values(objects);
        const data = arrayObjects
            .map(object => this.#removeHiddenFields(object.toJSON()))
            .map(object => this.options?.post ? this.options.post(object, arrayObjects) : object);
        if (data.value != null && Object.keys(data).length === 1) {
            return data.value;
        } else if (Array.isArray(data) && data.length === 1 && data[0].value != null && Object.keys(data[0]).length === 1) {
            return data[0].value;
        } else {
            return data;
        }
    };

    #insertObjects = (objects) => {
        const operation = "insert";
        return executeHook(operation, this.#insertHook, this.#unWrap(objects), this.#axios)
            .then(data => {
                if (data) {
                    this.#assignId(data, objects);
                }
                this.#cleanApiError(objects);

                return data;
            })
            .then(this.#toArray)
            .catch(error => {
                this.#removeFromStoreSilentlyAfterFailure(objects);
                return this.#hanldeApiError(error, objects, operation);
            });
    };

    #assignId = (data, objects) => {
        if (Array.isArray(data) && Array.isArray(objects) && objects.length === data.length) {

            for (let i = 0; i < data.length; i++) {
                setValues(data[i], this, SubObj, null, objects[i]);
                objects[i].setId(data[i].id);

                delete objects[i].setId;
            }
        }
    };

    #updateObjects = (objects) => {
        const operation = "update";
        return executeHook(operation, this.#updateHook, this.#unWrap(objects), this.#axios)
            .then(data => {
                this.#cleanApiError(objects);
                return data;
            })
            .then(this.#toArray)
            .catch(error => this.#hanldeApiError(error, objects, operation));
    };

    #deleteObjects = (objects) => {
        const operation = "delete";
        return executeHook(operation, this.#deleteHook, this.#unWrap(objects), this.#axios)
            .then(data => {
                this.#cleanApiError(objects);
                return data;
            })
            .then(this.#toArray)
            .catch(error => this.#hanldeApiError(error, objects, operation));
    };

    #hanldeApiError = (error, objects, operation) => {
        error = error?.response?.data ?? error;
        const targets = objects.map(object => object.getId());

        // Set errors
        const strError = error?.message ?? error?.error ?? error;
        Object.values(objects).map(object => object.setError(strError));

        return Promise.reject({
            ...error,
            targets,
            operation
        });
    };

    #cleanApiError = (objects) => {
        Object.values(objects).map(object => object.setError(false));
    };

    #removeFromStoreSilentlyAfterFailure = (objects) => {
        for (let target of objects.map(object => object.getId())) {
            delete this.getStore().models[this.getType()].storedObjects[target];
        }
    };

}