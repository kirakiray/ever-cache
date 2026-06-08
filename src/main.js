// 私有属性符号
const SName = Symbol("storage-name"); // 存储名称
const IDB = Symbol("idb"); // IndexedDB 实例
const BC = Symbol("bc"); // BroadcastChannel 实例
const STORE_NAME = "main"; // IndexedDB object store 名称
let lengthWarned = false; // length 属性警告标志

/**
 * EverCache - 基于 IndexedDB 的异步存储类
 * 支持跨标签页同步、事件通知、Proxy 代理访问
 */
export class EverCache {
  constructor(id = "public") {
    this[SName] = id;
    this[IDB] = this.#openDB(id);

    // 初始化跨标签页广播通道
    if (typeof BroadcastChannel !== "undefined") {
      this[BC] = new BroadcastChannel(`ever-cache-${id}`);
      this[BC].onmessage = (e) => this.#dispatchEvent(e.data);
    }

    // 使用 Proxy 支持属性式访问
    return new Proxy(this, handle);
  }

  // 分发自定义存储事件
  #dispatchEvent(detail) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ever-cache-storage", { detail }));
    }
  }

  // 触发数据变更事件（本地 + 跨标签页）
  #emitChange(key, oldValue, newValue) {
    const detail = { key, oldValue, newValue, cacheId: this[SName] };
    this.#dispatchEvent(detail);
    this[BC]?.postMessage(detail);
  }

  // 打开或创建 IndexedDB 数据库
  #openDB(id) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(`ever-cache-${id}`);

      req.onsuccess = (e) => {
        const db = e.target.result;
        // 如果 object store 不存在，需要升级数据库版本创建
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const currentVersion = db.version;
          db.close();
          const upgradeReq = indexedDB.open(
            `ever-cache-${id}`,
            currentVersion + 1,
          );
          upgradeReq.onupgradeneeded = (e) =>
            e.target.result.createObjectStore(STORE_NAME, { keyPath: "key" });
          upgradeReq.onsuccess = (e) => {
            e.target.result.onclose = () => (this[IDB] = this.#openDB(id));
            resolve(e.target.result);
          };
          upgradeReq.onerror = (e) => reject(e.target.error || e);
          return;
        }
        // 连接关闭后自动重连
        db.onclose = () => (this[IDB] = this.#openDB(id));
        resolve(db);
      };

      req.onupgradeneeded = (e) =>
        e.target.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      req.onblocked = () =>
        reject(
          new Error(`ever-cache: open blocked for "${id}", close other tabs`),
        );
      req.onerror = (e) => reject(e.target.error || e);
    });
  }

  // 通用的 object store 操作封装
  #withStore(mode, operation) {
    return this[IDB].then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = operation(
            db.transaction([STORE_NAME], mode).objectStore(STORE_NAME),
          );
          req.onsuccess = (e) => resolve(e);
          req.onerror = (e) => reject(e.target.error || e);
        }),
    );
  }

  // 设置数据项
  setItem(key, value) {
    return this.#withStore("readwrite", (store) => {
      const getReq = store.get(key);
      getReq.onsuccess = (e) => {
        const oldValue = e.target.result?.value ?? null;
        const putReq = store.put({ key, value });
        putReq.onsuccess = () => this.#emitChange(key, oldValue, value);
        putReq.onerror = (err) => Promise.reject(err.target.error || err);
      };
      return getReq;
    }).then(() => true);
  }

  // 获取数据项
  getItem(key) {
    return this.#withStore("readonly", (store) => store.get(key)).then(
      (e) => e.target.result?.value ?? null,
    );
  }

  // 删除数据项
  removeItem(key) {
    return this.#withStore("readwrite", (store) => {
      const getReq = store.get(key);
      getReq.onsuccess = (e) => {
        const oldValue = e.target.result?.value ?? null;
        const delReq = store.delete(key);
        delReq.onsuccess = () => this.#emitChange(key, oldValue, null);
        delReq.onerror = (err) => Promise.reject(err.target.error || err);
      };
      return getReq;
    }).then(() => true);
  }

  // 清空所有数据
  clear() {
    return this.#withStore("readwrite", (store) => store.clear()).then(() => {
      this.#emitChange(null, null, null);
      return true;
    });
  }

  // 根据索引获取键名
  async key(index) {
    const e = await this.#withStore("readonly", (store) => {
      const req = store.openKeyCursor();
      let advanced = false;
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (!cur || index === 0 || advanced) {
          return;
        }
        advanced = true;
        cur.advance(index);
      };
      return req;
    });
    return e.target.result?.key;
  }

  // 获取数据项数量（异步属性）
  get length() {
    if (!lengthWarned) {
      console.warn(
        "ever-cache: `length` is async and returns a Promise, remember to `await` it.",
      );
      lengthWarned = true;
    }
    return this.#withStore("readonly", (store) => store.count()).then(
      (e) => e.target.result,
    );
  }

  // 通用的迭代器实现，支持分批读取
  async *#iterate(getValue) {
    const db = await this[IDB];
    const KeyRange = IDBKeyRange || globalThis.IDBKeyRange;
    let lastKey,
      hasMore = true;

    while (hasMore) {
      const { items, hasMore: more } = await new Promise((resolve, reject) => {
        const req =
          lastKey !== undefined
            ? db
                .transaction([STORE_NAME], "readonly")
                .objectStore(STORE_NAME)
                .openCursor(KeyRange.lowerBound(lastKey, true))
            : db
                .transaction([STORE_NAME], "readonly")
                .objectStore(STORE_NAME)
                .openCursor();
        const items = [];

        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && items.length < 50) {
            items.push([cursor.key, cursor.value]);
            cursor.continue();
          } else {
            resolve({ items, hasMore: !!cursor });
          }
        };
        req.onerror = (e) => reject(e.target.error || e);
      });

      for (const item of items) yield getValue(item);
      hasMore = more;
      if (hasMore) lastKey = items[items.length - 1][0];
    }
  }

  // 迭代所有键值对
  async *entries() {
    yield* this.#iterate((x) => x);
  }
  // 迭代所有键
  async *keys() {
    yield* this.#iterate(([k]) => k);
  }
  // 迭代所有值
  async *values() {
    yield* this.#iterate(([, v]) => v);
  }
}

// Proxy 处理器，支持属性式访问
const handle = {
  get(target, key, receiver) {
    return key in target || typeof key === "symbol" || key === "then"
      ? Reflect.get(target, key, receiver)
      : target.getItem(key);
  },
  set(target, key, value) {
    target.setItem(key, value).catch(() => {});
    return true;
  },
  deleteProperty(target, key) {
    target.removeItem(key).catch(() => {});
    return true;
  },
};

// 默认导出实例
export const storage = new EverCache();
