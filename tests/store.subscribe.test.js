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
        const pkey = store.subscribe("book", (data) => {
            const obtained = JSON.stringify(data.map(i => i.isbn).sort());
            const expected = JSON.stringify(expectedBooks.map(i => i.isbn).sort());
            expect(obtained).to.equal(expected);
            done();
            store.unsubscribe(pkey);
        });
    });

    it("loading collection - filter function", function (done) {
        const filter = ({id}) => id < 4;
        const filtered = expectedAuthors.filter(filter);
        const pkey = store.subscribe("author", (data) => {
            expect(JSON.stringify(data.map(i => i.id).sort())).to.equal(JSON.stringify(filtered.map(i => i.id).sort()));
            done();
            store.unsubscribe(pkey);
        }, filter);
    });

    it("respecting fields", function (done) {
        const pkey = store.subscribe("book", (data) => {
            const first = data[0];
            const expectedFirst = {isbn: expectedBooks[0].isbn};
            expect(JSON.stringify(first)).to.equal(JSON.stringify(expectedFirst));
            done();
            store.unsubscribe(pkey);
        });
    });

    it("object load enrichment", function (done) {
        let once = true;
        const pkey = store.subscribe("book", data => {
            const first = data[0];

            if (once) {
                setTimeout(() => first.load(), 2000);
                once = false;
            } else {
                const expected = {"isbn":"9781593279509","title":"Eloquent JavaScript, Third Edition","authorId":0,"pages":472};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                done();
                store.unsubscribe(pkey);
            }
        });

    }).timeout(10000);

});