# EverCache Documentation

- [中文](./docs/cn.md)
- [español](./docs/sp.md)
- [日本語](./docs/jp.md)
- [한국인](./docs/ko.md)

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

## Exports

EverCache exports two items:

- `EverCache` class: Create custom cache instances with unique storage names
- `storage`: Default instance (`new EverCache("public")`)

```javascript
import { storage, EverCache } from "ever-cache";

// Use the default instance
await storage.setItem('key', 'value');

// Or create a custom instance
const myCache = new EverCache('my-app-cache');
await myCache.setItem('key', 'value');
```

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

Use the `setItem` method to store data in the cache. Returns `Promise<true>`.

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

Use the `getItem` method to get stored data based on the key name. Returns `Promise<any>`. Returns `null` if the key doesn't exist.

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

Use the `removeItem` method to delete data with a specified key name. Returns `Promise<true>`.

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

Use the `clear` method to clear all data in the cache. Returns `Promise<true>`.

```javascript
async function clearData() {
  await storage.clear();

  console.log('All data cleared!');
}

clearData();
```

### Get Data Keys

Use the `key` method to get the key name at a specific index. Returns `Promise<string | undefined>`.

```javascript
async function firstKeys() {
  const firstKey = await storage.key(0); // Get the first key
  console.log('First key:', firstKey);
}

firstKeys();
```

### Query Data Length

Use the `length` property to get the number of key-value pairs stored in the cache. Returns `Promise<number>`.

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

## Cross-Tab Synchronization

EverCache automatically synchronizes data changes across browser tabs using BroadcastChannel. When data is modified in one tab, all other tabs with the same cache instance will receive the change event.

### Listening to Storage Changes

You can listen to storage changes using the `ever-cache-storage` custom event:

```javascript
window.addEventListener('ever-cache-storage', (e) => {
  const { key, oldValue, newValue, cacheId } = e.detail;
  console.log(`Key "${key}" changed from`, oldValue, 'to', newValue);
  console.log('Cache ID:', cacheId);
});
```

This event is triggered:
- When `setItem` is called
- When `removeItem` is called
- When `clear` is called
- Across all tabs when changes occur

## Notes

- EverCache operations are based on Promises, so you will need to use `async/await` or `.then()` and `.catch()` to handle asynchronous operations.
- Please ensure that your browser supports IndexedDB. Most modern browsers do, but it may not be available in some older browsers.
- If you encounter problems with direct data storage and retrieval using key names, you can try using setItem and getItem methods as alternative solutions.
- When using proxy syntax (`storage.key`), errors are silently caught. Use `setItem`/`getItem`/`removeItem` methods if you need error handling.
- If you see an error about "open blocked", close other tabs that might be using an older version of the database.
- The database connection automatically reconnects if it's closed externally.

## Supported Data Types

EverCache supports all data types that IndexedDB supports:

- **Basic types**: String, Number, Boolean, null, undefined
- **Date objects**: Date
- **Binary data**: ArrayBuffer, Blob, File, FileList
- **Collections**: Array, Object (can be nested)
- **Advanced types**: Map, Set (limited browser support)

**Note**: Functions, DOM nodes, Symbols, and other non-serializable objects cannot be stored directly.

## Error Handling Best Practices

When using proxy syntax (`storage.key`), errors are silently caught. For proper error handling, use method calls with try-catch:

```javascript
// Recommended: Use try-catch for error handling
try {
  await storage.setItem('key', value);
  console.log('Data saved successfully');
} catch (error) {
  console.error('Failed to save data:', error);
  // Handle the error appropriately
}

// Also applies to getItem
try {
  const data = await storage.getItem('key');
  if (data === null) {
    console.log('Key does not exist');
  }
} catch (error) {
  console.error('Failed to retrieve data:', error);
}
```

## Performance Tips

- **Batch operations**: The `entries()` method reads data in batches of 50 items, making it suitable for iterating over large datasets
- **Avoid frequent getItem calls**: When you need multiple items, consider using `entries()` to fetch all data at once instead of calling `getItem()` in a loop
- **Each operation is a separate transaction**: Current version uses a separate transaction for each operation. For bulk writes, consider batching your writes

```javascript
// Good: Batch read for multiple items
const allData = {};
for await (let [key, value] of storage.entries()) {
  allData[key] = value;
}

// Avoid: Multiple getItem calls in a loop
for (let i = 0; i < 100; i++) {
  const item = await storage.getItem(`item-${i}`); // Creates 100 separate transactions
}
```

## Browser Compatibility

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| IndexedDB | 23+ | 10+ | 12+ | 10+ |
| BroadcastChannel | 54+ | 38+ | 79+ | 15.4+ |

**Notes**:
- IE browser is not supported
- If BroadcastChannel is not supported, cross-tab synchronization will be unavailable, but storage functionality will work normally
- Safari 15.4+ is required for full BroadcastChannel support

## Internal Implementation

- **Database name**: `ever-cache-${id}` (where `id` is the storage identifier)
- **ObjectStore name**: `main`
- **Storage structure**: `{ key: string, value: any }`
- **Auto-reconnection**: Database connection automatically reconnects if closed externally
- **Batch iteration**: `entries()` uses `IDBKeyRange.lowerBound` for paginated cursor reading (50 items per batch)