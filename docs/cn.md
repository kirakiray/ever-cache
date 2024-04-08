# EverCache 使用文档

## 简介

EverCache 是一个基于 IndexedDB 的缓存库，它提供了类似于 `localStorage` 的 API，但是具有异步操作、更大的存储容量和更复杂的数据类型支持等优势。

EverCache与其它的基于indexDB仿localStorage的库不一样，它可以直接通过键名获取或赋值，而不必使用 `getItem` 或 `setItem`方法。

```javascript
import { storage } from "ever-cache";

storage.myKey = { name: 'John', age: 30 };
// await storage.setItem('myKey', { name: 'John', age: 30 });

const data = await storage.myKey;
// const data = await storage.getItem('myKey');
```

不仅使用方便，而且代码还十分精简，minify后的文件只有1kb左右。

## 安装

EverCache 可以通过npm或直接通过浏览器原生的`import`语法引入到您的项目中。

### npm 安装

```bash
npm install ever-cache
```

### 在浏览器直接通过 ESModule 引用

```html
<script type="module">
  import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";
</script>
```

## 快速开始

### 创建 EverCache 实例

```javascript
import { storage } from "ever-cache"; // npm安装后，有nodejs打包器的环境下
// or
import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js"; // 使用浏览器原生 ESModule
```

### 存储数据

使用 `setItem` 方法将数据存储到缓存中。

```javascript
async function saveData() {
  storage.myKey = { name: 'John', age: 30 };
  // or 
  await storage.setItem('myKey', { name: 'John', age: 30 });

  console.log('Data saved successfully!');
}

saveData();
```

### 检索数据

使用 `getItem` 方法根据键名获取存储的数据。

```javascript
async function fetchData() {
  const data = await storage.myKey;
  // or
  const data = await storage.getItem('myKey');

  console.log('Fetched data:', data);
}

fetchData();
```

### 删除数据

使用 `removeItem` 方法删除指定键名的数据。

```javascript
async function deleteData() {
  delete storage.myKey;
  // or
  await storage.removeItem('myKey');

  console.log('Data deleted successfully!');
}

deleteData();
```

### 清除所有数据

使用 `clear` 方法清除缓存中的所有数据。

```javascript
async function clearData() {
  await storage.clear();

  console.log('All data cleared!');
}

clearData();
```

### 获取数据键

使用 `key` 方法获取缓存中所有数据的键。

```javascript
async function firstKeys() {
  const firstKey = await storage.key(0); // 获取第一个键
  console.log('First key:', firstKey);
}

firstKeys();
```

### 获取数据长度

使用 `length` 属性获取缓存中存储的键值对数量。

```javascript
const count = await storage.length;
console.log('Number of items:', count);
```

## 高级用法

### 自定义对象存储名称

可以通过 `new EverCache('custom-storage-name')` 创建专属的 storage，生成的 storage 和其他命名的 storage 数据会隔离开。

```javascript
import { EverCache } from "ever-cache"; // npm安装后，有nodejs打包器的环境下
// or
import { EverCache } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js"; // 使用浏览器原生 ESModule

const customStorage = new EverCache('custom-name');
```

创建后的 `customStorage` 可以使用的方法和前面 `storage` 保持一致。

## 注意事项

- EverCache 操作是基于 Promise 的，因此您需要使用 `async/await` 或 `.then()` 和 `.catch()` 来处理异步操作。
- 请确保您的浏览器支持 IndexedDB。大多数现代浏览器都支持，但是在一些旧版浏览器中可能不可用。
- 如果直接通过键获取或赋值有问题，可以改用 `setItem` 和 `getItem` 看能否解决问题。