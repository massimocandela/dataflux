const chai = require("chai");
const {createTestStore, expectedBooks, expectedAuthors} = require("./store");
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;

const store = createTestStore({
    autoSave: true,
    lazyLoad: false
});

describe("Store refresh", function () {

    it("insert and retrieve id", function (done) {

        store.on("save", (status) => {
            if (status === "end") {
                store.find("book", ({title}) => title === "A new book")
                    .then(([d]) => {
                        expect(d.getId()).to.equals(34);
                        done();
                    });
            }
        });
        store.insert("book", {title: "A new book"});

    }).timeout(20000);

});