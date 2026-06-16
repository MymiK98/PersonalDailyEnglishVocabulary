// decks.js — 단어장(덱) CRUD + 카드 cascade
// decks store: { id, name, createdAt }

import { add, get, put, del, getAll, getByIndex } from './db.js';

// 전체 덱 목록 (생성순)
export async function listDecks() {
  const decks = await getAll('decks');
  decks.sort((a, b) => a.createdAt - b.createdAt);
  return decks;
}

// 덱 생성 → 생성된 id 반환
export async function createDeck(name) {
  const id = await add('decks', { name: String(name || '').trim() || '새 단어장', createdAt: Date.now() });
  return id;
}

// 덱 이름 변경
export async function renameDeck(id, name) {
  const deck = await get('decks', id);
  if (!deck) return;
  deck.name = String(name || '').trim() || deck.name;
  await put('decks', deck);
}

// 덱 삭제: 소속 카드 모두 삭제. 선택 중인 덱이면 학습 상태/오늘 배치 정리
export async function deleteDeck(id) {
  const cards = await getByIndex('cards', 'byDeck', IDBKeyRange.only(id));
  for (const c of cards) await del('cards', c.id);
  await del('decks', id);

  const study = await get('meta', 'study');
  if (study && study.selectedDeckId === id) {
    await put('meta', { key: 'study', selectedDeckId: null, cycleStudiedIds: [], cycleStartedAt: Date.now() });
  }
}

// 덱 내 카드 수
export async function countDeckCards(id) {
  const cards = await getByIndex('cards', 'byDeck', IDBKeyRange.only(id));
  return cards.length;
}
