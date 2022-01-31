import { v4 as uuidv4 } from "uuid";
import batchPromises from "batch-promises";
import PersistentStore from "./PersistentStore";

class ObserverStore extends PersistentStore{
    constructor(options) {
        super(options);
        this._subscribed = {};
        this._multipleSubscribed = {};
    };

    multipleSubscribe = (subscriptions, callback) => {
        const dataPayload = {};

        const areAllDone = () => {
            return subscriptions.map(([name]) => name).every(name => dataPayload[name] !== undefined);
        };

        return Promise.all(subscriptions
            .map(sub  => {
                const [name, filterFunction=null] = sub;

                const wrappedCallback = (data) => {
                    dataPayload[name] = data;

                    return areAllDone() && callback(dataPayload);
                };

                return this.subscribe(name, wrappedCallback, filterFunction);
            }))
            .then(subKeys => {
                const subKey = uuidv4();
                this._multipleSubscribed[subKey] = subKeys;

                return subKey;
            });
    };

    subscribe = (type, callback, filterFunction) => {
        const subKey = uuidv4();
        if (!this._subscribed[type]) {
            this._subscribed[type] = {};
        }

        this.find(type, filterFunction)
            .then(data => {

                this.#subscribeToObjects(type, data, {
                    callback,
                    filterFunction,
                    subKey
                });

                return callback(data);
            });

        return subKey;
    };

    unsubscribe = (key) => {
        if (this._multipleSubscribed[key]){
            for (let sub of this._multipleSubscribed[key]) {
                this.unsubscribe(sub);
            }
            delete this._multipleSubscribed[key];
        } else {
            for (let type in this._subscribed) {
                for (let id in this._subscribed[type]) {
                    this._subscribed[type][id] = this._subscribed[type][id]
                        .filter(i => {
                            return i.subKey !== key
                        });

                    if (this._subscribed[type][id].length === 0) {
                        delete this._subscribed[type][id];
                    }
                }
            }
        }
    };

    update(objects, skipSave) {
        return super.update(objects, skipSave)
            .then(this.#propagateChange);
    };

    insert(type, objects) {
        objects = Array.isArray(objects) ? objects : [objects];
        return super.insert(type, objects)
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
                out[sub.subKey] = out[sub.subKey] || sub;
            }
        }

        return Object.values(out);
    }

    #propagateChange = (objects=[]) => {
        if (objects.length) {
            const type = objects[0].getModel().getType();
            const uniqueSubs = this.#getUniqueSubs(objects, type);

            batchPromises(10, uniqueSubs, ({callback, filterFunction}) => {
                return this.find(type, filterFunction).then(callback);
            });
        }

        return objects;
    };

    #subscribeToObjects = (type, objectsToSubscribe, item) => {

        for (let object of objectsToSubscribe) {
            const id = object.getId();
            if (!this._subscribed[type][id]) {
                this._subscribed[type][id] = [];
            }

            this._subscribed[type][id].push(item);
        }

    };

    #propagateInsertChange (type, newObjects) {
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

            batchPromises(10, possibleSubs, ({callback, filterFunction}) => {

                const objectsToSubscribe = filterFunction ? newObjects.filter(filterFunction) : newObjects;

                if (objectsToSubscribe.length) { // Check if the new objects matter

                    return this.find(type, filterFunction)
                        .then(data => {
                            let subKey;
                            for (let d of data) {
                                const item = this._subscribed[d.getModel().getType()][d.getId()];
                                subKey = item ? item.subKey : null
                                if (subKey) break;
                            }

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
    };

}



export default ObserverStore;
