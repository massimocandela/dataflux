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
<script src="https://cdn.jsdelivr.net/npm/dataflux/dist/dataflux.min.js"></script>
```

## Examples

Create your global store by creating a file (e.g., named `store.js`) containing the model declaration.

Consider the following hypothetical store/model declaration common to all the examples below:

```js
// Content of your store.js
const {Store, Model} = require("dataflux");

// We create a new Store
const store = new Store();

// We now create two models, "author" and "book". 
// Both of them are auto generated based on the output of a REST API.
// The REST API does NOT need to provide a specific format.
// E.g., /books returns [{"title": "Hamlet", "year": 1600}, ...].
// See "REST API format" below for more info.
const book = new Model("book", `https://api.example.net/books`);
const author = new Model("author", `https://api.example.net/authors`);

// We add the models to the store
store.addModel(book);
store.addModel(author);

// Optionally, we can declare relations among models.
// E.g., we can declare that an author has one or more books.
author.addRelation(book, "id", "authorId");
// The relation will provide all the books where author.id = book.authorId

export default store;
```


The store can be initialized with [various options](#configuration). You need only one store for the entire application, that's why you should declare it in its own file (store.js in this case) and import it in multiple places.

The creation of a model requires at least a name and a url. GET, POST, PUT, and DELETE operations are going to be performed against the same url. [Models can be created with considerably more advanced options.](#models-creation)

A JS object is automatically created for each item returned by the API, for each model. The object has the same properties of the JSON item plus some high-level method (see [objects methods](#objects-methods)).
**All the objects are indexed in the store.**

### Example 1

Retrieve and edit an author by name and surname:

```js
import store from "./store"; // Import our store.js

// Find the author Dante Alighieri
store.find("author", ({name, surname}) => name == "Dante" && surname == "Alighieri")
        .then(([author]) => {

          // We got the author, let's now edit it
          author.set("country", "Italy");
          author.set("type", "poet");
        });
```

Nothing else to do! After your edit, the store will do a single PUT request to the model's API to save the edited object. This behavior can be disabled, see next example.

> You don't necessarily need to use `object.set` to edit an object attribute. You could do `author.country = "Italy"`. However, this approach has disadvantages, read [editing objects](#editing-objects) for more information

### Example 2

DataFlux automatically sends the edited objects back to the API to be saved. However, you can disable this behavior and manually instruct the store when to save.

```js
// To disable autoSave you must declare the store (in store.js) as follows
const store = new Store({autoSave: false});
```

The same example above now becomes:

```js
// Find the author Dante Alighieri
store.find("author", ({name, surname}) => name == "Dante" && surname == "Alighieri")
        .then(([author]) => {

          // When autoSave is false, author.set("country", "Italy") and 
          // author.country = "Italy" are equivalent
          author.country = "Italy"
          author.type = "poet"

          store.save(); // Instruct the store to save
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

_**DataFlux remembers your query and calls your callback every time any change is affecting the result of your query!**_

```js
const drawBooksCallback = (books) => {
  // Do something with the books
};

// Get all books with a price < 20
store.subscribe("book", drawBooks, ({price}) => price < 20);
```

If now a book is inserted/deleted/edited:
* if the book has `price < 20`,  `drawBooksCallback` will be called again with the new dataset;
* if the book has `price > 20`,  `drawBooksCallback` will NOT be called again (because the new book doesn't impact our selection).

> Warning: if you edit the objects inside your callback (e.g., you do `.set()`), you will trigger the subscription's callback again in an infinite loop! If you want to set an attribute of an object inside your callback, before drawing it, use `setConstant()`.

You can terminate the subscription with `store.unsubscribe()`:

```js
const subKey = store.subscribe("book", drawBooks, ({price}) => price < 20); // Subscribe

store.unsubscribe(subKey); // Unsubscribe
```

You can also do multiple subscriptions at once:

```js
const subscriptions = [
  ["book", ({title}) => title === "The little prince"], // Model name and filter function
  ["author"], // No filter function, all objects returned
];

const callback = ({book, author}) => {
  // Objects are ready
};

const subKey = store.multipleSubscribe(subscriptions, callback); // Subscribe

store.unsubscribe(subKey); // Unsubscribe
```

### Example 6 - Observability + React

The integration with React is offered transparently when using the store inside a `React.Component`.
You can use two methods: `findOne`, and `findAll` (which are a react-specific syntactic sugar over `subscribe`).

**_Since the store is able to detect changes deep in a nested structure, you will not have to worry about the component not re-rendering. Also, the setState will be triggered ONLY when the next change of the dataset is impacting your selection._**

React Component example:
```jsx
class MyComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // Get all books with a price < 20
    store.findAll("book", "books", this, ({price}) => price < 20);
    // An attribute "books" will be added/updated in the 
    // state every time a book in our selection is inserted/deleted/edited,
    // the rest of the state remains unchanged.

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

                    // Alternatively:
                    // onTitleChange={store.handleChange(book, "title")} 
                    // is a syntactic sugar of the function above
            />);
  }
}
```

The method `findAll` returns always an array. The method `findOne` returns a single object (if multiple objects satisfy the query, the first is returned).

When the component will unmount, the `findAll` subscription will be automatically terminated without the need to unsubscribe. Be aware, `store.findAll()` injects the unsubscribe call inside `componentWillUnmount()`. If your component already implements `componentWillUnmount()`, then you will have to use `store.subscribe()` and `store.unsubscribe()` instead of `store.findAll()`, to avoid side effects when the component is unmounted.

In case you prefer React hooks:

```js
function MyComponent() {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    const subKey = store.subscribe("books", setBooks, ({price}) => price < 20);

    return () => {
      store.unsubscribe(subKey); // Remember to unsubscribe
    };
  }, []);

  return books.map(book => <Book onTitleChange={(title) => book.set("title", title)}/>);
}
```


## Configuration

The store can be configured with the following options:


| Option    | Description                                                                                                                                                                                                                                                                                                                                                                              | Default |
|-----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| autoSave  | It can be `true`, `false`, or an amount of milliseconds (integer). If `false`, you will have to perform `store.save()` manually. If `true`, the store will automatically perform `save()` when objects change. If an amount of milliseconds is provided, the objects are saved periodically AND when a change is detected. See [Editing objects](#editing-objects) for more information. | true    |
| saveDelay | An amount of milliseconds used to defer synching operations with the server. It triggers `store.save()` milliseconds after the last change on the store's objects is detedect. This allows to bundle together multiple changes operated by an interacting user. See [Editing objects](#editing-objects) for more information.                                                            | 1000    |
| lazyLoad  | A boolean. If set to `false`, the store is pre-populated with all the models' objects. If set to `true`, models' objects are loaded only on first usage (e.g., 'find', 'subscribe', 'getRelation'). LazyLoad operates per model, only the objects of the used models are loaded.                                                                                                         | false   |



## Models creation

A model can be simply created with:

```js
const book = new Model("book", `https://api.example.net/books`);
```

However, sometimes you may want to define a more complex interaction with the API. In such cases you can pass options to perform more elaborated model's initializations.

```js
const book = new Model("book", options);
```

All the possible options for a model creation are (they are all optional):

| Name         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Default              |
|--------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------|
| retrieve     | Describes the operation to retrieve the collection of objects from the REST API. It can be an operation object or a function. See [operations](#operations).                                                                                                                                                                                                                                                                                                                                                                                                                  | `{method: "get"}`    |
| insert       | Describes the operation to insert a new object in the collection. It can be an operation object or a function. See [operations](#operations).                                                                                                                                                                                                                                                                                                                                                                                                                                 | `{method: "post"}`   |
| update       | Describes the operation to update objects of the collection. It can be an operation object or a function. See [operations](#operations).                                                                                                                                                                                                                                                                                                                                                                                                                                      | `{method: "put"}`    |
| delete       | Describes the operation to remove objects from the collection. It can be an operation object or a function. See [operations](#operations).                                                                                                                                                                                                                                                                                                                                                                                                                                    | `{method: "delete"}` |
| fields       | An array of strings defining which attributes the retrieved objects should have. Essentially, it allows you to contemporarily specify the [X-Fields header](https://flask-restplus.readthedocs.io/en/stable/mask.html) and the [fields GET parameter](https://developers.google.com/slides/api/guides/performance#partial). This reduces transfer size and memory usage. E.g., if you have a collection of books, of which you are interested only in the name, you can define `fields: ["name"]`. In combination with `load` it allows for partial lazy load of the objects. | All the fields       |
| headers      | A dictionary of headers for the HTTP request. E.g., `{"Authorization": "bearer XXXX"}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | No headers           |
| load         | A function that allows to enrich the objects on demand. E.g., you can use `fields` to download only the titles of a collection of books, and `load` to load completely the object. See [object enrichment](#object-enrichment).                                                                                                                                                                                                                                                                                                                                               |
| axios        | It allows to specify an axios instance to be used for the queries. If not specified, a new one will be used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | A new axios instance |
| parseMoment  | Automatically creates Moment.js objects out of ISO8601 strings. E.g., if an object has a property `createdAt: "2022-01-07T21:38:50.295Z"`, this will be transformed to a moment object.                                                                                                                                                                                                                                                                                                                                                                                       |                      | 
| hiddenFields | An array of attribute names that will never be sent back to the API. E.g., if you set `hiddenFields: ["pages"]`, a book object can contain an attribute `pages` locally, but this will be stripped out in PUT/POST requests.                                                                                                                                                                                                                                                                                                                                                  |
| deep         | A boolean defining if nested objects should be enriched with the object methods.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | true                 |
| lazyLoad     | A boolean defining if the model should be lazy loaded on the first use. This takes precedence over the lazyLoad declared during store initialization.                                                                                                                                                                                                                                                                                                                                                                                                                         | false                |

### Operations
As described in the table above, there are four possible operations: **retrieve, insert, update,** and **delete**. An operation can be defined as an operation object or a function.

#### Operation object

An operation object is an object like follows:

```json
{
  "method": "get",
  "url": "https://api.example.com",
  "headers": {"Authorization": "bearer XXXX"}
}
```

Usage example:

```js
const options = {

  retrieve: {
    method: "get",
    url: "https://rest.example.net/api/v1/books",
    headers: {} // Headers can be define per operation or globally
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
  },

  headers: {"Authorization": "bearer XXXX"} // Globally defined headers
};

const book = new Model("book", options);
```
You don't need to specify all the attributes for each operation, only the ones you want to variate from the defaults (see table above). If a url is not specified for an operation, the url defined for the `GET` operation is used.

For example, if you are ok with the default behaviour except you want to perform both inserts and updates with `PUT` (instead of post/put), you can do:
```js
const options = {
  retrieve: {
    url: "https://rest.example.net/api/v1/books"
  },
  insert: {
    method: "put" // It will use the same GET url
  }
};

const book = new Model("book", options);
```

#### Operation function

To be even more flexible, you can pass functions to generate the API urls or retrieve the data. An operation function can return a url or a promise. If the function returns a promise, the promise must resolve in an array of JSON objects when these are ready.


Example of operation function returning from the API and submitting to the API an array of JSON objects.

```js
const options = {
  retrieve: () => {
    // 1) get the data from the API 
    // 2) tranforms the data
    // 3) return the data to the store
    return axios({ // Example with axios, but you can use whatever you prefer
      url: "https://api.example.net/example",
      method: "get"
    });
  },
  insert: (data) => {
    // 1) recieve the data from the store
    // 2) transform the data however you like 
    // 3) send data to server
    return axios({
      url: "https://api.example.net/example",
      data,
      method: "post"
    });
  }
};

const book = new Model("book", options);
```

#### Object factory

In the examples we saw above, objects are retrieved from an API returning one or more objects. However, sometimes object creation requires a more complex logic. This can be summarized as: the object must be created based on some input parameter

Typical examples are:
* There is no API returning all the objects of a given type, you can only access specific objects based on a parameter (e.g., based on the ID).
* It doesn't make sense to retrieve all the objects of a given type, since the client needs to access only to a subset of them.
* The APIs to get/post/put/delete objects are parametric (e.g., you need to specify the ID in the url).
* The model is polymorphic, and the final object's format is based on some parameter;
* The model is polymorphic, a different API is used to retrieve the objects based on some input parameter (e.g., they are all books, but there are different APIs by genre).

This is a well-know problem, described by the [factory design pattern](https://refactoring.guru/design-patterns/factory-method).
In DataFlux, the store provides for this use case the `.factory()` method that allows you to implement Factory.

To create a factory, you must declare a model as follows:

```js
const author = new Model("author", {
  lazyLoad: true, // It MUST be lazyLoaded
  retrieve: (params) => { // The retrieve function now takes some parameters

    if (params) {
      // You can return a URL or directly one or more JSON objects
      return `https://api.example.net/authors/${params.id}`
    } else {
      return Promise.resolve([]); // It's important to handle the base case where params is null
    }
  }
});

store.addModel(author);
```

It is important to notice in the example above, how `lazyLoad` must be set to `true` and how the retrieve function returns a URL based on an input parameter. As always, the operation function can return a URL (DataFlux will download the objects) or directly a collection of objects.

> If you don't specify the insert/update/delete operation functions, the same URL of the retrieve function will be used.

Once the parametric retrieve function is declared, you can instantiate the objects with the `store.factory()` method:

```js
store.factory("author", {id: 4});
```
Invoking `store.factory()` will create a new object in the "author" collection.

> store.factory() will not return the object. It just inserts the object in the collection. You will need to use any of the usual .find/.findOne/.findAll/.subscribe to retrieve it.


#### Object enrichment

DataFlux objects can have a `load()` method which enables you to load extra attributes of an object.

Example of usage of `load()`:

```js
console.log(book);
// {title: "The little prince"}

book.load();
// The book object will be updated and it will contain
// {id: 23, title: "The little prince", price: 9.99, year: 1943}
//
// If you are using React, book.load() will automatically update your state
```



To enable such a method, you have to define the `load` option during model creation. The load option accepts a function that returns the complete object of a url. The function receives in input the current JSON object.

Example of creation of a model with `load` support:
```js
const book = new Model("book", {
  retrieve: {
    url: "https://rest.example.net/api/v1/books/"
  },
  fields: ["title"], // By default the books will contain only the title
  load: (object) => { // "object" contains the current object to be enriched

    // Return the url where to retrieve the object
    return "https://rest.example.net/api/v1/books/" + object.id;
  }
});
```
Alternatively, the `load` function can return directly the enriched object.
```js
const book = new Model("book", {
  load: (object) => {
    return axios({...}).then(raw => raw.data);
  }
});
```

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

| Method                                                 | Description                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|--------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| on(event, callback)                                    | Method to subscribe to the events emitted by the store. See [events](#store-events) below.                                                                                                                                                                                                                                                                                                                                                          |
| addModel(model)                                        | Introduce a new model to the store. If lazyLoad = false (default), the model is populated with the objects coming from the API.                                                                                                                                                                                                                                                                                                                     |
| get(type, id)                                          | It allows to retrieve an object based on its type and store's ID (see `getId()` in [objects methods](#objects-methods). The type is the name of the model.                                                                                                                                                                                                                                                                                          |
| find(type, filterFunction)                             | The promise-oriented method to access objects given a type and a filter function. If the filter function is missing, all the objects are returned. See [example 1](#example-1).                                                                                                                                                                                                                                                                     |
| delete(objects)                                        | It deletes an array of objects. See [example 1](#example-3).                                                                                                                                                                                                                                                                                                                                                                                        |
| delete(type, filterFunction)                           | It deleted objects given an array and a filter function. See [example 1](#example-3).                                                                                                                                                                                                                                                                                                                                                               |
| insert(type, object)                                   | It creates a new object of a given type and inserts it in the store.                                                                                                                                                                                                                                                                                                                                                                                |
| subscribe(type, callback, filterFunction)              | The callback-oriented method to access objects given a type and a filter function. It returns the key of the subscription, needed to unsubscribe. If the filter function is missing, all the objects are returned. **DataFlux remembers your query and calls the callback every time any change is affecting the result of your query.** See [example 5](#example-5---observability).                                                               |
| multipleSubscribe(subscriptions, callback)             | A method to subscribe to multiple models. The first parameter is an array of models' names and filterFunctions, the second parameter is the callback to be called when the cumulative dataset is ready. E.g., `multipleSubscribe([["book", filterFunction1], ["author", filterFunction2]], callback)`. It returns the key of the subscription. See [example 5](#example-5---observability).                                                         |
| unsubscribe(key)                                       | Method to terminate a subscription given a subscription key. See [example 5](#example-5---observability).                                                                                                                                                                                                                                                                                                                                           |
| findOne(type, stateAttribute, context, filterFunction) | This method automatically injects and updates the React state with the requested data. If multiple objects satisfy the query, only the first is selected. The `stateAttribute` is the name of the attribute that will be added/updated in the state, the `context` is the React.Component. It automatically unsubscribe when the React.Component will unmount. See [example 6](#example-6---observability--react).                                  |
| findAll(type, stateAttribute, context, filterFunction) | This method automatically injects and updates the React state with the requested data. The `stateAttribute` is the name of the attribute that will be added/updated in the state, the `context` is the React.Component. It automatically unsubscribe when the React.Component will unmount. If the filter function is missing, all the objects are returned. See [example 6](#example-6---observability--react).                                    |
| preload(type)                                          | This method allows to preLoad all objects of a given model. If you initialize the store with `lazyLoad:true`, the objects of a model are retrieved from the API at the first query performed on that model (e.g., at the first `.find()`). However, sometimes you may want to speed up the first query by pre loading the objects of a specific model while keeping `lazyLoad:true` on the store; in such a case you can use `store.preload(type)`. |

## Store events
The store emits the following events:

| Name    | Description                                                                                                                           |
|---------|---------------------------------------------------------------------------------------------------------------------------------------|
| error   | To listen the errors emitted by the store.                                                                                            |
| save    | Possible emitted values are `start` and `end`. They are emitted when the store starts/finishes to persist the data (API interaction). |
| loading | The event is emitted while a new model is loaded. The value contains something like `{status: "start", model: "book"}`                |

## Objects methods
Each object created is enriched with the following methods.


| Method                             | Description                                                                                                                                                                                                                                                                                                                                                         |
|------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| getId()                            | It returns a unique ID used by the store to identify the object. The ID is unique inside a single model. Be aware, `object.id` and `objet.getId()` may return different values, since store's IDs can be different from the one of the REST API.                                                                                                                    |
| set(attribute, value, hidden)      | A method to set an attribute to the object. It provides some advantages compared to doing `object.attribute = value`, these are discussed in [below](#editing-objects). The third parameter is optional, and when set to true will set the attribute as hidden (see [hiddenFields](#models-creation)).                                                              |
| setConstant(attribute, value)      | A method to set an unmodifiable hidden attribute on the object. Setting the attribute as a constant will not propagate an update.                                                                                                                                                                                                                                   |
| get(attribute, defaultValue)       | Method to retrieve the value of an attribute. It does not provide any advantage compared to accessing directly the attribute (e.g., `author.name`); except for hidden fields and constants, which can be retrieved only with the `.get` method. Additionally, you can provide a default value as a second parameter in case the object doesn't have that attribute. |
| getRelation(model, filterFunction) | To get all the objects respecting a specific relation with this object (see [model relations](#model-relations)).                                                                                                                                                                                                                                                   |
| save()                             | Method to save the object. You can do `store.save()` instead.                                                                                                                                                                                                                                                                                                       |
| destroy()                          | Method to delete the object. You can do `store.delete()` instead.                                                                                                                                                                                                                                                                                                   |
| toJSON()                           | It returns a pure JSON representation of the object.                                                                                                                                                                                                                                                                                                                |
| toString()                         | It returns a string representation of the object.                                                                                                                                                                                                                                                                                                                   |
| getFingerprint()                   | It returns a hash of the object. The hash changes at every change of the object or of any nested object. Useful to detect object changes.                                                                                                                                                                                                                           |
| getModel()                         | It returns the model of this object. Mostly useful to do `object.getModel().getType()` and obtain a string defining the type of the object.                                                                                                                                                                                                                         |
### Deeper Objects
When a model is declared with the option `deep: true` (default, see [model creation](#models-creation)), all the sub objects will also offer many of the methods above.

Imagine the API returns:

```json
[
  {
    "title": "The little prince",
    "reviews": [
      {
        "stars": 4,
        "comment": "comment 1"
      },
      {
        "stars": 3,
        "comment": "comment 2"
      }
    ]
  },
  ...
]
```

You can operate on the reviews similarly to how you operate on the main model's objects (book).

```js
store.find("book")
        .then(([book]) => {
          const firstReview = book.reviews[0];

          // Examples of what you can do:
          firstReview.detroy(); // The first review is removed from the array book.reviews
          firstReview.set("stars", 5); // Set the stars of the first review to 5
        });
```


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

> The method set takes 3 parameters in input, "attribute, value, hidden". The "hidden" parameter allows you to set an attribute to the object that will not trigger autoSave. However, hidden attributes cannot be persisted (they act like "hiddenFields" specified during model creation).

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