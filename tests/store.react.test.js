const chai = require("chai");
const {createTestStore, expectedBooks, expectedAuthors} = require("./store");
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);
const expect = chai.expect;

const fakeReactComponent = function (){
    this.state = {};
    this.render = null;
    this.componentDidMount = () => true;
    this.setState = (data) => {
        this.state = data;
        this.render(this.state);
    };
    this.componentWillUnmount = null;

    setTimeout(() => this.componentDidMount(), 1000)
};

describe("Store React", function() {

    it("findAll - no filter function", function (done) {
        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });

        const component = new fakeReactComponent();

        component.render = (state) => {
            const data = state.books;

            const obtained = JSON.stringify(data.map(i => i.isbn).sort());
            const expected = JSON.stringify(expectedBooks.map(i => i.isbn).sort());
            expect(obtained).to.equal(expected);
            done();
        }

        component.componentDidMount = () => {
            store.findAll("book", "books", component);
        };

    }).timeout(3000);

    it("findAll - filter function", function (done) {
        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });

        const component = new fakeReactComponent();
        const filter = ({id}) => id < 4;
        const filtered = expectedAuthors.filter(filter);

        component.render = (state) => {
            const data = state.authors;

            expect(JSON.stringify(data.map(i => i.id).sort())).to.equal(JSON.stringify(filtered.map(i => i.id).sort()));
            done();
        }

        component.componentDidMount = () => {
            store.findAll("author", "authors", component, filter);
        };

    }).timeout(3000);

    it("unsubscribe on componentWillUnmount", function (done) {
        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });
        const component = new fakeReactComponent();

        component.render = (state) => {
            expect(typeof(component.componentWillUnmount)).to.equal("function");
            done();
        }

        component.componentDidMount = () => {
            store.findAll("author", "authors", component);
        };

    }).timeout(3000);

    it("findAll - render multiple times - load function", function (done) {
        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });
        const component = new fakeReactComponent();
        let once = true;

        component.render = (state) => {
            const first = state.books[0];

            if (once) {
                setTimeout(() => first.load(), 2000);
                once = false;
            } else {
                const expected = {"isbn":"9781593279509","title":"Eloquent JavaScript, Third Edition","authorId":0,"pages":472};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                done();
            }
        }

        component.componentDidMount = () => {
            store.findAll("book", "books", component);
        };

    }).timeout(6000);

    it("findOne - load function", function (done) {
        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });
        const component = new fakeReactComponent();
        let once = true;

        component.render = (state) => {
            const first = state.book;

            if (once) {
                setTimeout(() => first.load(), 2000);
                once = false;
            } else {
                const expected = {"isbn":"9781593279509","title":"Eloquent JavaScript, Third Edition","authorId":0,"pages":472};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                done();
            }
        }

        component.componentDidMount = () => {
            store.findOne("book", "book", component);
        };

    }).timeout(6000);


    it("findOne - render multiple times - load function", function (done) {
        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });
        const component = new fakeReactComponent();
        let once = true;

        component.render = (state) => {
            const first = state.book;

            if (once) {
                setTimeout(() => first.load(), 2000);
                once = false;
            } else {
                const expected = {"isbn":"9781593279509","title":"Eloquent JavaScript, Third Edition","authorId":0,"pages":472};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                done();
            }
        }

        component.componentDidMount = () => {
            store.findOne("book", "book", component);
        };

    }).timeout(6000);

    it("findOne - render multiple times - simple set", function (done) {
        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });
        const component = new fakeReactComponent();
        let once = true;

        component.render = (state) => {
            const first = state.book;

            if (once) {
                setTimeout(() => {
                    first.set("title", "Eloquent JavaScript, First Edition");
                }, 4000);
                once = false;
                const expected = {"isbn":"9781593279509"};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
            } else {
                const expected = {"isbn":"9781593279509","title":"Eloquent JavaScript, First Edition"};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                done();
            }
        }

        component.componentDidMount = () => {
            store.findOne("book", "book", component);
        };

    }).timeout(10000);

});