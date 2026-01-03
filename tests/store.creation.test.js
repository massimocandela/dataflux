const chai = require("chai");
const chaiSubset = require('chai-subset');
const {Store, Model} = require("../src/index");
const {expectedBooks} = require("./store");
chai.use(chaiSubset);
const expect = chai.expect;

console.warn = () => {}; // Shut up

describe("Store and models creation", function() {

    it("duplicated model", function (done) {
        const store = new Store({
            lazyLoad: true,
            autoSave: false
        });

        const book = new Model("book", {
            retrieve: () => ([{isbn: 1}, {isbn: 2}])
        });

        const author = new Model("book", {
            retrieve: () => ([{isbn: 3}, {isbn: 4}])
        });
        store.addModel(book);
        store.addModel(author)
            .catch(error => {
                expect(error.toString()).to.equals("The model already exists");
                done();
            });
    });

    it("lazyLoad", function (done) {

        let retrieved = 0;

        const store = new Store({
            lazyLoad: true,
            autoSave: false
        });

        const book = new Model("book", {
            retrieve: () => {
                retrieved++;
                return [{isbn: 1}, {isbn: 2}];
            }
        });

        store.addModel(book)
            .then(() => {
                expect(retrieved).to.equals(0);
            })
            .then(() => {
                return store.find("book")
                    .then(() => {
                        expect(retrieved).to.equals(1);
                    });
            })
            .then(done);

    });

    it("autoSave: true", function (done) {

        const store = new Store({
            autoSave: true
        });

        const book = new Model("book", {
            retrieve: () => {
                return [{isbn: 1}, {isbn: 2}];
            },
            update: ([obj]) => {
                expect(JSON.stringify(obj)).to.equals(JSON.stringify({isbn: 1, title: "test"}));
                done();

                return Promise.resolve();
            }
        });

        store.addModel(book);

        store.find("book")
            .then(data => {
               const first = data[0];

                first.set("title", "test");
            });

    }).timeout(2000);

    it("autoSave: false", function (done) {

        let failed = false;
        const store = new Store({
            autoSave: false
        });

        const book = new Model("book", {
            retrieve: () => {
                return [{isbn: 1}, {isbn: 2}];
            },
            update: ([obj]) => {
                failed = true;
                return Promise.resolve();
            }
        });

        store.addModel(book);

        store.find("book")
            .then(data => {
                const first = data[0];

                first.set("title", "test");
            });
        setTimeout(() => {
            expect(failed).to.equals(false);
            done();
        },3000)
    }).timeout(4000);

    it("autoSave: 4000", function (done) {

        const store = new Store({
            autoSave: 4000,
            batchPersistence: 100
        });

        const book = new Model("book", {
            retrieve: () => {
                return [{isbn: 1}, {isbn: 2}];
            },
            update: ([obj]) => {
                expect(JSON.stringify(obj)).to.equals(JSON.stringify({isbn: 1, title: "test"}));
                done();

                return Promise.resolve();
            }
        });

        store.addModel(book);

        store.find("book")
            .then(data => {
                const first = data[0];

                first.title = "test";
            });

    }).timeout(8000);


    it("validation - no save", function (done) {

        const store = new Store({
            autoSave: false,
            lazyLoad: true
        });

        let updated = [];

        const book = new Model("book", {
            retrieve: () => {
                return expectedBooks;
            },
            validate: {
                isbn: ({isbn}) => {
                    if (typeof(isbn) !== "number") {
                        throw new Error("The isbn must be a number");
                    }
                }
            }
        });

        store.addModel(book);

        store.find("book")
            .then(data => {
                const first = data[0];

                first.set("isbn", "test");
                expect(first.getError("isbn")).to.equals("The isbn must be a number"); // Specific error
                expect(first.getError()).to.equals(false); // Generic API error

                first.set("isbn", 123);
                expect(first.getError("isbn")).to.equals(false);

                done();
            });

    }).timeout(8000);

    it("validation - save", function (done) {

        const store = new Store({
            autoSave: false,
            lazyLoad: true
        });

        let updated = [];

        const book = new Model("book", {
            retrieve: () => {
                return expectedBooks;
            },
            update: (data) => {
                updated = data;
            },
            pre: i => {
                i.potato = 1;
                return i;
            },
            post: i => {
                expect(i).to.deep.equals({
                    ...i,
                    potato: 1
                });

                i.potato = 2;
                return i;
            },
            validate: {
                isbn: ({isbn}) => {
                    if (typeof(isbn) !== "number") {
                        throw new Error("The isbn must be a number");
                    }
                }
            }
        });

        store.addModel(book);

        store.find("book")
            .then(data => {
                const first = data[0];
                let once = true;

                first.set("isbn", "test");

                store.on("save", ({status}) => {
                    if (status === "end") {
                        if (once) {
                            once = false;
                            expect(updated).to.deep.equals([]);

                            setTimeout(() => {
                                first.set("isbn", 123);
                                store.save();
                            }, 10000)
                        } else {
                            expect(updated).to.deep.equals([{
                                isbn: 123,
                                potato: 2,
                                title: 'Eloquent JavaScript, Third Edition',
                                authorId: 0,
                                pages: 472
                            }
                            ]);
                            done();
                        }
                    }
                });

                store.save();
            });

    }).timeout(20000);
});