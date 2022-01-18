import Store from "./Store";

export default class PersistentStore extends Store{
    constructor(options) {
        super(options);

        if (typeof(this.options.autoSave) === "number") {
            setInterval(this.delayedSave, this.options.autoSave);
        }
    };

    _saveType = (type) => {
        return this._getSets(type)
            .then(({inserted, updated, deleted}) => {

                return this.models[type].model.insertObjects(inserted)
                    .then(() => this.models[type].model.updateObjects(updated))
                    .then(() => this.models[type].model.deleteObjects(deleted))
                    .then(() => {
                        for (let object of deleted) {
                            delete this.models[type].storedObjects[object.id];
                        }

                        for (let object of updated.concat(inserted)) {
                            this.models[type].storedObjects[object.id].fingerprint = object.object.getFingerprint();
                            this.models[type].storedObjects[object.id].status = "old";
                        }
                    });
            });
    };


    _getSets = (type) => {
        return this._getPromise(type)
            .then(() => {
                const objects = Object.values(this.models[type].storedObjects);

                const newObjects = objects.filter(object => object.status === "new");

                const edited = objects.filter(object => {
                    return object.status === "old" && object.fingerprint !== object.object.getFingerprint();
                });

                const deleted = objects.filter(object => object.status === "deleted");

                return {
                    inserted: newObjects,
                    updates: edited,
                    deleted: deleted
                }
            });
    }

    save = () => {
        return Promise.all(Object.keys(this.models).map(this._saveType));
    };

    delayedSave = () => {
        if (this.options.autoSave) {
            if (this.__delayedSaveTimer) {
                clearTimeout(this.__delayedSaveTimer);
            }
            this.__delayedSaveTimer = setTimeout(this.save, this.options.saveDelay);
        }

        return Promise.resolve();
    };


    trigger = (event, objects) => {
        if (["insert", "delete", "update"].includes(event)) {
            this.delayedSave();
        }
    };

}