import Obj from "./Obj";
import PubSub from "./PubSub";

export default class Store {
    constructor(options={}) {
        this.options = {
            autoSave: options.autoSave !== undefined ? options.autoSave : true,
            saveDelay: options.saveDelay || 1000,
            lazyLoad: options.lazyLoad || false
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
                if (!this.options.lazyLoad) {
                    resolve(this.#loadObjects(type));
                } else {
                    resolve();
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
        return this.#getPromise(type)
            .then(() => objects.map(object => this.#insertObject(type, object, true)));
    };

    get (type, id) {
        return this.#getPromise(type)
            .then(() => {
                try {
                    return this.models[type].storedObjects[id].object;
                } catch (error) {
                    return Promise.reject("Object not found");
                }
            });
    };

    find (type, filterFunction) {
        return this.#getPromise(type)
            .then(() => {
                const all = Object.values(this.models[type].storedObjects)
                    .filter(i => i.status !== "deleted")
                    .map(i => i.object);

                return filterFunction ? all.filter(filterFunction) : all;
            })
            .catch(error => {
                this.pubSub.publish("error", error);

                return Promise.reject(error);
            });
    };

    applyDiff ({inserted=[], updated=[], deleted=[]}, type) {
        return new Promise((resolve, reject) => {
            try {

                for (let object of inserted.concat(updated)) {
                    const item = this.models[type || object.object.getModel().getType()].storedObjects[object.id];
                    item.fingerprint = object.object.getFingerprint();
                    item.status = "old";
                }

                for (let object of deleted) {
                    delete this.models[type || object.object.getModel().getType()].storedObjects[object.id];
                }

                resolve();
            } catch(error) {
                return reject(error);
            }
        });
    };

    hasChanged (type, object) {
        const obj = this.models[type].storedObjects[object.getId()];

        return obj.fingerprint !== obj.object.getFingerprint()
    };

    preload(type){
        return this.#getPromise(type);
    }

    getDiff (type) {
        return this.#getPromise(type)
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
                    } else if (this.hasChanged(type, object.object)) {
                        updated.push(object);
                    }
                }

                return { inserted, updated, deleted };
            });
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

        return this.#getPromise(type)
            .then(() => {
                const deleted = Object.values(this.models[type].storedObjects)
                    .filter(i => filterFunction(i.object));

                for (let object of deleted) {
                    object.status = "deleted";
                }

                return deleted.map(i => i.object);
            });
    };

    #getPromise (type) {
        if (!this.models[type]) {
            return Promise.reject("The model doesn't exist");
        } else if (!this.models[type].promise && !this.options.lazyLoad) {
            return Promise.reject("The model is not loaded");
        } else if (!this.models[type].promise && this.options.lazyLoad) {
            return this.#loadObjects(type)
                .then(() =>  this.models[type].promise);
        } else {
            return this.models[type].promise;
        }
    };

    #insertObject (type, item, markAsNew=false) {
        const model = this.models[type].model;
        const wrapper = new Obj(item, model);
        const id = wrapper.getId();

        if (this.models[type].storedObjects[id]) {
            throw new Error(`The IDs provided for the model ${type} are not unique`);
        }
        this.models[type].storedObjects[id] = {
            id,
            fingerprint: wrapper.getFingerprint(),
            object: wrapper,
            status: markAsNew ? "new" : "old"
        }

        return wrapper;
    };

    #loadObjects (type) {
        const item = this.models[type];

        this.pubSub.publish("loading", {status: "start", model: type});
        return item.promise = item.model.retrieveAll()
            .then(items => {
                for (let item of items) {
                    this.#insertObject(type, item, false);
                }
                this.pubSub.publish("loading", {status: "end", model: type});
            });
    };

}