const SName = Symbol("storage-name");
const IDB = Symbol("idb");
const BC = Symbol("bc");
const STORE_NAME = "main";
let lengthWarned = false;

export class EverCache {
  constructor(id = "public") {
    this[SName] = id;
    this[IDB] = this._openDB(id);

    if (typeof BroadcastChannel !== "undefined") {
      this[BC] = new BroadcastChannel(`ever-cache-${id}`);
      this[BC].onmessage = (e) => this._dispatchEvent(e.data);
    }

    return new Proxy(this, handle);
  }

  _dispatchEvent(detail) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ever-cache-storage", { detail }));
    }
  }

  _emitChange(key, oldValue, newValue) {
    const detail = { key, oldValue, newValue, cacheId: this[SName] };
    this._dispatchEvent(detail);
    this[BC]?.postMessage(detail);
  }

  _openDB(id) {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(`ever-cache-${id}`);

      req.onsuccess = (e) => {
        const db = e.target.result;
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
            e.target.result.onclose = () => (this[IDB] = this._openDB(id));
            resolve(e.target.result);
          };
          upgradeReq.onerror = (e) => reject(e.target.error || e);
          return;
        }
        db.onclose = () => (this[IDB] = this._openDB(id));
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

  _withStore(mode, operation) {
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

  setItem(key, value) {
    return this._withStore("readwrite", (store) => {
      const getReq = store.get(key);
      getReq.onsuccess = (e) => {
        const oldValue = e.target.result?.value ?? null;
        const putReq = store.put({ key, value });
        putReq.onsuccess = () => this._emitChange(key, oldValue, value);
        putReq.onerror = (err) => Promise.reject(err.target.error || err);
      };
      return getReq;
    }).then(() => true);
  }

  getItem(key) {
    return this._withStore("readonly", (store) => store.get(key)).then(
      (e) => e.target.result?.value ?? null,
    );
  }

  removeItem(key) {
    return this._withStore("readwrite", (store) => {
      const getReq = store.get(key);
      getReq.onsuccess = (e) => {
        const oldValue = e.target.result?.value ?? null;
        const delReq = store.delete(key);
        delReq.onsuccess = () => this._emitChange(key, oldValue, null);
        delReq.onerror = (err) => Promise.reject(err.target.error || err);
      };
      return getReq;
    }).then(() => true);
  }

  clear() {
    return this._withStore("readwrite", (store) => store.clear()).then(() => {
      this._emitChange(null, null, null);
      return true;
    });
  }

  async key(index) {
    const e = await this._withStore("readonly", (store) => {
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

  get length() {
    if (!lengthWarned) {
      console.warn(
        "ever-cache: `length` is async and returns a Promise, remember to `await` it.",
      );
      lengthWarned = true;
    }
    return this._withStore("readonly", (store) => store.count()).then(
      (e) => e.target.result,
    );
  }

  async *_iterate(getValue) {
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

  async *entries() {
    yield* this._iterate((x) => x);
  }
  async *keys() {
    yield* this._iterate(([k]) => k);
  }
  async *values() {
    yield* this._iterate(([, v]) => v);
  }
}

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

export const storage = new EverCache();
