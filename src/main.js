const SName = Symbol("storage-name");
const IDB = Symbol("idb");

export class EverCache {
  constructor(id = "public") {
    this[SName] = id;

    this[IDB] = new Promise((resolve) => {
      let req = indexedDB.open("ever-cache");

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
    return commonTask(this, (store) => store.put({ key, value })).then(
      () => true
    );
  }

  async getItem(key) {
    return commonTask(this, (store) => store.get(key), "readonly").then((e) => {
      const { result } = e.target;
      return result ? result.value : null;
    });
  }

  async removeItem(key) {
    return commonTask(this, (store) => store.delete(key)).then(() => true);
  }

  async clear() {
    return commonTask(this, (store) => store.clear()).then(() => true);
  }

  async key(index) {
    return commonTask(this, (store) => store.getAllKeys()).then(
      (e) => e.target.result[index]
    );
  }

  get length() {
    return commonTask(this, (store) => store.count()).then(
      (e) => e.target.result
    );
  }

  // async keys() {}

  // async values() {}

  // async entries() {
  //   commonTask(
  //     this,
  //     (store) => store.count(),
  //     (e) => e.target.result
  //   );

  //   debugger;
  // }
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

const commonTask = async (_this, afterStore, mode = "readwrite") => {
  const db = await _this[IDB];

  return new Promise((resolve, reject) => {
    const req = afterStore(
      db.transaction([_this[SName]], mode).objectStore(_this[SName])
    );

    req.onsuccess = (e) => {
      // resolve(succeed(e));
      resolve(e);
    };
    req.onerror = (e) => {
      reject(e);
    };
  });
};

export const storage = new EverCache();
