const chai = require("chai");
const {createTestStore, expectedBooks, expectedAuthors} = require("./store");
const chaiSubset = require("chai-subset");
const {Store, Model} = require("../src");
chai.use(chaiSubset);
const expect = chai.expect;

describe("Store refresh", function () {

    it("insert and retrieve id", function (done) {

        const store = createTestStore({
            autoSave: true,
            lazyLoad: false
        });
        store.on("save", ({model, status}) => {
            if (status === "end" && model === "book") {
                store.find("book", ({title}) => title === "A new book")
                    .then(([d]) => {
                        expect(d.id).to.equals(34);
                        done();
                    });
            }
        });
        store.insert("book", {title: "A new book"});

    }).timeout(10000);

    it("refresh - no autoRefresh", function (done) {

        let content = [{id: 1}, {id: 2}];

        const store = new Store({
            autoSave: true,
            lazyLoad: false
        });
        const test = new Model("test", {
            retrieve: () => content
        });
        store.addModel(test);

        store.find("test")
            .then((data) => {
                expect(data.map(i => i.toJSON())).to.deep.equals([{id: 1}, {id: 2}]);
            });

        store.on("refresh", ({status}) => {
            if (status === "end") {
                store.find("test")
                    .then((data) => {
                        expect(data.map(i => i.toJSON())).to.deep
                            .equals([{id: 1, content: "a"}, {id: 2, content: "b"}]);
                        done();
                    });
            }
        });

        setTimeout(() => {
            content = [{id: 1, content: "a"}, {id: 2, content: "b"}];
            store.refresh();
        }, 3000);

    }).timeout(10000);

    it("refresh with factory", function (done) {

        let content = [{id: 1}, {id: 2}];

        const store = new Store({
            autoSave: true,
            lazyLoad: false
        });
        const test = new Model("test", {
            lazyLoad: true,
            retrieve: ({id}) => content.filter(i => i.id === id)[0]
        });
        store.addModel(test);

        store.factory("test", {id: 1});
        store.factory("test", {id: 2});

        store.find("test")
            .then((data) => {
                expect(data.map(i => i.toJSON())).to.deep.equals([{id: 1}, {id: 2}]);
            });

        store.on("refresh", ({status}) => {
            if (status === "end") {
                store.find("test")
                    .then((data) => {
                        expect(data.map(i => i.toJSON())).to.deep
                            .equals([{id: 1, content: "a"}, {id: 2, content: "b"}]);
                        done();
                    });
            }
        });

        setTimeout(() => {
            content = [{id: 1, content: "a"}, {id: 2, content: "b"}];
            store.refresh();
        }, 3000);

    }).timeout(10000);

    it("refresh - autoRefresh", function (done) {

        let content = [{id: 1}, {id: 2}];
        let once = true;

        const store = new Store({
            autoSave: true,
            lazyLoad: false,
            autoRefresh: 5000
        });
        const test = new Model("test", {
            retrieve: () => content
        });
        store.addModel(test);

        store.find("test")
            .then((data) => {
                expect(data.map(i => i.toJSON())).to.deep.equals([{id: 1}, {id: 2}]);
            });

        store.on("refresh", ({status}) => {
            if (once && status === "end") {
                once = false;
                store.find("test")
                    .then((data) => {
                        expect(data.map(i => i.toJSON())).to.deep
                            .equals([{id: 1, content: "a"}, {id: 2, content: "b"}]);
                        done();
                    });
            }
        });

        setTimeout(() => {
            content = [{id: 1, content: "a"}, {id: 2, content: "b"}];
        }, 3000);

    }).timeout(10000);
});