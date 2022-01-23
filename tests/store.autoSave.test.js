const chai = require("chai");
const chaiSubset = require('chai-subset');
const {Store, Model} = require("../src/index");
chai.use(chaiSubset);
const expect = chai.expect;

console.warn = () => {}; // Shut up

describe("Store and models creation", function() {

    it("autoSave: true - 1", function (done) {
        const store = new Store({
            lazyLoad: false,
            autoSave: true
        });

        let sets = {
            inserted: [],
            updated: [],
            deleted: []
        };

        const book = new Model("book", {
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            },
            insert: (objects) => {
                sets.inserted = sets.inserted.concat(objects);
            },
            update: (objects) => {
                sets.updated = sets.updated.concat(objects);
            },
            delete: (objects) => {
                sets.deleted = sets.deleted.concat(objects);
            }
        });


        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.insert("book", {id: 3});
                        store.find("book").then(data => {
                            data[0].set("title", "ciao");
                            store.delete([data[1]]);
                        });

                        store.on("save", (status) => {
                            if (status === "end"){
                                expect(JSON.stringify(sets.inserted)).to.equals(JSON.stringify([{id: 3}]));
                                expect(JSON.stringify(sets.updated)).to.equals(JSON.stringify([{id: 1, title: "ciao"}]));
                                expect(JSON.stringify(sets.deleted)).to.equals(JSON.stringify([{id: 2}]));
                                done();
                            }
                        });
                    });
            });
    }).timeout(10000);

    it("autoSave: true - 2", function (done) {
        const store = new Store({
            lazyLoad: false,
            autoSave: true
        });

        let sets = {
            inserted: [],
            updated: [],
            deleted: []
        };

        const book = new Model("book", {
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            },
            insert: (objects) => {
                sets.inserted = sets.inserted.concat(objects);
            },
            update: (objects) => {
                sets.updated = sets.updated.concat(objects);
            },
            delete: (objects) => {
                sets.deleted = sets.deleted.concat(objects);
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.insert("book", {id: 3});
                        store.find("book").then(data => {
                            data[0].title = "ciao";
                            data[1].destroy();
                        });

                        store.on("save", (status) => {
                            if (status === "end"){
                                expect(JSON.stringify(sets.inserted)).to.equals(JSON.stringify([{id: 3}]));
                                expect(JSON.stringify(sets.updated)).to.equals(JSON.stringify([{id: 1, title: "ciao"}]));
                                expect(JSON.stringify(sets.deleted)).to.equals(JSON.stringify([{id: 2}]));
                                done();
                            }
                        });
                    });
            });
    }).timeout(10000);

    it("autoSave: true - 3", function (done) {
        const store = new Store({
            lazyLoad: false,
            autoSave: true
        });

        let sets = {
            inserted: [],
            updated: [],
            deleted: []
        };

        const book = new Model("book", {
            load: () => {
                return Promise.resolve({title: "test"});
            },
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            },
            insert: (objects) => {
                sets.inserted = sets.inserted.concat(objects);
            },
            update: (objects) => {
                sets.updated = sets.updated.concat(objects);
            },
            delete: (objects) => {
                sets.deleted = sets.deleted.concat(objects);
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.find("book").then(data => {
                            data[0].load();
                        });

                        store.on("save", (status) => {
                            if (status === "start"){
                                done(new Error("Save invoked on load"));
                            }
                        });
                    });
                setTimeout(done, 5000)
            });
    }).timeout(10000);

    it("autoSave: false - 1", function (done) {
        const store = new Store({
            lazyLoad: false,
            autoSave: false
        });

        let sets = {
            inserted: [],
            updated: [],
            deleted: []
        };

        const book = new Model("book", {
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            },
            insert: (objects) => {
                sets.inserted = sets.inserted.concat(objects);
            },
            update: (objects) => {
                sets.updated = sets.updated.concat(objects);
            },
            delete: (objects) => {
                sets.deleted = sets.deleted.concat(objects);
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.insert("book", {id: 3});
                        store.find("book").then(data => {
                            data[0].title = "ciao";
                            data[1].destroy();

                            store.save();
                        });

                        store.on("save", (status) => {
                            if (status === "end"){
                                expect(JSON.stringify(sets.inserted)).to.equals(JSON.stringify([{id: 3}]));
                                expect(JSON.stringify(sets.updated)).to.equals(JSON.stringify([{id: 1, title: "ciao"}]));
                                expect(JSON.stringify(sets.deleted)).to.equals(JSON.stringify([{id: 2}]));
                                done();
                            }
                        });
                    });
            });
    }).timeout(10000);

    it("autoSave: false - 2", function (done) {
        const store = new Store({
            lazyLoad: false,
            autoSave: false
        });

        let sets = {
            inserted: [],
            updated: [],
            deleted: []
        };

        const book = new Model("book", {
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            },
            insert: (objects) => {
                sets.inserted = sets.inserted.concat(objects);
            },
            update: (objects) => {
                sets.updated = sets.updated.concat(objects);
            },
            delete: (objects) => {
                sets.deleted = sets.deleted.concat(objects);
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.insert("book", {id: 3});
                        store.find("book").then(data => {
                            data[0].load();

                            store.save();
                        });

                        store.on("save", (status) => {
                            if (status === "end"){
                                expect(JSON.stringify(sets.inserted)).to.equals(JSON.stringify([{id: 3}]));
                                done();
                            }
                        });
                    });
            });
    }).timeout(10000);

});