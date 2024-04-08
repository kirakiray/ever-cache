# EverCache Documentation

- [中文文档](./docs/cn.md)

## Introduction

EverCache is an efficient and easy-to-use caching library built on IndexedDB, providing an interface similar to localStorage. Compared to localStorage, EverCache supports asynchronous operations, larger storage space, and compatibility with complex data types.

Unlike other similar third-party libraries, EverCache allows you to directly store and retrieve data using the key name without having to call specific setItem or getItem methods.

```javascript
import { storage } from "ever-cache";

storage.myKey = { name: 'John', age: 30 };
// Equivalent to
// await storage.setItem('myKey', { name: 'John', age: 30 });

const data = await storage.myKey;
// Equivalent to
// const data = await storage.getItem('myKey');
```

EverCache's code is concise and efficient, with a compressed file size of less than 2KB, providing a lightweight caching solution for your project.

## Installation

EverCache can be installed through the npm package manager or directly introduced via the browser's native ESModule syntax.

### npm Installation

```bash
npm install ever-cache
```

### Direct ESModule Reference in Browser

```html
<script type="module">
  import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js"; 
</script>
```

## Quick Start

### Initialize EverCache Instance

```javascript
import { storage } from "ever-cache"; // Use npm installation, for web projects in environments supporting nodejs
// Or
import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";  // Use browser's ESModule feature
```

### Store Data

Use the `setItem` method to store data in the cache.

```javascript
async function saveData() {
  storage.myKey = { name: 'John', age: 30 };
  // or 
  await storage.setItem('myKey', { name: 'John', age: 30 });

  console.log('Data saved successfully!');
}

saveData();
```

### Retrieve Data

Use the `getItem` method to get stored data based on the key name.

```javascript
async function fetchData() {
  const data = await storage.myKey;
  // or
  const data = await storage.getItem('myKey');

  console.log('Fetched data:', data);
}

fetchData();
```

### Delete Data

Use the `removeItem` method to delete data with a specified key name.

```javascript
async function deleteData() {
  delete storage.myKey;
  // or
  await storage.removeItem('myKey');

  console.log('Data deleted successfully!');
}

deleteData();
```

### Clear All Data

Use the `clear` method to clear all data in the cache.

```javascript
async function clearData() {
  await storage.clear();

  console.log('All data cleared!');
}

clearData();
```

### Get Data Keys

Use the `key` method to get all the keys in the cache.

```javascript
async function firstKeys() {
  const firstKey = await storage.key(0); // Get the first key
  console.log('First key:', firstKey);
}

firstKeys();
```

### Query Data Length

Use the `length` property to get the number of key-value pairs stored in the cache.

```javascript
const count = await storage.length;
console.log('Number of items:', count);
```

### Data Iteration

Utilize the entries(), keys(), and values() methods to iterate over the data in the cache.

```javascript
(async()=>{
  for await (let [key, value] of storage.entries()) {
    console.log(key, value);
  }
  // for await (let key of storage.keys()) {
  //   console.log(key);
  // }
  // for await (let item of storage.values()) {
  //   console.log(item);
  // }
})();
```

## Advanced Usage

### Customize Storage Name

You can create a separate cache space by creating an instance of EverCache and specifying a unique storage name.

```javascript
import { EverCache } from "ever-cache"; // After npm installation, in environments with nodejs packagers
// or
import { EverCache } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";  // Use browser's native ESModule

const customStorage = new EverCache('custom-name');
```

The created customStorage instance will provide the same methods and functionalities as storage.

## Notes

- EverCache operations are based on Promises, so you will need to use `async/await` or `.then()` and `.catch()` to handle asynchronous operations.
- Please ensure that your browser supports IndexedDB. Most modern browsers do, but it may not be available in some older browsers.
- If you encounter problems with direct data storage and retrieval using key names, you can try using setItem and getItem methods as alternative solutions.