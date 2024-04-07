const SName = Symbol("storage-name");
const IDB = Symbol("idb");

export class IDBStorage {
  constructor(id = "public") {
    this[SName] = id;

    this[IDB] = new Promise((resolve) => {
      let req = indexedDB.open("idb-storage");

      req.onsuccess = (e) => {
        resolve(e.target.result);
      };

      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(id, { keyPath: "key" });
      };
    });

    return new Proxy(this, handle);
  }

  async setItem(key, value) {
    return commonTask(
      this,
      (store) => store.put({ key, value }),
      () => true
    );
  }

  async getItem(key) {
    return commonTask(
      this,
      (store) => store.get(key),
      (e) => {
        const { result } = e.target;
        return result ? result.value : null;
      },
      "readonly"
    );
  }

  async removeItem(key) {
    return commonTask(
      this,
      (store) => store.delete(key),
      () => true
    );
  }

  async clear() {
    return commonTask(
      this,
      (store) => store.clear(),
      () => true
    );
  }

  async key(index) {
    return commonTask(
      this,
      (store) => store.getAllKeys(),
      (e) => e.target.result[index]
    );
  }

  get length() {
    return commonTask(
      this,
      (store) => store.count(),
      (e) => e.target.result
    );
  }
}

const exitedKeys = new Set(Object.getOwnPropertyNames(IDBStorage.prototype));

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

const commonTask = async (_this, afterStore, succeed, mode = "readwrite") => {
  const db = await _this[IDB];

  return new Promise((resolve, reject) => {
    const req = afterStore(
      db.transaction([_this[SName]], mode).objectStore(_this[SName])
    );

    req.onsuccess = (e) => {
      resolve(succeed(e));
    };
    req.onerror = (e) => {
      reject(e);
    };
  });
};

export const storage = new IDBStorage();
