const chai = require("chai");
const chaiSubset = require("chai-subset");
const {Store, Model} = require("../src/index");
chai.use(chaiSubset);
const expect = chai.expect;

console.warn = () => {}; // Shut up

describe("AutoSave", function () {

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
                sets.inserted = objects;
            },
            update: (objects) => {
                sets.updated = objects;
            },
            delete: (objects) => {
                sets.deleted = objects;
            }
        });


        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.insert("book", {id: 3});
                        store.find("book")
                            .then(data => {
                                data[0].set("title", "ciao");
                                store.delete([data[1]]);
                            });

                        store.on("save", ({status}) => {
                            if (status === "end") {
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
                sets.inserted = objects;
            },
            update: (objects) => {
                sets.updated = objects;
            },
            delete: (objects) => {
                sets.deleted = objects;
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.insert("book", {id: 3});
                        store.find("book").then(data => {
                            data[0].title = "test";
                            data[1].destroy();
                        });

                        store.on("save", ({status}) => {
                            if (status === "end") {
                                expect(JSON.stringify(sets.inserted)).to.equals(JSON.stringify([{id: 3}]));
                                expect(JSON.stringify(sets.updated)).to.equals(JSON.stringify([{id: 1, title: "test"}]));
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
                sets.inserted = objects;
            },
            update: (objects) => {
                sets.updated = objects;
            },
            delete: (objects) => {
                sets.deleted = objects;
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

                        store.on("save", ({status}) => {
                            if (status === "start") {
                                done(new Error("Save invoked on load"));
                            }
                        });
                    });
                setTimeout(done, 5000);
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
                sets.inserted = objects;
            },
            update: (objects) => {
                sets.updated = objects;
            },
            delete: (objects) => {
                sets.deleted = objects;
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

                        store.on("save", ({status}) => {
                            if (status === "end") {
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
                sets.inserted = objects;
            },
            update: (objects) => {
                sets.updated = objects;
            },
            delete: (objects) => {
                sets.deleted = objects;
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

                        store.on("save", ({status}) => {
                            if (status === "end") {
                                expect(JSON.stringify(sets.inserted)).to.equals(JSON.stringify([{id: 3}]));
                                done();
                            }
                        });
                    });
            });
    }).timeout(10000);


    it("autoSave: false - dirty load()", function (done) {
        const store = new Store({
            lazyLoad: false,
            autoSave: false
        });

        const book = new Model("book", {
            load: () => {
                return Promise.resolve({title: "test"});
            },
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.on("error", (message) => {
                            if (message === "You cannot perform load() on an unsaved object.") {
                                done();
                            }
                        });

                        store.find("book")
                            .then(data => {
                                const first = data[0];
                                first.title = "test";
                                first.load();
                            });
                    });
            });
    }).timeout(10000);

    it("autoSave: false - clean load()", function (done) {
        const store = new Store({
            lazyLoad: false,
            autoSave: false
        });

        const book = new Model("book", {
            load: () => {
                return Promise.resolve({title: "test"});
            },
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.on("error", (message) => {
                            done(new Error(message));
                        });

                        store.find("book")
                            .then(data => {
                                const first = data[0];
                                first.author = "author";
                                store.save()
                                    .then(() => {
                                        return first.load();
                                    })
                                    .then(() => {
                                        expect(JSON.stringify(first.toJSON())).to.equals(JSON.stringify({id: 1, author: "author", title: "test"}));
                                        done();
                                    });
                            });
                    });
            });
    }).timeout(10000);

    it("autoSave: true - dirty load()", function (done) {
        const store = new Store({
            lazyLoad: false,
            autoSave: true
        });

        const book = new Model("book", {
            load: () => {
                return Promise.resolve({title: "test"});
            },
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(data => {
                        expect(JSON.stringify(data.map(i => i.toJSON()))).to.equals(JSON.stringify([{id: 1}, {id: 2}]));

                        store.on("error", (message) => {
                            done();
                        });

                        store.find("book")
                            .then(data => {
                                const first = data[0];
                                first.author = "author";
                                first.load()
                                    .then(() => {
                                        expect(JSON.stringify(first.toJSON())).to.equals(JSON.stringify({id: 1, author: "author", title: "test"}));
                                        done();
                                    });
                            });
                    });
            });
    }).timeout(10000);

    it("autoSave: 3000", function (done) {
        const store = new Store({
            lazyLoad: false,
            autoSave: 3000
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
                sets.inserted = objects;
            },
            update: (objects) => {
                sets.updated = objects;
            },
            delete: (objects) => {
                sets.deleted = objects;
            }
        });

        store.addModel(book)
            .then(() => {
                store.on("save", ({status}) => {
                    if (status === "end" && sets.updated.length) {
                        expect(JSON.stringify(sets.updated)).to.equals(JSON.stringify([{id: 1, title: "ciao"}]));
                        sets = {
                            inserted: [],
                            updated: [],
                            deleted: []
                        };
                        done();
                    }
                });

                store.find("book")
                    .then(data => {
                        data[0].title = "ciao";
                    });
            });
    }).timeout(10000);

    it("autoSave: true - hidden fields", function (done) {
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
            hiddenFields: ["hidden"],
            load: () => {
                return Promise.resolve({title: "test"});
            },
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            },
            insert: (objects) => {
                sets.inserted = objects;
            },
            update: (objects) => {
                sets.updated = objects;
            },
            delete: (objects) => {
                sets.deleted = objects;
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(([book]) => {
                        book.hidden = true;

                        store.on("error", (message) => {
                            done(new Error(message));
                        });

                        store.on("save", ({status}) => {
                            if (status === "end") {
                                expect(JSON.stringify(sets.updated)).to.equals(JSON.stringify([{id: 1}]));
                                done();
                            }
                        });

                        store.save();
                    });
            });
    }).timeout(10000);

    it("autoSave: true - set hidden fields", function (done) {
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
            load: () => {
                return Promise.resolve({title: "test"});
            },
            retrieve: () => {
                return [{id: 1}, {id: 2}];
            },
            insert: (objects) => {
                sets.inserted = objects;
            },
            update: (objects) => {
                sets.updated = objects;
            },
            delete: (objects) => {
                sets.deleted = objects;
            }
        });

        store.addModel(book)
            .then(() => {

                store.find("book")
                    .then(([book]) => {
                        book.set("hidden", true, true);

                        store.on("error", (message) => {
                            done(new Error(message));
                        });

                        store.save();

                        setTimeout(() => {
                            expect(JSON.stringify(sets.updated)).to.equals(JSON.stringify([]));
                            done();
                        }, 3000)
                    });
            });
    }).timeout(10000);
});