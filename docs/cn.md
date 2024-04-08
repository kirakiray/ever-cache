# EverCache 使用文档

## 简介

EverCache 是一个高效且易于使用的缓存库，它基于 IndexedDB 构建，并提供了类似 localStorage 的接口。与 localStorage 相比，EverCache 支持异步操作、更大的存储空间以及对复杂数据类型的兼容。

EverCache 的独特之处在于它允许您直接通过键名来存取数据，而无需调用特定的 setItem 或 getItem 方法。

```javascript
import { storage } from "ever-cache";

storage.myKey = { name: 'John', age: 30 };
// 等同于
// await storage.setItem('myKey', { name: 'John', age: 30 });

const data = await storage.myKey;
// 等同于
// const data = await storage.getItem('myKey');
```

EverCache 的代码简洁高效，压缩后的文件体积小于2KB，为您的项目提供轻量级的缓存解决方案。

## 安装

EverCache 可以通过npm包管理器安装，或通过浏览器的原生ESModule语法直接引入。

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

### 初始化 EverCache 实例

```javascript
import { storage } from "ever-cache"; // 使用npm安装，在支持nodejs的环境中，给web项目使用
// 或者
import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js"; // 使用浏览器的ESModule功能
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

### 查询数据长度

使用 `length` 属性获取缓存中存储的键值对数量。

```javascript
const count = await storage.length;
console.log('Number of items:', count);
```

### 数据迭代

利用 entries()、keys() 和 values() 方法来迭代缓存中的数据。

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

## 高级用法

### 自定义存储名称

您可以通过创建 EverCache 的实例并指定一个唯一的存储名称来创建独立的缓存空间。

```javascript
import { EverCache } from "ever-cache"; // npm安装后，有nodejs打包器的环境下
// or
import { EverCache } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js"; // 使用浏览器原生 ESModule

const customStorage = new EverCache('custom-name');
```

创建后的 customStorage 实例将提供与 storage 相同的方法和功能。

## 注意事项

- EverCache 操作是基于 Promise 的，因此您需要使用 `async/await` 或 `.then()` 和 `.catch()` 来处理异步操作。
- 请确保您的浏览器支持 IndexedDB。大多数现代浏览器都支持，但是在一些旧版浏览器中可能不可用。
- 如果直接通过键名进行数据存取遇到问题，可以尝试使用 setItem 和 getItem 方法作为替代解决方案。