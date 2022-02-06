const chai = require("chai");
const {createTestStore, expectedBooks, expectedAuthors} = require("./store");
const chaiSubset = require('chai-subset');
const {Store, Model} = require("../src");
const fs = require("fs");
chai.use(chaiSubset);
const expect = chai.expect;

describe("Model factory", function() {

    it("factory creation", function (done) {
        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });

        const author3 = new Model("author3", {
            lazyLoad: true,
            retrieve: ({id}) => {
                return Promise.resolve(expectedAuthors.filter(i => i.id === id));
            }
        });

        store.addModel(author3);
        store.factory("author3", {id: 4});

        store.find("author3")
            .then(([object]) => {
                expect(JSON.stringify(object.toJSON())).to.equal(JSON.stringify({ name: 'Addy', surname: 'Osmani', id: 4 }));
                done();
            });
    }).timeout(6000);

    it("factory save - edit", function (done) {

        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });

        let sets = {
            inserted: [],
            updated: [],
            deleted: []
        };

        const author3 = new Model("author3", {
            lazyLoad: true,
            retrieve: ({id}) => {
                return Promise.resolve(expectedAuthors.filter(i => i.id === id));
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

        store.addModel(author3);
        store.factory("author3", {id: 4});

        store.on("save", (status) => {
            if (status === "end"){
                expect(JSON.stringify(sets.updated)).to.equals(JSON.stringify([{"name":"Addy","surname":"Osmani","id":4,"test":true}]));
                expect(JSON.stringify(sets.inserted)).to.equals(JSON.stringify([]));
                done();
            }
        });
        store.find("author3")
            .then(([object]) => {

                object.test = true;
                store.save();
            });

    }).timeout(10000);

    it("factory save - no edit", function (done) {

        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });

        let sets = {
            inserted: [],
            updated: [],
            deleted: []
        };

        const author3 = new Model("author3", {
            lazyLoad: true,
            retrieve: ({id}) => {
                return Promise.resolve(expectedAuthors.filter(i => i.id === id));
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

        store.addModel(author3);
        store.factory("author3", {id: 4});

        store.on("save", (status) => {
            if (status === "end"){
                expect(JSON.stringify(sets.updated)).to.equals(JSON.stringify([]));
                expect(JSON.stringify(sets.inserted)).to.equals(JSON.stringify([]));
                done();
            }
        });

        store.save();

    }).timeout(10000);
});