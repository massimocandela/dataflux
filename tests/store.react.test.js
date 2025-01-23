const chai = require("chai");
const {createTestStore, expectedBooks, expectedAuthors} = require("./store");
const chaiSubset = require("chai-subset");
chai.use(chaiSubset);
const expect = chai.expect;

const fakeReactComponent = function (props) {
    this.state = {};
    this.props = props;
    this.render = null;
    this.componentDidMount = () => true;
    this.setState = (data) => {
        this.state = data;
        this.render(this.state, this.props);
    };
    this.componentWillUnmount = null;

    setTimeout(() => this.componentDidMount(), 1000);
};

describe("Store React", function () {

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
        };

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
        };

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
            expect(typeof (component.componentWillUnmount)).to.equal("function");
            done();
        };

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
                const expected = {"isbn": "9781593279509", "title": "Eloquent JavaScript, Third Edition", "authorId": 0, "pages": 472};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                done();
            }
        };

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
                const expected = {"isbn": "9781593279509", "title": "Eloquent JavaScript, Third Edition", "authorId": 0, "pages": 472};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                done();
            }
        };

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
        let times = 0;

        component.render = (state) => {
            const first = state.book;

            if (times === 0) {
                setTimeout(() => first.load(), 2000);
            } else if (times === 1) {
                const expected = {"isbn": "9781593279509", "title": "Eloquent JavaScript, Third Edition", "authorId": 0, "pages": 472};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                done();
            }
            times++;
        };

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
        let times = 0;

        component.render = (state) => {
            const first = state.book;

            if (times === 0) {
                setTimeout(() => {
                    first.set("title", "Eloquent JavaScript, First Edition");
                }, 4000);
                const expected = {"isbn": "9781593279509"};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
            } else if (times === 1) {
                const expected = {"isbn": "9781593279509", "title": "Eloquent JavaScript, First Edition"};
                expect(JSON.stringify(first.toJSON())).to.equal(JSON.stringify(expected));
                done();
            }
            times++;
        };

        component.componentDidMount = () => {
            store.findOne("book", "book", component);
        };

    }).timeout(10000);

    it("props - component did update", function (done) {
        let once = true;

        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });

        const component = new fakeReactComponent();

        component.render = () => {

            if (component?.state?.book) {
                const subcomponent = new fakeReactComponent({
                    book: component.state.book
                });

                subcomponent.componentDidMount = () => {
                    store.didUpdate(subcomponent);
                };

                subcomponent.render = () => {
                    expect(subcomponent.props.book.name).to.equal("pedro");
                    if (once) {
                        done();
                    }
                    once = false;
                };

            }
        };

        component.componentDidMount = () => {
            setTimeout(() => store.findOne("book", "book", component), 2000);
            setTimeout(() => component.state.book.set("name", "pedro"), 3000);
        };
    }).timeout(60000);

    it("hasChanged - test diff", function (done) {
        let once = false;
        const store = createTestStore({
            autoSave: false,
            lazyLoad: true
        });
        const component = new fakeReactComponent();

        component.render = (state, props) => {
            if (store.hasChanged("book") && !once) { // I just need to check that it becomes true at some point
                expect(store.hasChanged("book")).to.equal(true);
                done();
                once = true;
            }
        };

        component.componentDidMount = () => {
            store.findOne("book", "book", component);
            setTimeout(() => component.state.book.set("name", "pedro"), 3000);
        };
    }).timeout(30000);

});