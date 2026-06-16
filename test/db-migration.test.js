// db.js v1→v2 마이그레이션 테스트 (fake-indexeddb)
// v1 스키마를 raw로 시드한 뒤 db.js(v2)를 열어 마이그레이션 결과 검증.
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('v1→v2: 카드 deckId 이전 + SRS 폐기 + 기본 덱 + study 시드', async () => {
  // 1) v1 스키마(cards keyPath=word) 시드
  await new Promise((resolve, reject) => {
    const open = indexedDB.open('vocabPWA', 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      const cards = db.createObjectStore('cards', { keyPath: 'word' });
      cards.createIndex('byDueDate', 'dueDate', { unique: false });
      cards.createIndex('byAddedAt', 'addedAt', { unique: false });
      db.createObjectStore('meta', { keyPath: 'key' });
    };
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(['cards', 'meta'], 'readwrite');
      tx.objectStore('cards').add({ word: 'apple', phonetic: '/p/', meaning: '사과', example: 'ex', ease: 2.6, interval: 6, repetitions: 2, dueDate: '2026-06-10', lastReviewed: '2026-06-04', addedAt: 1000 });
      tx.objectStore('cards').add({ word: 'banana', phonetic: '/b/', meaning: '바나나', example: 'ex2', ease: 2.5, interval: 0, repetitions: 0, dueDate: null, lastReviewed: null, addedAt: 1001 });
      tx.objectStore('meta').put({ key: 'settings', newPerDay: 15, notifyTime: '08:30' });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
    open.onerror = () => reject(open.error);
  });

  // 2) db.js(v2)로 열기 → onupgradeneeded에서 마이그레이션 실행
  const { getAll, get } = await import('../js/db.js');

  const cards = await getAll('cards');
  assert.equal(cards.length, 2);
  for (const c of cards) {
    assert.equal(c.deckId, 1);            // 기본 덱으로 이전
    assert.equal(typeof c.id, 'number');  // id keyPath
    assert.equal('ease' in c, false);     // SRS 필드 폐기
    assert.equal('dueDate' in c, false);
    assert.equal('interval' in c, false);
  }
  // 단어/뜻은 보존
  assert.ok(cards.some((c) => c.word === 'apple' && c.meaning === '사과'));

  const decks = await getAll('decks');
  assert.equal(decks.length, 1);
  assert.equal(decks[0].name, '기본');

  const study = await get('meta', 'study');
  assert.equal(study.selectedDeckId, 1);
  assert.deepEqual(study.cycleStudiedIds, []);

  // settings: newPerDay 보존, getSettings가 wordsPerDay로 lazy 매핑
  const { getSettings } = await import('../js/settings.js');
  const s = await getSettings();
  assert.equal(s.wordsPerDay, 15);
  assert.equal(s.notifyTime, '08:30');
});
