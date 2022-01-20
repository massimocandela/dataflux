## DataFlux

DataFlux is a JavaScript library that automatically interfaces with your REST APIs to create a 2-way-synced local data store. If used with React, it transparently manages data propagation in the state.

* **Automated:** Given a collection of urls pointing to REST APIs, it creates a data layer (called `store`) able to retrieve, insert, update, delete the objects returned by the API. When objects are edited by the client, the store detects the edited objects and dispatches targeted updates to the APIs. You will **work on local JS objects** (e.g., you can do `myObject.name = "test"`, or `myObject.destroy()`) and **ignore the synchronization with the server** that will happen automagically.


* **Observable:** Queries to the store are observable. If you ask the store one or more objects (e.g., a list of books you want to display on your website), the store will track what subset of data you are using and push updates every time any of the object in the subset is subject to a change (e.g., a title of a book displayed on your page is edited or a new book matching the search criteria is added). **This is extremely useful with React!**


* **Full control:** If you don't like the store to manage the ORM operations automatically, you can set `autoSave: false` and explicitly tell the store when to save (i.e., `store.save()`). Additionally, you can control the single objects individually (e.g., `myObject.save()`). You can also set `lazyLoad: true` and only retrieve the data from the API when requested (e.g., if you never search for books, these will never be retrieved)


## Installation

Using npm:
```sh
npm install dataflux
```

Using jsDelivr CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/dataflux/dist/index.js"></script>
```

## Examples

Create your global store by creating a file (e.g., named `store.js`) containing the model declaration.

Consider the following hypothetical store/model declaration common to all the examples below:

```js
import {Store, Model} from "dataflux";

const store = new Store();
const author = new Model("author", `https://rest.example.net/api/v1/authors`);
const book = new Model("book", `https://rest.example.net/api/v1/books`);

store.addModel(author);
store.addModel(book);

// An object relation between author.id and book.authorId as follows
author.addRelation(book, "id", "authorId");

export default store;
```


The store can be initialized with [various options](#configuration). You need only one store for the entire application, that's why you should declare it in its own file and import it in multiple places.

The creation of a model requires at least a name and an url. GET, POST, PUT, and DELETE operations are going to be performed against the same url. [Models can be created with considerably more advanced options.](#models-creation)

A JS object is automatically created for each item returned by the API, for each model. The object has the same properties of the JSON item plus some high-level method (see [objects methods](#objects-methods)).
**All the objects are indexed in the store.**

### Example 1

Retrieve and edit an author not knowing the ID:

```js
import store from "./store";

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

You can terminate the subscription with `store.unsubscribe()`:

```js
const subKey = store.subscribe("book", drawBooks, ({price}) => price < 20); // Subscribe

store.unsubscribe(subKey); // Unsubscribe
```

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
    // Every time the dataset changes, a setState will be automatically 
    // performed. An attribute "books" will be added/updated in the 
    // state (the rest of the state remains unchanged).

    // findAll is a syntactic sugar for:
    // const callback = (books) => {this.setState({...this.state, books})};
    // store.subscribe("book", callback, ({price}) => price < 20);
  }

  render(){
    const {books} = this.state;

    return books.map(book =>
            <Book
                    onTitleChange={(title) => book.set("title", title)}
                    // onTitleChange will alter the book and so the current 
                    // state of "books" (a setState will be performed).
                    //
                    // Alternatively:
                    // onTitleChange={store.handleChange(book, "title")} 
                    // is a syntactic sugar of the function above
            />);
  }
}
```

The method `findAll` returns always an array. The method `findOne` returns a single object (if multiple objects satisfy the search, the first is returned).

When the component will unmount, the `findAll` subscription will be automatically terminated without the need to unsubscribe. Be aware, `store.findAll` injects the unsubscribe call inside `componentWillUnmount`. If your component already implements `componentWillUnmount()`, then you will have to use `store.subscribe` and `store.unsubscribe` instead of `store.findAll`, to avoid side effects when the component is unmounted.

## Configuration

The store can be configured with the following options:


| Option    | Description                                                                                                                                                                                                                                                                                                                                                                              | Default |
|-----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| autoSave  | It can be `true`, `false`, or an amount of milliseconds (integer). If `false`, you will have to perform `store.save()` manually. If `true`, the store will automatically perform `save()` when objects change. If an amount of milliseconds is provided, the objects are saved periodically AND when a change is detected. See [Editing objects](#editing-objects) for more information. | 3000    |
| saveDelay | An amount of milliseconds used to defer synching operations with the server. It triggers `store.save()` milliseconds after the last change on the store's objects is detedect. This allows to bundle together multiple changes operated by an interacting user. See [Editing objects](#editing-objects) for more information.                                                            | 1000    |
| lazyLoad  | A boolean. If set to `false`, the store is pre-populated with all the models' objects. If set to `true`, models' objects are loaded only on first usage (e.g., 'find', 'subscribe', 'getRelation'). LazyLoad operates per model, only the objects of the used models are loaded.                                                                                                         | false   |



## Models creation

A model can be simply created with:

```js
const book = new Model("book", `https://rest.example.net/api/v1/books`);
```

However, in many cases more complex APIs require different settings for the various operations.

Instead of an url, you can pass options to perform more elaborated Model's initializations.

```js
const options = {
  retrieve: {
    method: "get",
    url: "https://rest.example.net/api/v1/books"
  },
  insert: {
    method: "post",
    url: "https://rest.example.net/api/v1/books"
  },
  update: {
    method: "put",
    url: "https://rest.example.net/api/v1/books"
  },
  delete: {
    method: "delete",
    url: "https://rest.example.net/api/v1/books"
  }
};

const book = new Model("book", options);
```
You don't necessarily need to specify a url for each operation. If a url is not specified for an operation, the url defined for the `GET` operation is used.

For example, if you want to perform both inserts and updates with `PUT`, you can do:
```js
const options = {
  retrieve: {
    method: "get",
    url: "https://rest.example.net/api/v1/books"
  },
  insert: {
    method: "put" // It will use the same GET url
  }
};

const book = new Model("book", options);
```

Or, even more flexible, you can pass functions and handle yourself the operations. The functions MUST return promises.


```js
const options = {
  retrieve: () => {
    // 1) get the data from the API 
    // 2) tranforms the data
    // 3) return the data to the store
    return Promise.resolve(data);
  },
  insert: (data) => {
    // 1) recieve the data from the store
    // 2) transform the data however you like 
    // 3) send data to server
    return Promise.resolve();
  }
};

const book = new Model("book", options);
```

All the possible options for a model creation are:

| Name     | Description                                                                                                                                                       |
|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| retrieve | Describes the operation to retrieve a collection of objects from a REST API. It can be an object containing `method` and `url` or a function. See examples above. |
| insert   | Describes the operation to insert a new object in the collection. It can be an object containing `method` and `url` or a function. See examples above.            |
| update   | Describes the operation to update objects of the collection. It can be an object containing `method` and `url` or a function. See examples above.                 |
| delete   | Describes the operation to remove objects from the collection. It can be an object containing `method` and `url` or a function. See examples above.               |
| axios    | It allows to specify an axios instance to be used for the queries. If not specified, a new one will be used.                                                      |


### Model relations

Optionally, you can create relations among models.

For example, you can declare that an author has one or more objects of type book in the following way:

```js
const author = new Model("author", `https://rest.example.net/api/v1/authors`);
const book = new Model("book", `https://rest.example.net/api/v1/books`);

author.addRelation(book, "id", "authorId");
```
In this example, we added an explicit relation between `author.id` and `book.authorId`. This means that the store will return as books belonging to the author, all the books having `authorId` equals to the id of the author.


Other ways to declare relations:

* `account.addRelation("user", "userId")`

  When the third parameter is missing, it defaults to "id" (i.e., it is the shorter version of `account.addRelation("user", "userId", "id")`). This means that the store will return as user of the account, the user having `id` equals to `account.userId`.


* `author.addRelation("book", filterFunction)`

  When the second parameter is a function, the function will be used by the store to filter the objects of the connected model. The `filterFunction` receives two parameters `(parentObject, possibleChildObject)` and returns a boolean. In this way you can create complex relations; e.g., a `filterFunction` equal to `(author, book) => author.name == book.authorName && author.surname == book.authorSurname` creates a relation based on two attributes.


#### Accessing model relations

Once the relation between the author and the book models is declared, all the author objects will expose a method `getRelation(type, filterFunction)` that can be used to retrieve a relation associated with the author. The `type` defines the model type (in our case, 'book'), the `filterFunction` is an optional parameter that can be passed in case the output needs an additional filtering.

For example, imagine you have the `author1` object defined in the examples above (Dante Alighieri):

```js
author1.getRelation("book")
        .then(dantesBooks => {
          // Do something with Dante's books
        });

// Or..
author1.getRelation("book", (book) => book.price < 20)
        .then(cheapDantesBooks => {
          // Do something with Dante's books cheaper than 20
        });
```
## Store methods

The store has the following method.

| Method                       | Description                                                                                                                                                |
|------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| addModel(model)              | Introduce a new model to the store. If lazyLoad = false (default), the model is populated with the objects coming from the API.                            |
| get(type, id)                | It allows to retrieve an object based on its type and store's ID (see `getId()` in [objects methods](#objects-methods). The type is the name of the model. |
| find(type,filterFunction)    | The promise-oriented method to access objects given a type and a filter function. See [example 1](#example-1).                                             |
| delete(objects)              | It deletes an array of objects. See [example 1](#example-3).                                                                                               |
| delete(type, filterFunction) | It deleted objects given an array and a filter function. See [example 1](#example-3).                                                                      |
| insert(type, object)         | It creates a new object of a given type and inserts it in the store.                                                                                       |

## Objects methods
Each object created is enriched with the following methods.


| Method                             | Description                                                                                                                                                                                                                                      |
|------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| getId()                            | It returns a unique ID used by the store to identify the object. The ID is unique inside a single model. Be aware, `object.id` and `objet.getId()` may return different values, since store's IDs can be different from the one of the REST API. |
| set(attribute, value)              | A method to set an attribute to the object. It provides some advantages compared to doing `object.attribute = value`, these are discussed in [below](#editing-objects).                                                                          |
| save()                             | Method to save the object. You can do `store.save()` instead.                                                                                                                                                                                    |
| destroy()                          | Method to delete the object. You can do `store.delete()` instead.                                                                                                                                                                                |
| get(attribute)                     | If you like symmetry and since you do `.set()` you would like to do also `.get()` of the attributes. It does not provide any advantage compared to accessing directly the attribute (e.g., `author.name`).                                       |
| getRelation(model, filterFunction) | To get all the objects respecting a specific relation with this object (see [model relations](#model-relations)).                                                                                                                                |
| toJSON()                           | It returns a pure JSON representation of the object.                                                                                                                                                                                             |
| toString()                         | It returns a string representation of the object.                                                                                                                                                                                                |
| getFingerprint()                   | It returns a hash of the object. The hash changes at every change of the object or of any nested object. Useful to detect object changes.                                                                                                        |
| getModel()                         | It returns the model of this object. Mostly useful to do `object.getModel().getType()` and obtain a string defining the type of the object.                                                                                                      |

## Editing objects
The option `autoSave` can be `true`, `false`, or a number (milliseconds).

* When `autoSave` is set to `false`, the following operations are equivalent:
    ```js
    object.set("name", "Dante");
    
    object.name = "Dante";
    ```
  No matter which of the two approaches you use, the command `store.save()` must be invoked to sync the changes with the server.

  > The command `store.save()` is always able to recognize changed objects that need to be persisted.


* **When `autoSave` is set to `true`, the above operations are NOT equivalent.**

  Using `.set(attribute, value)` informs the store that an object changed, while changing directly an attribute of the object (`object.name = "Dante"`) does not. Since the store is not aware of the changes, they will not be synced with the server. **To avoid this, always use `.set(attribute, value)`.**

  > The commands `store.insert()`, `store.delete()`, and `object.destroy()` are always visible to the store, and so syncing is always performed when `autoSave` is `true`.

* **When `autoSave` is set to an amount of milliseconds, the above operations are still NOT equivalent, but...**

  The store will perform as if the `autoSave` was set to `true`; hence, changes performed with `.set(attribute, value)` are synced. However, it will periodically attempt also a `store.save()`. Since `store.save()` is always able to recognize edited objects, also changes directly operated on an attribute of the object (`object.name = "Dante"`) are synced.



## API interaction
DataFlux is able to identify three sets of objects: inserted, updated, deleted.
Each of these set is synced with the server with POST, PUT, and DELETE REST operations, respectively.

The interaction with the API is handled automatically, multiple requests are prevented and operations are bundled as much as possible.

For example (with autoSave):
```js
store.find('book', (book) => book.price < 20);
store.find('book', (book) => book.price > 60);
// The commands above will correspond to 1 single query to the REST API.

author1.set("name", "Dante");
author2.set("name", "Italo");
author3.set("name", "Umberto");
author4.name = "Primo";
// The commands above will correspond to 1 single query to the REST API, 
// no matter how many editing operations.


author1.set("name", "Dante");
setTimeout(() => author2.set("name", "Italo"), 10000); // To "emulate" a user interaction.
// The commands above will correspond to 2 queries to the REST API

const author1 = {surname: "Alighieri"};
store.insert(author1);
author1.set("name", "Dante");
store.delete(author1);
// The commands above will not produce any query to the REST API since 
// the initial and final states of the store are the same (object created and removed).

```

### REST API format

The APIs must return/accept an array of JSON objects or a single object. If your API uses a different format, use a function in the [models creation](#models-creation) to transform the data.

The following format is automatically accepted, and it will create two objects.

```json
[
  {
    "name": "Dante",
    "surname": "Alighieri",
    "reviews": [...]
  },
  {
    "name": "Giovanni",
    "surname": "Boccaccio",
    "reviews": [...]
  }
]
```

The following format is automatically accepted, and it will create one object.

```json
{
  "username": "Massimo",
  "website": "https://massimocandela.com",
  "otherParameters": {
    ...
  }
}
```

The following format will create a single object, which probably you don't want. Use a function in [models creation](#models-creation) to unwrap the data.

```json
{
  "books": [],
  "authors": []
}
```