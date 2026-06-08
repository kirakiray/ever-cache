// 私有属性符号
const SName = Symbol("storage-name"); // 存储名称
const IDB = Symbol("idb"); // IndexedDB 实例
const BC = Symbol("bc"); // BroadcastChannel 实例
const STORE_NAME = "main"; // IndexedDB object store 名称
let lengthWarned = false; // length 属性警告标志

/**
 * 封装 IndexedDB 请求，返回 Promise 风格的接口
 * @param {IDBRequest} req - IndexedDB 请求对象
 * @param {Function} onSuccess - 成功回调
 * @param {Function} onError - 失败回调
 * @returns {IDBRequest} 原始请求对象
 */
const handleReq = (req, onSuccess, onError) => {
  req.onsuccess = () => onSuccess(req.result);
  req.onerror = (e) => onError(e.target.error || e);
  return req;
};

/**
 * EverCache - 基于 IndexedDB 的异步存储类
 * 提供类似 localStorage 的 API，但支持异步操作和跨标签页同步
 */
export class EverCache {
  /**
   * 创建一个 EverCache 实例
   * @param {string} id - 存储标识符，用于区分不同的存储空间
   */
  constructor(id = "public") {
    this[SName] = id;
    this[IDB] = this._openDB(id);

    if (typeof BroadcastChannel !== "undefined") {
      this[BC] = new BroadcastChannel(`ever-cache-${id}`);
      this[BC].onmessage = (e) => {
        const { key, oldValue, newValue } = e.data;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ever-cache-storage", {
              detail: { key, oldValue, newValue, cacheId: id },
            }),
          );
        }
      };
    }

    return new Proxy(this, handle);
  }

  /**
   * 触发存储变更事件
   * @param {string|null} key - 变更的键名
   * @param {*} oldValue - 旧值
   * @param {*} newValue - 新值
   * @private
   */
  _emitChange(key, oldValue, newValue) {
    const detail = { key, oldValue, newValue, cacheId: this[SName] };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ever-cache-storage", { detail }));
    }
    this[BC]?.postMessage(detail);
  }

  /**
   * 打开或创建 IndexedDB 数据库
   * @param {string} id - 数据库标识符
   * @returns {Promise<IDBDatabase>} 数据库实例
   * @private
   */
  _openDB(id) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(`ever-cache-${id}`);

      req.onsuccess = () => {
        const db = req.result;

        // 检查 object store 是否存在
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // object store 不存在，需要升级数据库版本以创建它
          const currentVersion = db.version;
          db.close();

          const upgradeReq = indexedDB.open(`ever-cache-${id}`, currentVersion + 1);
          upgradeReq.onupgradeneeded = () => {
            upgradeReq.result.createObjectStore(STORE_NAME, { keyPath: "key" });
          };
          upgradeReq.onsuccess = () => {
            const upgradedDb = upgradeReq.result;
            upgradedDb.onclose = () => {
              this[IDB] = this._openDB(id);
            };
            resolve(upgradedDb);
          };
          upgradeReq.onerror = (e) => reject(e.target.error || e);
          return;
        }

        // 连接被外部关闭（页面回收/主动 close）后，下一次操作前自动重连
        db.onclose = () => {
          this[IDB] = this._openDB(id);
        };
        resolve(db);
      };

      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      };

      // 其它标签页持有旧版本，open 被阻塞
      req.onblocked = () => {
        reject(new Error(`ever-cache: open blocked for "${id}", close other tabs`));
      };

      req.onerror = (e) => reject(e.target.error || e);
    });
  }

  /**
   * 执行 object store 操作的辅助方法
   * @param {string} mode - 事务模式：'readonly' 或 'readwrite'
   * @param {Function} callback - 回调函数，接收 store、resolve、reject 参数
   * @returns {Promise} 操作结果
   * @private
   */
  _withStore(mode, callback) {
    return this[IDB].then(
      (db) =>
        new Promise((resolve, reject) => {
          const store = db.transaction([STORE_NAME], mode).objectStore(STORE_NAME);
          callback(store, resolve, reject);
        }),
    );
  }

  /**
   * 执行数据变更操作的通用方法
   * @param {string} key - 键名
   * @param {Function} actionFn - 执行操作的函数
   * @param {*} newValue - 新值
   * @returns {Promise<boolean>} 操作结果
   * @private
   */
  _mutateItem(key, actionFn, newValue) {
    return this._withStore("readwrite", (store, resolve, reject) => {
      handleReq(
        store.get(key),
        (result) => {
          const oldValue = result ? result.value : null;
          handleReq(
            actionFn(store),
            () => {
              this._emitChange(key, oldValue, newValue);
              resolve(true);
            },
            reject,
          );
        },
        reject,
      );
    });
  }

  /**
   * 设置存储项
   * @param {string} key - 键名
   * @param {*} value - 值
   * @returns {Promise<boolean>} 操作结果
   */
  setItem(key, value) {
    return this._mutateItem(key, (store) => store.put({ key, value }), value);
  }

  /**
   * 获取存储项
   * @param {string} key - 键名
   * @returns {Promise<*>} 存储的值，不存在时返回 null
   */
  getItem(key) {
    return this._withStore("readonly", (store, resolve, reject) => {
      handleReq(store.get(key), (result) => resolve(result ? result.value : null), reject);
    });
  }

  /**
   * 删除存储项
   * @param {string} key - 键名
   * @returns {Promise<boolean>} 操作结果
   */
  removeItem(key) {
    return this._mutateItem(key, (store) => store.delete(key), null);
  }

  /**
   * 清空所有存储项
   * @returns {Promise<boolean>} 操作结果
   */
  clear() {
    return this._withStore("readwrite", (store, resolve, reject) => {
      handleReq(
        store.clear(),
        () => {
          this._emitChange(null, null, null);
          resolve(true);
        },
        reject,
      );
    });
  }

  /**
   * 根据索引获取键名
   * @param {number} index - 索引位置
   * @returns {Promise<string|undefined>} 键名
   */
  key(index) {
    return this._withStore("readonly", (store, resolve, reject) => {
      const req = store.openKeyCursor();
      let advanced = false;
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return resolve(undefined);
        if (index === 0 || advanced) return resolve(cur.key);

        advanced = true;
        cur.advance(index);
      };
      req.onerror = (e) => reject(e.target.error || e);
    });
  }

  /**
   * 获取存储项数量
   * 注意：此属性返回 Promise，需要 await
   * @returns {Promise<number>} 存储项数量
   */
  get length() {
    if (!lengthWarned) {
      console.warn(
        "ever-cache: `length` is async and returns a Promise, remember to `await` it.",
      );
      lengthWarned = true;
    }
    return this._withStore("readonly", (store, resolve, reject) => {
      handleReq(store.count(), resolve, reject);
    });
  }

  /**
   * 异步迭代器：返回所有键值对
   * @yields {[string, *]} 键值对数组
   */
  async *entries() {
    const db = await this[IDB];
    let lastKey;
    let hasMore = true;
    const KeyRange =
      typeof IDBKeyRange !== "undefined" ? IDBKeyRange : globalThis.IDBKeyRange;

    while (hasMore) {
      const batch = await new Promise((resolve, reject) => {
        const store = db
          .transaction([STORE_NAME], "readonly")
          .objectStore(STORE_NAME);
        const req =
          lastKey !== undefined
            ? store.openCursor(KeyRange.lowerBound(lastKey, true))
            : store.openCursor();
        const items = [];

        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            items.push([cursor.key, cursor.value.value]);
            if (items.length < 50) {
              cursor.continue();
            } else {
              resolve({ items, hasMore: true });
            }
          } else {
            resolve({ items, hasMore: false });
          }
        };
        req.onerror = (e) => reject(e.target.error || e);
      });

      for (const item of batch.items) {
        yield item;
      }
      hasMore = batch.hasMore;
      if (hasMore) {
        lastKey = batch.items[batch.items.length - 1][0];
      }
    }
  }

  /**
   * 异步迭代器：返回所有键名
   * @yields {string} 键名
   */
  async *keys() {
    for await (const [key] of this.entries()) {
      yield key;
    }
  }

  /**
   * 异步迭代器：返回所有值
   * @yields {*} 值
   */
  async *values() {
    for await (const [, value] of this.entries()) {
      yield value;
    }
  }
}

/**
 * Proxy 处理器
 * 允许通过属性访问方式操作存储，如 cache.key = value
 */
const handle = {
  /**
   * 拦截属性读取
   * 如果属性存在于实例上或是 symbol，则直接返回
   * 否则调用 getItem 获取存储值
   */
  get(target, key, receiver) {
    if (key in target || typeof key === "symbol" || key === "then") {
      return Reflect.get(target, key, receiver);
    }

    return target.getItem(key);
  },
  /**
   * 拦截属性设置
   * 调用 setItem 存储值
   */
  set(target, key, value) {
    target.setItem(key, value).catch(() => { });
    return true;
  },
  /**
   * 拦截属性删除
   * 调用 removeItem 删除存储项
   */
  deleteProperty(target, key) {
    target.removeItem(key).catch(() => { });
    return true;
  },
};

/**
 * 默认导出的 EverCache 实例
 * 使用 "public" 作为存储标识符
 */
export const storage = new EverCache();
