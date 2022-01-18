import {executeHook, getHooksFromOptions, getHooksFromUrl} from "./modelHooksUtils";
import batchPromises from "batch-promises";

export default class Model {
    constructor(name, options) {
        this.__type = name;

        if (!name || !options) {
            throw new Error("A Model requires at least a name and a hook");
        }

        const [retrieveHook, insertHook, updateHook, deleteHook] = (typeof(options) === "object") ?
            getHooksFromOptions(options) : getHooksFromUrl(options);

        this.__retrieveHook = retrieveHook;
        this.__updateHook = updateHook;
        this.__insertHook = insertHook;
        this.__deleteHook = deleteHook;

        this.__singleItemQuery = false; // By default use arrays
        this.__batchSize = 4; // For HTTP requests in parallel if your API doesn't support multiple resources

        this.__includes = {};
    };

    _bulkOperation = (objects, action) => {
        if (this.__singleItemQuery) {
            return batchPromises(this.__batchSize, objects, action);
        } else {
            return action(objects);
        }
    }

    getType = () => {
        return this.__type;
    };

    _toArray = (data) => {
        if (Array.isArray(data)) {
            return data;
        } else {
            this.__singleItemQuery = true;
            return [data];
        }
    };

    retrieveAll = () => {
        return executeHook("retrieve", this.__retrieveHook, null)
            .then(this._toArray);
    };

    insertObjects = (objects) => {
        return this._bulkOperation(objects, this._insertObjects);
    };

    updateObjects = (objects) => {
        return this._bulkOperation(objects, this._updateObjects);
    };

    deleteObjects = (objects) => {
        return this._bulkOperation(objects, this._deleteObjects);
    };

    _insertObjects = (data) => {
        return Promise.resolve(true);
        return executeHook("insert", this.__insertHook, data)
            .then(this._toArray);
    };

    _updateObjects = (data) => {
        return Promise.resolve(true);
        return executeHook("update", this.__updateHook, data)
            .then(this._toArray);
    };

    _deleteObjects = (data) => {
        return Promise.resolve(true);
        return executeHook("update", this.__deleteHook, data)
            .then(this._toArray);
    };

    getStore = () => {
        return this.store;
    };

    addRelationByField = (model, localField, remoteField="id") => {
        const filterFunction = (parentObject, child) => {
            return parentObject[localField] === child[remoteField];
        };

        return this.addRelationByFilter(model, filterFunction);
    };

    addRelationByFilter = (model, filterFunction) => {
        const includedType = model.getType();

        this.__includes[includedType] = filterFunction;
    };

    addRelation = (model, param2, param3) => {

        if (model) {
            this.getStore().validateModel(model);

            if (typeof(param2) === "string" && (!param3 || typeof(param3) === "string")) { // explicit model, from, to
                return this.addRelationByField(model, param2, param3);
            } else if (!param3 && typeof(param2) === "function") { // explicit model, filterFunction
                return this.addRelationByFilter(model, param2);
            } else if (!param2 && !param3) { // implicit model, from, to (it uses the type as local key and the id as remote key)
                return this.addRelationByField(model, model.getType(), "id");
            } else {
                throw new Error("Invalid relation declaration");
            }

        } else {
            throw new Error("A relation needs a model");
        }

    };

    getRelation = (parentObject, includedType, filterFunction) => {
        const filterRelation = this.__includes[includedType];

        if (filterRelation) {
            return this.getStore()
                .find(includedType, (item) => filterRelation(parentObject, item))
                .then(data => {
                    if (filterFunction) {
                        return data.filter(filterFunction);
                    }

                    return data;
                });
        } else {
            return Promise.reject("The relation doesn't exist");
        }
    };

}