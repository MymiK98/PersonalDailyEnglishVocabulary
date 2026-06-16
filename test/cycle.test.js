// cycle.js 배치/회차 로직 테스트 (fake-indexeddb)
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from '../js/decks.js';
import { importCSV } from '../js/csv.js';
import { saveSettings } from '../js/settings.js';
import { getByIndex } from '../js/db.js';
import {
  selectDeck, getTodaysBatch, markBatchStudied, getCycleProgress, getStudyState,
} from '../js/cycle.js';

// N개 단어 CSV 생성
function csvOf(n) {
  let s = 'word,meaning\n';
  for (let i = 0; i < n; i++) s += `w${i},m${i}\n`;
  return s;
}

test('회차: 중복 없이 전체 순회 후 리셋', async () => {
  await saveSettings({ wordsPerDay: 3 });
  const deckId = await createDeck('cycle-deck');
  await importCSV(csvOf(9), deckId); // 9개, 3/일 → 3일에 1회차
  await selectDeck(deckId);

  const seen = [];
  for (let d = 1; d <= 3; d++) {
    const date = `2026-07-0${d}`;
    const batch = await getTodaysBatch(date);
    assert.equal(batch.cards.length, 3);
    seen.push(...batch.cards.map((c) => c.word));
    await markBatchStudied(date);
  }
  // 1회차 = 전체 9개, 중복 없음
  assert.equal(new Set(seen).size, 9);
  assert.equal((await getStudyState()).cycleStudiedIds.length, 9);
  assert.deepEqual(await getCycleProgress(), { studied: 9, total: 9 });

  // 회차 완료 → 4일차는 리셋되어 새 배치
  const day4 = await getTodaysBatch('2026-07-04');
  assert.equal(day4.cards.length, 3);
  assert.ok((await getStudyState()).cycleStudiedIds.length < 9); // 리셋됨
});

test('배치 날짜별 고정: 같은 날 재호출 시 동일', async () => {
  await saveSettings({ wordsPerDay: 2 });
  const deckId = await createDeck('fixed-deck');
  await importCSV(csvOf(10), deckId);
  await selectDeck(deckId);
  const b1 = await getTodaysBatch('2026-08-01');
  const b2 = await getTodaysBatch('2026-08-01');
  assert.deepEqual(b1.cards.map((c) => c.id), b2.cards.map((c) => c.id));
});

test('selectDeck: 회차 리셋 + 배치 재추첨(새 덱에서)', async () => {
  await saveSettings({ wordsPerDay: 2 });
  const d1 = await createDeck('A');
  const d2 = await createDeck('B');
  await importCSV(csvOf(5), d1);
  await importCSV(csvOf(5), d2);

  await selectDeck(d1);
  await getTodaysBatch('2026-09-01');
  await markBatchStudied('2026-09-01');
  assert.ok((await getStudyState()).cycleStudiedIds.length > 0);

  await selectDeck(d2);
  assert.equal((await getStudyState()).cycleStudiedIds.length, 0);
  const batch = await getTodaysBatch('2026-09-01');
  const d2cards = await getByIndex('cards', 'byDeck', IDBKeyRange.only(d2));
  assert.ok(batch.cards.length > 0);
  assert.ok(batch.cards.every((c) => d2cards.some((x) => x.id === c.id)));
});

test('wordsPerDay=0 방어: 최소 1개 배치', async () => {
  await saveSettings({ wordsPerDay: 0 }); // saveSettings가 1로 클램프
  const deckId = await createDeck('zero-deck');
  await importCSV(csvOf(5), deckId);
  await selectDeck(deckId);
  const batch = await getTodaysBatch('2026-10-01');
  assert.ok(batch.cards.length >= 1);
});

test('빈 덱: 빈 배치, 단어 추가 후 같은 날 재추첨', async () => {
  await saveSettings({ wordsPerDay: 3 });
  const deckId = await createDeck('empty-deck');
  await selectDeck(deckId);
  const empty = await getTodaysBatch('2026-11-01');
  assert.equal(empty.cards.length, 0);

  await importCSV(csvOf(4), deckId);
  const filled = await getTodaysBatch('2026-11-01');
  assert.ok(filled.cards.length >= 1); // 고정 빈배치로 막히지 않음
});

test('markBatchStudied: idempotent', async () => {
  await saveSettings({ wordsPerDay: 2 });
  const deckId = await createDeck('idem-deck');
  await importCSV(csvOf(4), deckId);
  await selectDeck(deckId);
  await getTodaysBatch('2026-12-01');
  assert.equal(await markBatchStudied('2026-12-01'), true);
  assert.equal(await markBatchStudied('2026-12-01'), false); // 이미 완료 → false
});
