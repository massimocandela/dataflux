const chai = require("chai");
const {createTestStore, expectedBooks, expectedAuthors} = require("./store");
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;

const store = createTestStore({
    autoSave: false,
    lazyLoad: true
});

describe("Store find", function () {

    it("loading collection - no filter function", function (done) {
        store.find("book")
            .then(data => {
                expect(JSON.stringify(data.map(i => i.isbn))).to.equal(JSON.stringify(expectedBooks.map(i => i.isbn)))
                done();
            });
    });

    it("loading collection - filter function", function (done) {
        const filter = ({id}) => id < 4;
        const filtered = expectedAuthors.filter(filter);
        store.find("author", filter)
            .then(data => {
                expect(JSON.stringify(data.map(i => i.id).sort())).to.equal(JSON.stringify(filtered.map(i => i.id).sort()))
                done();
            });
    }).timeout(4000);

    it("respecting fields", function (done) {
        store.find("book")
            .then(data => {
                const first = data[0];
                const expectedFirst = {isbn: expectedBooks[0].isbn};
                expect(JSON.stringify(first)).to.equal(JSON.stringify(expectedFirst));
                done();
            });
    });

    it("object load enrichment", function (done) {
        store.find("book")
            .then(data => {
                const first = data[0];

                first.load()
                    .then(() => {
                        const expected = {
                            "isbn": "9781593279509",
                            "title": "Eloquent JavaScript, Third Edition",
                            "authorId": 0,
                            "pages": 472
                        };
                        expect(first.shouldLoad()).to.equal(false);
                        expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                        done();
                    });
            });
    });

    it("object load relation - no filter function", function (done) {
        store.find("book")
            .then(data => {
                const first = data[0];
                first.getRelation("author")
                    .then(authors => {
                        const expected = {name: 'Marijn', surname: 'Haverbeke', id: 0, createdAt: "2022-01-07T21:38:50.295Z"};
                        expect(JSON.stringify(authors[0].toJSON())).to.equal(JSON.stringify(expected));
                        done();
                    })
            });
    });

    it("object load relation - on id - filter function", function (done) {
        store.find("book")
            .then(data => {
                const first = data[0];
                first.getRelation("author", ({name}) => name === "Marijn")
                    .then(authors => {
                        const expected = {name: 'Marijn', surname: 'Haverbeke', id: 0, createdAt: "2022-01-07T21:38:50.295Z"};
                        expect(JSON.stringify(authors[0].toJSON())).to.equal(JSON.stringify(expected));

                        first.getRelation("author", ({name}) => name === "Dante")
                            .then(authors => {
                                expect(authors.length).to.equal(0);
                                done();
                            })
                    })
            });
    });

    it("object load relation - on function - no filter function", function (done) {
        store.find("book")
            .then(data => {
                const first = data[0];
                first.getRelation("author2")
                    .then(authors => {
                        const expected = {name: 'Marijn', surname: 'Haverbeke', id: 0, createdAt: "2022-01-07T21:38:50.295Z"};
                        expect(JSON.stringify(authors[0].toJSON())).to.equal(JSON.stringify(expected));
                        done();
                    })
            });
    });

    it("sub objects", function (done) {
        store.find("author", ({surname}) => surname === "Rauschmayer")
            .then(([author]) => {

                expect(JSON.stringify(author.subComponents.map(i => i.toJSON())))
                    .to.equal(JSON.stringify([{ name: 1 }, { name: 2 }]));
                done();
            });
    }).timeout(10000);


    it("getCollection", function (done) {
       store.getCollection("author")
           .then(collection => {
               expect(collection.map(i => expectedAuthors.find(n => n.id === i.id)).filter(i => !i).length).to.equal(0);
               done();
           });

    }).timeout(10000);
});