const SName = Symbol("storage-name");
const IDB = Symbol("idb");
const BC = Symbol("bc");
let lengthWarned = false;

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
            })
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
    if (this[BC]) {
      this[BC].postMessage(detail);
    }
  }

  _openDB(id) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(`ever-cache-${id}`);

      req.onsuccess = (e) => {
        const db = e.target.result;
        // 连接被外部关闭（页面回收/主动 close）后，下一次操作前自动重连
        db.onclose = () => {
          this[IDB] = this._openDB(id);
        };
        resolve(db);
      };

      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(id, { keyPath: "key" });
      };

      // 其它标签页持有旧版本，open 被阻塞
      req.onblocked = () => {
        reject(
          new Error(`ever-cache: open blocked for "${id}", close other tabs`),
        );
      };

      req.onerror = (e) => {
        reject(e.target.error || e);
      };
    });
  }

  setItem(key, value) {
    return this[IDB].then((db) => {
      return new Promise((resolve, reject) => {
        const store = db
          .transaction([this[SName]], "readwrite")
          .objectStore(this[SName]);
        const getReq = store.get(key);

        getReq.onsuccess = (e) => {
          try {
            const oldValue = e.target.result ? e.target.result.value : null;
            const putReq = store.put({ key, value });

            putReq.onsuccess = () => {
              this._emitChange(key, oldValue, value);
              resolve(true);
            };
            putReq.onerror = (err) => reject(err.target.error || err);
          } catch (err) {
            reject(err);
          }
        };
        getReq.onerror = (err) => reject(err.target.error || err);
      });
    });
  }

  getItem(key) {
    return commonTask(this, (store) => store.get(key), "readonly").then((e) => {
      const { result } = e.target;
      return result ? result.value : null;
    });
  }

  removeItem(key) {
    return this[IDB].then((db) => {
      return new Promise((resolve, reject) => {
        const store = db
          .transaction([this[SName]], "readwrite")
          .objectStore(this[SName]);
        const getReq = store.get(key);

        getReq.onsuccess = (e) => {
          try {
            const oldValue = e.target.result ? e.target.result.value : null;
            const delReq = store.delete(key);

            delReq.onsuccess = () => {
              this._emitChange(key, oldValue, null);
              resolve(true);
            };
            delReq.onerror = (err) => reject(err.target.error || err);
          } catch (err) {
            reject(err);
          }
        };
        getReq.onerror = (err) => reject(err.target.error || err);
      });
    });
  }

  clear() {
    return commonTask(this, (store) => store.clear()).then(() => {
      this._emitChange(null, null, null);
      return true;
    });
  }

  async key(index) {
    const db = await this[IDB];
    return new Promise((resolve, reject) => {
      const req = db
        .transaction([this[SName]], "readonly")
        .objectStore(this[SName])
        .openKeyCursor();
      let advanced = false;
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (!cur) {
          resolve(undefined);
          return;
        }
        if (index === 0) {
          resolve(cur.key);
          return;
        }
        if (!advanced) {
          advanced = true;
          cur.advance(index);
        } else {
          resolve(cur.key);
        }
      };
      req.onerror = (e) => reject(e.target.error || e);
    });
  }

  get length() {
    if (!lengthWarned) {
      console.warn(
        "ever-cache: `length` is async and returns a Promise, remember to `await` it."
      );
      lengthWarned = true;
    }
    return commonTask(this, (store) => store.count()).then(
      (e) => e.target.result
    );
  }

  async *entries() {
    const db = await this[IDB];
    let lastKey;
    let hasMore = true;
    const KeyRange = typeof IDBKeyRange !== "undefined" ? IDBKeyRange : globalThis.IDBKeyRange;

    while (hasMore) {
      const batch = await new Promise((resolve, reject) => {
        const tx = db.transaction([this[SName]], "readonly");
        const store = tx.objectStore(this[SName]);
        const req = lastKey !== undefined ? store.openCursor(KeyRange.lowerBound(lastKey, true)) : store.openCursor();
        const items = [];
        
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            items.push([cursor.key, cursor.value]);
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
    for await (let [key, value] of this.entries()) {
      yield key;
    }
  }

  async *values() {
    for await (let [key, value] of this.entries()) {
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
    target.setItem(key, value).catch(() => {});
    return true;
  },
  deleteProperty(target, key) {
    target.removeItem(key).catch(() => {});
    return true;
  },
};

const commonTask = (_this, afterStore, mode = "readwrite", succeed) => {
  return _this[IDB].then((db) => {
    return new Promise((resolve, reject) => {
      const req = afterStore(
        db.transaction([_this[SName]], mode).objectStore(_this[SName]),
      );

      req.onsuccess = (e) => {
        if (succeed) {
          resolve(succeed(e));
          return;
        }
        resolve(e);
      };
      req.onerror = (e) => {
        reject(e.target.error || e);
      };
    });
  });
};

export const storage = new EverCache();
