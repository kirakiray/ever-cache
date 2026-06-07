const SName = Symbol("storage-name");
const IDB = Symbol("idb");
let lengthWarned = false;

export class EverCache {
  constructor(id = "public") {
    this[SName] = id;
    this[IDB] = this._openDB(id);

    if (typeof BroadcastChannel !== "undefined") {
      this._bc = new BroadcastChannel(`ever-cache-${id}`);
      this._bc.onmessage = (e) => {
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
    if (this._bc) {
      this._bc.postMessage(detail);
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

  async setItem(key, value) {
    const oldValue = await this.getItem(key);
    return commonTask(this, (store) => store.put({ key, value })).then(
      () => {
        this._emitChange(key, oldValue, value);
        return true;
      },
    );
  }

  async getItem(key) {
    return commonTask(this, (store) => store.get(key), "readonly").then((e) => {
      const { result } = e.target;
      return result ? result.value : null;
    });
  }

  async removeItem(key) {
    const oldValue = await this.getItem(key);
    return commonTask(this, (store) => store.delete(key)).then(() => {
      this._emitChange(key, oldValue, null);
      return true;
    });
  }

  async clear() {
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
      let i = 0;
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (!cur) {
          resolve(undefined);
          return;
        }
        if (i++ === index) {
          resolve(cur.key);
          return;
        }
        cur.continue();
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

  entries() {
    return {
      [Symbol.asyncIterator]: () => {
        let resolve;
        let cursorPms;
        const resetPms = () => {
          cursorPms = new Promise((res) => (resolve = res));
        };
        resetPms();

        commonTask(
          this,
          (store) => store.openCursor(),
          "readonly",
          (e) => resolve(e.target.result),
        );

        return {
          async next() {
            const cursor = await cursorPms;
            if (!cursor) {
              return {
                done: true,
              };
            }
            resetPms();
            const { key, value } = cursor.value;
            cursor.continue();

            return { value: [key, value], done: false };
          },
        };
      },
    };
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

const exitedKeys = new Set(Object.getOwnPropertyNames(EverCache.prototype));

const handle = {
  get(target, key, receiver) {
    if (exitedKeys.has(key) || typeof key === "symbol") {
      return Reflect.get(target, key, receiver);
    }

    return target.getItem(key);
  },
  set(target, key, value) {
    return target.setItem(key, value);
  },
  deleteProperty(target, key) {
    return target.removeItem(key);
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
