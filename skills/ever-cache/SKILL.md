---
name: "ever-cache"
description: "EverCache 缓存库文档。可超级大容量的类 localStorage 异步存储库。当用户询问 IndexedDB 缓存、本地存储、ever-cache 使用方法或类似 localStorage 的异步存储方案时调用。"
---

# EverCache 缓存库

EverCache 是基于 IndexedDB 的高效缓存库，提供类似 localStorage 的接口，支持异步操作、更大存储空间及复杂数据类型。压缩后体积小于 2KB。

## 安装

```bash
npm install ever-cache
```

浏览器直接引入：

```html
<script type="module">
  import { storage } from "https://cdn.jsdelivr.net/gh/kirakiray/ever-cache/src/main.min.js";
</script>
```

## 导出

- `EverCache` 类：可创建自定义缓存实例
- `storage`：默认实例（`new EverCache("public")`）

## 核心特性：代理语法

EverCache 通过 Proxy 实现直接键名存取，无需调用 setItem/getItem：

```javascript
// 写入（代理语法，错误静默捕获）
storage.myKey = { name: 'John', age: 30 };

// 读取（返回 Promise）
const data = await storage.myKey;

// 删除
delete storage.myKey;
```

代理语法中错误会被静默捕获。如需错误处理，请使用方法调用。

## API

### setItem(key, value)

存储数据，返回 `Promise<true>`。会先 get 获取旧值，写入成功后触发变更事件。

```javascript
await storage.setItem('myKey', { name: 'John', age: 30 });
```

### getItem(key)

获取数据，返回 `Promise<any>`。键不存在时返回 `null`。

```javascript
const data = await storage.getItem('myKey');
```

### removeItem(key)

删除数据，返回 `Promise<true>`。删除成功后触发变更事件。

```javascript
await storage.removeItem('myKey');
```

### clear()

清除所有数据，返回 `Promise<true>`。触发变更事件（key/oldValue/newValue 均为 null）。

```javascript
await storage.clear();
```

### key(index)

获取指定索引的键名，返回 `Promise<string | undefined>`。

```javascript
const firstKey = await storage.key(0);
```

### length（属性）

返回 `Promise<number>`，表示键值对数量。注意：是异步属性，需 await。

```javascript
const count = await storage.length;
```

首次访问会在控制台输出警告提醒用户 await。

### entries()

异步生成器，每次批量读取 50 条，yield `[key, value]` 元组。

```javascript
for await (let [key, value] of storage.entries()) {
  console.log(key, value);
}
```

### keys()

异步生成器，yield 键名。基于 entries() 实现。

### values()

异步生成器，yield 值。基于 entries() 实现。

## 自定义实例

```javascript
import { EverCache } from "ever-cache";
const customStorage = new EverCache('custom-name');
```

每个实例拥有独立的 IndexedDB 数据库（`ever-cache-${id}`）和 BroadcastChannel（`ever-cache-${id}`）。

## 跨标签页同步

使用 BroadcastChannel 自动同步数据变化。监听 `ever-cache-storage` 自定义事件：

```javascript
window.addEventListener('ever-cache-storage', (e) => {
  const { key, oldValue, newValue, cacheId } = e.detail;
});
```

事件触发场景：setItem、removeItem、clear、跨标签页数据变化。

事件 detail 结构：`{ key: string | null, oldValue: any, newValue: any, cacheId: string }`

## 内部实现要点

- IndexedDB 数据库名：`ever-cache-${id}`
- ObjectStore 名称等于 id，keyPath 为 `"key"`
- 存储结构：`{ key, value }` 记录
- 数据库连接被外部关闭时自动重连（`db.onclose` 触发重新 `_openDB`）
- `onblocked` 时抛出错误，需关闭其他持有旧版本的标签页
- entries() 使用 `IDBKeyRange.lowerBound` 实现分页游标，每批 50 条

## 注意事项

- 所有操作基于 Promise，必须使用 async/await 或 .then()/.catch()
- 代理语法（`storage.key`）中错误被静默捕获，需要错误处理时用方法调用
- `length` 是异步属性，必须 await
- 浏览器需支持 IndexedDB 和 BroadcastChannel（可选）
- "open blocked" 错误时需关闭其他标签页
