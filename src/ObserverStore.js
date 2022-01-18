import { v4 as uuidv4 } from "uuid";
import batchPromises from "batch-promises";
import PersistentStore from "./PersistentStore";

class ObserverStore extends PersistentStore{
    constructor(options) {
        super(options);
        this.__subscribed = {};
    };

    subscribe = (type, callback, filterFunction) => {
        const subKey = uuidv4();
        if (!this.__subscribed[type]) {
            this.__subscribed[type] = {};
        }

        this.find(type, filterFunction)
            .then(data => {

                this._subscribeToObjects(type, data, {
                    callback,
                    filterFunction,
                    subKey
                });

                return callback(data);
            });

        return subKey;
    };

    unsubscribe = (key) => {
        for (let type in this.__subscribed) {
            for (let id in this.__subscribed[type]) {
                this.__subscribed[type][id] = this.__subscribed[type][id]
                    .filter(i => {
                        return i.subKey !== key
                    });

                if (this.__subscribed[type][id].length === 0) {
                    delete this.__subscribed[type][id];
                }
            }
        }
    };

    _getUniqueSubs = (objects, type) => {
        const out = {};
        for (let object of objects) {
            const objectId = object.getId();

            const typeChannel = this.__subscribed[type] || {};
            const subscribedToObject = typeChannel[objectId] || [];

            for (let sub of subscribedToObject) {
                out[sub.subKey] = out[sub.subKey] || sub;
            }
        }

        return Object.values(out);
    }

    _propagateChange = (objects=[]) => {
        if (objects.length) {
            const type = objects[0].getModel().getType();
            const uniqueSubs = this._getUniqueSubs(objects, type);

            batchPromises(10, uniqueSubs, ({callback, filterFunction}) => {
                return this.find(type, filterFunction).then(callback)
            });
        }
    };


    _subscribeToObjects = (type, objectsToSubscribe, item) => {

        for (let object of objectsToSubscribe) {
            const id = object.getId();
            if (!this.__subscribed[type][id]) {
                this.__subscribed[type][id] = [];
            }

            this.__subscribed[type][id].push(item);
        }

    }

    _propagateInsertChange = (type, newObjects) => {
        const uniqueSubs = {};
        const objects = Object.values(this.__subscribed[type]);

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
                            const item = this.__subscribed[d.getModel().getType()][d.getId()];
                            subKey = item ? item.subKey : null
                            if (subKey) break;
                        }

                        this._subscribeToObjects(type, objectsToSubscribe, {
                            callback,
                            filterFunction,
                            subKey
                        });

                        return data;
                    })
                    .then(callback);
            }
        });
    };

    trigger = (event, objects) => {
        switch (event) {
            case "insert":
                if (objects[0]) this._propagateInsertChange(objects[0].getModel().getType(), objects);
                break;
            case "update":
                this._propagateChange(objects);
                break;
            case "delete":
                this._propagateChange(objects);
                break;
        }

        this.delayedSave();
    };

}



export default ObserverStore;
