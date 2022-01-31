const {Model, Store} = require("../src/index");
const fs = require("fs");

const booksFile = "./tests/data/books.json";
const authorsFile = "./tests/data/authors.json";

const loadAnswer = (isbn, file) => {
    const items = JSON.parse(fs.readFileSync(file, "utf-8"));

    return Promise.resolve(items.filter(i => i.isbn === isbn)[0]);
};

const apiAnswer = (fields, file) => {
    const items = JSON.parse(fs.readFileSync(file, "utf-8"));
    const filtered = items.map(item => {
        if (fields) {
            const out = {};
            for (let field of fields) {
                out[field] = item[field];
            }
            return out;
        } else {
            return item;
        }
    })

    return Promise.resolve(filtered);
};

console.warn = () => {}; // Shut up


const createTestStore  = (options) => {

    const store = new Store(options);

    store.on("error", console.log);

    const bookFields = ["isbn"];
    const book = new Model("book", {
        fields: bookFields,
        hiddenFields: [],
        load: (obj) => loadAnswer(obj.isbn, booksFile),
        retrieve: () => apiAnswer(bookFields, booksFile)
    });

    const author = new Model("author", {
        parseMoment: true,
        retrieve: () => apiAnswer(null, authorsFile)
    });

    const author2 = new Model("author2", {
        retrieve: () => apiAnswer(null, authorsFile)
    });

    store.addModel(book);
    store.addModel(author);
    store.addModel(author2);

    book.addRelation(author, "authorId");
    book.addRelation(author2, ({authorId}, {id}) => id === authorId);

    return store;
}

const expectedBooks = JSON.parse(fs.readFileSync(booksFile, "utf-8"));
const expectedAuthors = JSON.parse(fs.readFileSync(authorsFile, "utf-8"));

if (expectedBooks.length !== 8 || expectedAuthors.length !== 8) {
    throw new Error("Problem with the test data files");
}

module.exports = {createTestStore, expectedBooks, expectedAuthors};