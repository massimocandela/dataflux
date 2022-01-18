## Projectname

Projectname is a JavaScript library for automatically generating ORM-like data layers interfacing with REST APIs.

* **Automated:** Given a collection of urls pointing to REST APIs, it creates a data layer (called `store`) able to retrieve, insert, update, delete the objects returned by the API. When objects are edited by the client, the store detects the edited objects and dispatches targeted updates to the APIs. You will **work on local JS objects** (e.g., you can do `myObject.name = "test"`, or `myObject.destroy()`) and **ignore the synchronization with the server** that will happen automagically.


* **Observable:** Queries to the store are observable. If you ask the store one or more objects (e.g., a list of books you want to display on your website), the store will track what subset of data you are using and push updates every time any of the object in the subset is subject to a change (e.g., a title of a book displayed on your page is edited or a new book matching the search criteria is added). **This is extremely useful with React!**


* **Full control:** If you don't like the store to manage the ORM operations automatically, you can set `autoSave: false` and explicitly tell the store when to save the edited objects (i.e., `store.save()`). Additionally, you can control the single objects individually (e.g., `myObject.save()`). You can also set `lazyLoad: true` and only retrieve the data from the API when requested (e.g., if you never search for books, these will never be retrieved)


## Installation

```sh
npm install projectname
```

## Examples

Consider the following store/model declaration common to all the examples below:
```js
import {Store, Model} from "projectname";

const store = new Store();
const author = new Model("author", `https://rest.example.net/api/v1/authors`);
const book = new Model("book", `https://rest.example.net/api/v1/books`);

store.addModel(author);
store.addModel(book);

author.addRelation(book, "id", "authorId"); // Add a object relation between author.id and book.authorId
```

### Example 1

Retrieve and edit an author not knowing the ID:

```js
// Find the author Dante Alighieri
store.find("author", ({name, surname}) => name == "Dante" && surname == "Alighieri")
    .then(([author]) => {
        author.set("country", "Italy");
        author.set("type", "poet");
        // Nothing else to do, the store does a single PUT request to the model's API about the edited object
    });
```

> You don't necessarily need to use `object.set` to edit an object attribute. You could do `author.country = "Italy"`. However, this approach relies on a periodic detection of changes (while `.set` triggers an update immediately). Check the `autoSave` option for more information

### Example 2

Operations without autoSave:

```js
// To disable autoSave you must declare the store as follows
const store = new Store({autoSave: false});
```

The same example above now becomes:

```js
// Find the author Dante Alighieri
store.find("author", ({name, surname}) => name == "Dante" && surname == "Alighieri")
    .then(([author]) => {
        // When autoSave = false, you can still use author.set, but there is no actual benefit
        author.country = "Italy"
        author.type = "poet"

        store.save(); // Even if we changed only one author, prefer always store.save() to author.save()
    });
```

### Example 3

Insert and delete objects:
```js
// Remove all authors with a name starting with "A"
store.delete("author", ({name}) => name.startsWith("A"));
// Add a new author
store.insert("author", {name: "Jane", surname: "Austen"});
// If autoSave = false, remember to do store.save();
```

You can also destroy a single object
```js
author.destroy();
```

Or destroy a collection of authors you already selected
```js
store.find("author", ({name}) => name.startsWith("A"))
    .then(authors => {
        store.delete(authors);
    });
```
### Example 4

Get all books of an author:

```js
author.getRelation("book");
```

### Example 5 - Observability

If you use `subscribe` instead of `find`, you can provide a callback to be invoked when data is ready or there is a change in the data.


```js
const drawBooksCallback = (books) => {
    // Do something with the books
};

// Get all books with a price < 20
store.subscribe("book", drawBooks, ({price}) => price < 20);
```

If now somewhere a book is inserted/deleted/edited:
* if the book has `price < 20`,  `drawBooksCallback` will be called again with the new dataset;
* if the book has `price > 20`,  `drawBooksCallback` will NOT be called again (because the new book doesn't impact our selection).

### Example 6 - Observability + React

The integration with React is offered transparently when using the store inside a `React.Component`.
You can use two methods: `findOne`, and `findAll`.

> Since the store is able to detect changes deep in a nested structure, you will not have to worry about the component not re-rendering. Also, the setState will only be triggered when the next change of the dataset is really impacting your selection.

React Component example
```jsx
class MyComponent extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        // Get all books with a price < 20
        store.findAll("book", "books", this, ({price}) => price < 20);
        // Every time the dataset changes, a setState will be automatically performed.
        // An attribute "books" will be added/updated in the state (the rest of the 
        // state remains unchanged).
        
        // findAll is a syntactic sugar for:
        // const callback = (books) => {this.setState({...this.state, books})};
        // store.subscribe("book", callback, ({price}) => price < 20);
    }

    render(){
        const {books} = this.state;
        
        return books.map(book => {
            return <Book
                // onTitleChange will alter the book and so the current state of "books"
                onTitleChange={(title) => book.set("title", title)}
                // alternatively, onTitleChange={store.handleChange(book, "title")} 
                // is a syntactic sugar of the function above
            />
        });
    }
}
```

When the component will mount, the `findAll` subscription will be terminated.