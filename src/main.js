const SName = Symbol("storage-name");
const IDB = Symbol("idb");
const BC = Symbol("bc");
const STORE_NAME = "main";
let lengthWarned = false;

const handleReq = (req, onSuccess, onError) => {
  req.onsuccess = () => onSuccess(req.result);
  req.onerror = (e) => onError(e.target.error || e);
  return req;
};

export class EverCache {
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

  _emitChange(key, oldValue, newValue) {
    const detail = { key, oldValue, newValue, cacheId: this[SName] };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ever-cache-storage", { detail }));
    }
    this[BC]?.postMessage(detail);
  }

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

  _withStore(mode, callback) {
    return this[IDB].then(
      (db) =>
        new Promise((resolve, reject) => {
          const store = db.transaction([STORE_NAME], mode).objectStore(STORE_NAME);
          callback(store, resolve, reject);
        }),
    );
  }

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

  setItem(key, value) {
    return this._mutateItem(key, (store) => store.put({ key, value }), value);
  }

  getItem(key) {
    return this._withStore("readonly", (store, resolve, reject) => {
      handleReq(store.get(key), (result) => resolve(result ? result.value : null), reject);
    });
  }

  removeItem(key) {
    return this._mutateItem(key, (store) => store.delete(key), null);
  }

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

  async *keys() {
    for await (const [key] of this.entries()) {
      yield key;
    }
  }

  async *values() {
    for await (const [, value] of this.entries()) {
      yield value;
    }
  }
}

const handle = {
  get(target, key, receiver) {
    if (key in target || typeof key === "symbol" || key === "then") {
      return Reflect.get(target, key, receiver);
    }

    return target.getItem(key);
  },
  set(target, key, value) {
    target.setItem(key, value).catch(() => { });
    return true;
  },
  deleteProperty(target, key) {
    target.removeItem(key).catch(() => { });
    return true;
  },
};

export const storage = new EverCache();
