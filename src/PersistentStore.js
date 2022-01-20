import Store from "./Store";

export default class PersistentStore extends Store{
    constructor(options) {
        super(options);
        this._busy = false;
        this._delayedSaveTimer = null;

        if (typeof(this.options.autoSave) === "number") {
            setInterval(() => {
                if (!this._busy) {
                    this.delayedSave();
                }
            }, this.options.autoSave);
        }
    };

    addModel(model) {
        this._busy = true;

        super.addModel(model)
            .then(() => {
                this._busy = false;
            });
    };

    save = () => {
        this._busy = true;
        this.pubSub.publish("save", "start");

        return Promise.all(Object.keys(this.models).map(this._saveByType))
            .then(data => {
                this._busy = false;
                this.pubSub.publish("save", "end");

                return data;
            })
            .catch(error => {
                this._busy = false;
                this.pubSub.publish("save", "end");
                this.pubSub.publish("error", error);
                return Promise.reject(error);
            });
    };

    insert(type, objects) {
        return super.insert(type, objects)
            .then(data => {
                this.delayedSave();

                return data;
            });
    };

    delete(typeOrObjects, filterFunction) {
        return super.delete(typeOrObjects, filterFunction)
            .then(data => {
                this.delayedSave();

                return data;
            });
    };

    update(objects) {
        return super.update(objects)
            .then(data => {
                this.delayedSave();

                return data;
            });
    };

    _saveByType = (type) => {
        return this.getDiff(type)
            .then(({inserted, updated, deleted}) => {

                const model = this.models[type].model;

                // Operations order:
                // 1) insert
                // 2) update
                // 3) delete
                return model.insertObjects(inserted)
                    .then(() => this.applyDiff({inserted}, type))
                    .then(() => model.updateObjects(updated))
                    .then(() => this.applyDiff({updated}, type))
                    .then(() => model.deleteObjects(deleted))
                    .then(() => this.applyDiff({deleted}, type));
            });
    };
    
    delayedSave = () => {
        if (this.options.autoSave) {
            if (this._delayedSaveTimer) {
                clearTimeout(this._delayedSaveTimer);
            }
            this._delayedSaveTimer = setTimeout(this.save, this.options.saveDelay);
        }
    };
}