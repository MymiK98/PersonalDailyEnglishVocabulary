// db.js — IndexedDB 래퍼
// DB: vocabPWA, 버전 1
// store: cards(keyPath: word), meta(keyPath: key)

const DB_NAME = 'vocabPWA';
const DB_VERSION = 1;

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('cards')) {
        const cards = db.createObjectStore('cards', { keyPath: 'word' });
        cards.createIndex('byDueDate', 'dueDate', { unique: false });
        cards.createIndex('byAddedAt', 'addedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const os = t.objectStore(store);
    let result;
    Promise.resolve(fn(os)).then((r) => { result = r; }).catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function add(store, value) {
  return tx(store, 'readwrite', (os) => reqToPromise(os.add(value)));
}
export async function put(store, value) {
  return tx(store, 'readwrite', (os) => reqToPromise(os.put(value)));
}
export async function get(store, key) {
  return tx(store, 'readonly', (os) => reqToPromise(os.get(key)));
}
export async function getAll(store) {
  return tx(store, 'readonly', (os) => reqToPromise(os.getAll()));
}
export async function del(store, key) {
  return tx(store, 'readwrite', (os) => reqToPromise(os.delete(key)));
}
export async function count(store) {
  return tx(store, 'readonly', (os) => reqToPromise(os.count()));
}
export async function getByIndex(store, indexName, range) {
  return tx(store, 'readonly', (os) =>
    reqToPromise(os.index(indexName).getAll(range))
  );
}

// 여러 레코드를 한 트랜잭션에서 add. 중복 word는 건너뜀(기존 SRS 보존)
export async function addMany(store, values) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    const os = t.objectStore(store);
    const addedWords = [];
    let skipped = 0;
    let pending = values.length;
    if (pending === 0) { resolve({ addedWords, skipped }); return; }
    values.forEach((v) => {
      const r = os.add(v);
      r.onsuccess = () => { addedWords.push(v.word); if (--pending === 0) {} };
      r.onerror = (e) => { skipped++; e.preventDefault(); e.stopPropagation(); };
    });
    t.oncomplete = () => resolve({ addedWords, skipped });
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
