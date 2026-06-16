// decks.js CRUD + cascade 테스트 (fake-indexeddb)
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listDecks, createDeck, renameDeck, deleteDeck, countDeckCards } from '../js/decks.js';
import { importCSV } from '../js/csv.js';
import { getByIndex } from '../js/db.js';

test('신규 설치 시 기본 덱 자동 생성', async () => {
  const decks = await listDecks();
  assert.equal(decks.length, 1);
  assert.equal(decks[0].name, '기본');
});

test('createDeck: 목록 반영 + id 반환', async () => {
  const id = await createDeck('고급');
  assert.ok(typeof id === 'number');
  const decks = await listDecks();
  assert.ok(decks.some((d) => d.id === id && d.name === '고급'));
});

test('createDeck: 빈 이름은 기본 이름 대체', async () => {
  const id = await createDeck('   ');
  const decks = await listDecks();
  assert.equal(decks.find((d) => d.id === id).name, '새 단어장');
});

test('renameDeck', async () => {
  const id = await createDeck('temp');
  await renameDeck(id, 'renamed');
  const decks = await listDecks();
  assert.equal(decks.find((d) => d.id === id).name, 'renamed');
});

test('deleteDeck: 덱 + 소속 카드 cascade 삭제', async () => {
  const id = await createDeck('삭제대상');
  await importCSV('word,meaning\na,1\nb,2\nc,3', id);
  assert.equal(await countDeckCards(id), 3);

  await deleteDeck(id);
  const decks = await listDecks();
  assert.equal(decks.some((d) => d.id === id), false);
  const cards = await getByIndex('cards', 'byDeck', IDBKeyRange.only(id));
  assert.equal(cards.length, 0);
});
