// db.js — IndexedDB 래퍼
// DB: vocabPWA, 버전 2
// store: cards(keyPath: id, autoIncrement), decks(keyPath: id, autoIncrement), meta(keyPath: key)

const DB_NAME = 'vocabPWA';
const DB_VERSION = 2;

let dbPromise = null;

// cards 스토어 생성: id 자동증가 PK, 덱 조회 인덱스, 덱 내 단어 유일 인덱스
function makeCardsStore(db) {
  const cards = db.createObjectStore('cards', { keyPath: 'id', autoIncrement: true });
  cards.createIndex('byDeck', 'deckId', { unique: false });
  cards.createIndex('byDeckWord', ['deckId', 'word'], { unique: true });
  return cards;
}

// decks 스토어 생성: id 자동증가 PK
function makeDecksStore(db) {
  return db.createObjectStore('decks', { keyPath: 'id', autoIncrement: true });
}

// v1 → v2 마이그레이션: cards keyPath(word→id) 변경 + decks 도입.
// versionchange 트랜잭션의 raw 요청만 사용(openDB 헬퍼 호출 금지 → 데드락).
function migrateV1toV2(db, tx) {
  const getAllReq = tx.objectStore('cards').getAll();
  getAllReq.onsuccess = () => {
    const oldCards = getAllReq.result || [];
    db.deleteObjectStore('cards'); // keyPath 변경 불가 → 삭제 후 재생성
    const cards = makeCardsStore(db);
    const decks = makeDecksStore(db);
    const deckReq = decks.add({ name: '기본', createdAt: Date.now() });
    deckReq.onsuccess = () => {
      const deckId = deckReq.result;
      for (const c of oldCards) {
        // SRS 필드(ease/interval/repetitions/dueDate/lastReviewed) 폐기
        cards.add({
          deckId,
          word: c.word,
          phonetic: c.phonetic,
          meaning: c.meaning,
          example: c.example,
          addedAt: c.addedAt ?? Date.now(),
        });
      }
      tx.objectStore('meta').put({
        key: 'study',
        selectedDeckId: deckId,
        cycleStudiedIds: [],
        cycleStartedAt: Date.now(),
      });
    };
  };
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const tx = req.transaction;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }

      if (oldVersion < 1) {
        // 신규 설치: 새 스키마 + 기본 덱
        makeDecksStore(db);
        makeCardsStore(db);
        const deckReq = tx.objectStore('decks').add({ name: '기본', createdAt: Date.now() });
        deckReq.onsuccess = () => {
          tx.objectStore('meta').put({
            key: 'study',
            selectedDeckId: deckReq.result,
            cycleStudiedIds: [],
            cycleStartedAt: Date.now(),
          });
        };
        return;
      }

      if (oldVersion < 2) {
        migrateV1toV2(db, tx);
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
