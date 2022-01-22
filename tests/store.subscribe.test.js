const chai = require("chai");
const {createTestStore, expectedBooks, expectedAuthors} = require("./store");
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;

const store = createTestStore({
    autoSave: false,
    lazyLoad: true
});


describe("Store subscribe", function() {

    it("loading collection - no filter function", function (done) {
        store.subscribe("book", (data) => {
            expect(JSON.stringify(data.map(i => i.isbn))).to.equal(JSON.stringify(expectedBooks.map(i => i.isbn)))
            done();
        });
    });

    it("loading collection - filter function", function (done) {
        const filter = ({id}) => id < 4;
        const filtered = expectedAuthors.filter(filter);
        store.subscribe("author", (data) => {
            expect(JSON.stringify(data.map(i => i.id).sort())).to.equal(JSON.stringify(filtered.map(i => i.id).sort()));
            done();
        }, filter);
    });

    it("respecting fields", function (done) {

        store.subscribe("book", (data) => {
            const first = data[0];
            const expectedFirst = {isbn: expectedBooks[0].isbn};
            expect(JSON.stringify(first)).to.equal(JSON.stringify(expectedFirst));
            done();
        });
    });


});