import Obj from "./StoreObject";
import fingerprint from "./fingerprint";

export default class Store {
    constructor(options={}) {
        this.options = {
            autoSave: options.autoSave || 3000,
            saveDelay: options.autoSave || 1000,
            lazyLoad: options.lazyLoad || false
        };
        this.models = {};
    };

    validateModel = (model) => {
        const type = model.getType();

        if (typeof(type) !== "string" || type === "") {
            throw new Error("Not valid model object: type missing");
        }
    }

    addModel = (model) => {
        this.validateModel(model);

        const type = model.getType();

        if (!this.models[type]) {
            this.models[type] = {
                model,
                storedObjects: {}
            };
            model.store = this;
            if (!this.options.lazyLoad){
                this._loadObjects(type);
            }
        } else {
            throw new Error("The model already exists");
        }
    };

    _getPromise = (type) => {
        if (!this.models[type]) {
            return Promise.reject("The model doesn't exist");
        } else if (!this.models[type].promise && !this.options.lazyLoad) {
            return Promise.reject("The model is not loaded");
        } else if (!this.models[type].promise && this.options.lazyLoad) {
            return this._loadObjects(type)
                .then(() =>  this.models[type].promise);
        } else {
            return this.models[type].promise;
        }
    };

    _insertObject = (type, item, markAsNew=false) => {
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

    _loadObjects = (type) => {
        const item = this.models[type];

        return item.promise = item.model.retrieveAll()
            .then(items => {
                for (let item of items) {
                    this._insertObject(type, item, false);
                }
            });
    };

    get = (type, id) => {
        return this._getPromise(type)
            .then(() => {
                try {
                    this.models[type].storedObjects[id].object
                } catch (error) {
                    return Promise.reject("Object not found");
                }
            });
    };

    find = (type, filterFunction) => {
        return this._getPromise(type)
            .then(() => {
                const all = Object.values(this.models[type].storedObjects)
                    .filter(i => i.status !== "deleted")
                    .map(i => i.object);

                return filterFunction ? all.filter(filterFunction) : all;
            });
    };

    _deleteByObject = (object) => {
        return this._deleteByFilter(object.getType(), (item) => {
            return fingerprint(object) === fingerprint(item);
        });
    };

    _deleteByFilter = (type, filterFunction) => {
        return this._getPromise(type)
            .then(() => {
                const deleted = Object.values(this.models[type].storedObjects)
                    .filter(i => filterFunction(i.object));

                for (let object of deleted) {
                    object.status = "deleted";
                }

                this.trigger("delete", deleted.map(i => i.object));

                return true;
            });
    };

    delete = (typeOrObjects, filterFunction) => {
        if (typeof(typeOrObjects) === "string" && typeof(filterFunction) === "function") {
            return this._deleteByFilter(typeOrObjects, filterFunction);
        } else if (typeof(typeOrObjects) === "object" && typeOrObjects.length){
            return Promise.all(typeOrObjects.map(this._deleteByObject));
        } else {
            throw new Error("Invalid delete request. You have to provide a list of objects or a type and a filter function");
        }
    };

    insert = (type, object) => {
        return this._getPromise(type)
            .then(() => {
                const newObj = this._insertObject(type, object, true);
                this.trigger("insert", [newObj]);

                return true;
            });
    };

    update = (objects) => {
        this.trigger("update", objects);
    };


    trigger = (event, objects) => {
        // Nothing here
    };

}