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

import {v4 as uuidv4} from "uuid";
import batchPromises from "batch-promises";
import PersistentStore from "./PersistentStore";

class ObserverStore extends PersistentStore {
    #queryPromises = [];
    #unsubPromises = [];

    constructor(options) {
        super(options);
        this._subscribed = {};
        this._multipleSubscribed = {};

        if (options.autoRefresh && typeof (options.autoRefresh) === "number") {
            setInterval(this.refresh, options.autoRefresh);
        }
    };

    multipleSubscribe = (subscriptions, callback) => {
        const dataPayload = {};
        const subKey = uuidv4();

        const areAllDone = () => {
            return subscriptions.map(([name]) => name).every(name => dataPayload[name] !== undefined);
        };

        Promise.all(subscriptions
            .map(sub => {
                const [name, filterFunction = null] = sub;

                const wrappedCallback = (data) => {
                    dataPayload[name] = data;

                    return areAllDone() && callback(dataPayload);
                };

                return this.subscribe(name, wrappedCallback, filterFunction);
            }))
            .then(subKeys => {
                this._multipleSubscribed[subKey] = subKeys;

                return subKey;
            });

        return subKey;
    };

    subscribe = (type, callback, filterFunction) => {
        const subKey = uuidv4();
        this._subscribed[type] ??= {};

        const prom = this.find(type, filterFunction)
            .then(data => {

                this.#subscribeToObjects(type, data, {
                    callback,
                    filterFunction,
                    subKey
                });

                callback(data);
            });

        this.#queryPromises.push(prom);

        return subKey;
    };

    unsubscribe = (key) => {
        this.#unsubPromises = (this.#queryPromises.length
            ? Promise.all(this.#queryPromises)
            : Promise.resolve())
            .then(() => {
                if (this._multipleSubscribed[key]) {
                    for (let sub of this._multipleSubscribed[key]) {
                        this.unsubscribe(sub);
                    }
                    delete this._multipleSubscribed[key];
                } else {
                    for (let type in this._subscribed) {
                        for (let id in this._subscribed[type]) {

                            this._subscribed[type][id] = this._subscribed[type][id]
                                .filter(i => {
                                    return i.subKey !== key;
                                });

                            if (this._subscribed[type]["*"]) {
                                this._subscribed[type]["*"] = this._subscribed[type]["*"]
                                    .filter(i => {
                                        return i.subKey !== key;
                                    });
                            }

                            if (this._subscribed[type][id].length === 0) {
                                delete this._subscribed[type][id];
                            }
                        }
                    }
                }
            });

    };

    update(objects, skipSave) {
        if (objects?.filter(i => !!i)?.length) {
            if (!skipSave) {
                this.#propagateChange(objects);
            }

            return super.update(objects, skipSave)
                .then(data => {
                    return this.#propagateChange(data);
                });
        }
    };

    insert(type, objects) {
        objects = Array.isArray(objects) ? objects : [objects];
        return super.insert(type, objects)
            .then(objects => {
                this.#propagateInsertChange(type, objects);

                return objects;
            });
    };

    mock(type, objects) {
        objects = Array.isArray(objects) ? objects : [objects];
        return super.mock(type, objects)
            .then(objects => {
                this.#propagateInsertChange(type, objects);

                return objects;
            });
    };

    delete(typeOrObjects, filterFunction) {
        return super.delete(typeOrObjects, filterFunction)
            .then(this.#propagateChange);
    };

    #getUniqueSubs = (objects, type) => {
        const out = {};
        for (let object of objects) {
            const objectId = object.getId();

            const typeChannel = this._subscribed[type] || {};
            const subscribedToObject = typeChannel[objectId] || [];

            for (let sub of subscribedToObject) {
                out[sub.subKey] ??= sub;
            }
        }

        return Object.values(out);
    };

    #propagateChange = (objects = []) => {
        return (this.#unsubPromises.length ? Promise.all(this.#unsubPromises) : Promise.resolve())
            .then(() => {
                if (objects.length) {
                    const type = objects?.[0]?.getModel()?.getType();
                    if (type) {
                        const uniqueSubs = this.#getUniqueSubs(objects, type);

                        return batchPromises(10, uniqueSubs, ({callback, filterFunction}) => {
                            return this.find(type, filterFunction).then(callback);
                        });
                    } else {
                        console.log("Malformed update list", objects);
                    }
                }

                return objects;
            });
    };

    #appendIfNotExistent = (arr, item) => {
        if (Object.values(arr).filter(({subKey}) => item.subKey === subKey).length === 0) {
            arr.push(item);
        }
    };

    #subscribeToObjects = (type, objectsToSubscribe, item) => {

        for (let object of objectsToSubscribe) {
            const id = object.getId();
            this._subscribed[type][id] ??= [];
            this.#appendIfNotExistent(this._subscribed[type][id], item);
        }

        this._subscribed[type]["*"] ??= [];
        this.#appendIfNotExistent(this._subscribed[type]["*"], item);
    };

    reset = (type) => {
        return this._refresh(type, true);
    };

    refresh = (type) => {
        return this._refresh(type, false);
    };

    _refresh = (type, force) => {

        const refreshByType = (type) => {
            this.pubSub.publish("refresh", {status: "start", model: type});
            return this.refreshObjectByType(type, force)
                .then(([inserted, updated, deleted]) => {
                    const item = this.models[type];

                    return Promise
                        .all([
                            this.#propagateInsertChange(type, inserted),
                            this.#propagateChange(updated),
                            this.#propagateChange(deleted)
                        ])
                        .then(() => {
                            this.pubSub.publish("refresh", {status: "end", model: type});

                            return item.promise;
                        });
                });
        };

        if (type) {
            return refreshByType(type);
        } else {
            return Promise.all(Object.keys(this.models).map(refreshByType));
        }
    };

    #propagateInsertChange(type, newObjects) {
        return (this.#unsubPromises.length ? Promise.all(this.#unsubPromises) : Promise.resolve())
            .then(() => {
                if (this._subscribed[type]) {

                    const uniqueSubs = {};
                    const objects = Object.values(this._subscribed[type]);

                    for (let object of objects) {
                        for (let sub of object) {
                            if (!uniqueSubs[sub.subKey]) {
                                uniqueSubs[sub.subKey] = sub;
                            }
                        }
                    }

                    const possibleSubs = Object.values(uniqueSubs);

                    return batchPromises(10, possibleSubs, ({callback, filterFunction, subKey}) => {

                        const objectsToSubscribe = filterFunction ? newObjects.filter(filterFunction) : newObjects;

                        if (objectsToSubscribe.length) { // Check if the new objects matter

                            return this.find(type, filterFunction)
                                .then(data => {
                                    this.#subscribeToObjects(type, objectsToSubscribe, {
                                        callback,
                                        filterFunction,
                                        subKey
                                    });

                                    return data;
                                })
                                .then(callback);
                        }
                    });
                }
            });
    };

}


export default ObserverStore;
