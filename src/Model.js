import {executeHook, getHooksFromOptions, getHooksFromUrl} from "./modelHooksUtils";
import batchPromises from "batch-promises";
import axios from "axios";

const applyData = (obj, data) => {
    for (let att in data) {
        if (att !== "id" || obj.id === undefined || (att === "id" && obj.id === data.id)) {
            obj[att] = data[att];
        } else {
            return Promise.reject("The loading function cannot change the id of the object.")
        }
    }

    return Promise.resolve(obj);
};

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

    constructor(name, options={}) {
        this.#type = name;
        this.#store = null;
        this.#includes = {};
        this.#axios = options.axios || axios;
        this.#loadFunction = options.load || null;

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
            const res = this.#loadFunction(obj.toJSON());

            if (typeof(res) === "string") {
                return this.#axios({
                    method: "get",
                    url: res,
                    responseType: "json"
                })
                    .then(data => applyData(obj, data.data));
            } else {
                return res
                    .then(data => applyData(obj, data));
            }
        } else {
            return Promise.reject("You must define a loading function in the model to enable load().");
        }
    };

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

    getType = () => {
        return this.#type;
    };

    retrieveAll = () => {
        return executeHook("retrieve", this.#retrieveHook, null, this.#axios)
            .then(this.#toArray);
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

    #bulkOperation = (objects, action) => {
        if (this.#singleItemQuery) {
            return batchPromises(this.#batchSize, objects, action);
        } else {
            return action(objects);
        }
    };

    #toArray = (data) => {
        if (Array.isArray(data)) {
            return data;
        } else {
            this.#singleItemQuery = true;
            return [data];
        }
    };

    #insertObjects = (data) => {
        return executeHook("insert", this.#insertHook, data, this.#axios)
            .then(this.#toArray);
    };

    #updateObjects = (data) => {
        return executeHook("update", this.#updateHook, data, this.#axios)
            .then(this.#toArray);
    };

    #deleteObjects = (data) => {
        return executeHook("delete", this.#deleteHook, data, this.#axios)
            .then(this.#toArray);
    };

}