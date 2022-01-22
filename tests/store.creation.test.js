// const chai = require("chai");
// const {createTestStore, expectedBooks, expectedAuthors} = require("./store");
// const chaiSubset = require('chai-subset');
// const {Store, Model} = require("../src/index");
// chai.use(chaiSubset);
// const expect = chai.expect;
//
// const store = createTestStore({
//     autoSave: false,
//     lazyLoad: true
// });
//
// console.warn = () => {}; // Shut up
//
// describe("Store creation", function() {
//
//     it("duplicated model", function (done) {
//         const store = new Store({
//             lazyLoad: true,
//             autoSave: false
//         });
//
//         const book = new Model("book", {
//             retrieve: () => ([{isbn: 1}, {isbn: 2}])
//         });
//
//         const author = new Model("book", {
//             retrieve: () => ([{isbn: 3}, {isbn: 4}])
//         });
//         store.addModel(book);
//         store.addModel(author)
//             .catch(error => {
//                 expect(error.toString()).to.equals("The model already exists");
//                 done();
//             });
//     });
//
//     it("lazyLoad", function (done) {
//
//         let retrieved = 0;
//
//         const store = new Store({
//             lazyLoad: true,
//             autoSave: false
//         });
//
//         const book = new Model("book", {
//             retrieve: () => {
//                 retrieved++;
//                 return [{isbn: 1}, {isbn: 2}];
//             }
//         });
//
//         store.addModel(book)
//             .then(() => {
//                 expect(retrieved).to.equals(0);
//             })
//             .then(() => {
//                 return store.find("book")
//                     .then(() => {
//                         expect(retrieved).to.equals(1);
//                     });
//             })
//             .then(done);
//
//     });
//
//     it("autoSave: true", function (done) {
//
//         const store = new Store({
//             autoSave: true
//         });
//
//         const book = new Model("book", {
//             retrieve: () => {
//                 return [{isbn: 1}, {isbn: 2}];
//             },
//             update: ([obj]) => {
//                 expect(JSON.stringify(obj)).to.equals(JSON.stringify({isbn: 1, title: "test"}));
//                 done();
//
//                 return Promise.resolve();
//             }
//         });
//
//         store.addModel(book);
//
//         store.find("book")
//             .then(data => {
//                const first = data[0];
//
//                 first.set("title", "test");
//             });
//
//     }).timeout(2000);
//
//     it("autoSave: false", function (done) {
//
//         let failed = false;
//         const store = new Store({
//             autoSave: false
//         });
//
//         const book = new Model("book", {
//             retrieve: () => {
//                 return [{isbn: 1}, {isbn: 2}];
//             },
//             update: ([obj]) => {
//                 failed = true;
//                 return Promise.resolve();
//             }
//         });
//
//         store.addModel(book);
//
//         store.find("book")
//             .then(data => {
//                 const first = data[0];
//
//                 first.set("title", "test");
//             });
//         setTimeout(() => {
//             expect(failed).to.equals(false);
//             done();
//         },3000)
//     }).timeout(4000);
//
//     it("autoSave: 4000", function (done) {
//
//         const store = new Store({
//             autoSave: 4000
//         });
//
//         const book = new Model("book", {
//             retrieve: () => {
//                 return [{isbn: 1}, {isbn: 2}];
//             },
//             update: ([obj]) => {
//                 expect(JSON.stringify(obj)).to.equals(JSON.stringify({isbn: 1, title: "test"}));
//                 done();
//
//                 return Promise.resolve();
//             }
//         });
//
//         store.addModel(book);
//
//         store.find("book")
//             .then(data => {
//                 const first = data[0];
//
//                 first.title = "test";
//             });
//
//     }).timeout(8000);
//
// });