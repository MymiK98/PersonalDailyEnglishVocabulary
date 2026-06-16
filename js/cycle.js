// cycle.js — 오늘의 배치 선정 + 회차(순회) 관리
// meta 'study': { selectedDeckId, cycleStudiedIds:[], cycleStartedAt }
// meta 'batch:YYYY-MM-DD': { date, deckId, cardIds:[], studied:bool }

import { get, put, del, getByIndex } from './db.js';
import { todayStr } from './srs.js';
import { getSettings } from './settings.js';
import { recordReview } from './stats.js';

function batchKey(date) { return `batch:${date}`; }

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function getStudyState() {
  const s = await get('meta', 'study');
  return s || { key: 'study', selectedDeckId: null, cycleStudiedIds: [], cycleStartedAt: 0 };
}

async function saveStudyState(s) {
  await put('meta', { ...s, key: 'study' });
}

// 학습할 덱 변경: 회차 리셋 + 오늘 배치 삭제(새 덱으로 재추첨)
export async function selectDeck(deckId) {
  await saveStudyState({ selectedDeckId: deckId, cycleStudiedIds: [], cycleStartedAt: Date.now() });
  await del('meta', batchKey(todayStr()));
}

// 오늘의 배치(없으면 새로 추첨, 날짜별 고정)
export async function getTodaysBatch(today = todayStr()) {
  const study = await getStudyState();
  if (study.selectedDeckId == null) {
    return { cards: [], deckId: null, studied: false, empty: true };
  }
  const deckCards = await getByIndex('cards', 'byDeck', IDBKeyRange.only(study.selectedDeckId));
  const existing = await get('meta', batchKey(today));
  if (existing && existing.deckId === study.selectedDeckId) {
    // 고정된 오늘 배치 hydrate (삭제된 id 필터)
    const map = new Map(deckCards.map((c) => [c.id, c]));
    const cards = existing.cardIds.map((id) => map.get(id)).filter(Boolean);
    return { cards, deckId: study.selectedDeckId, studied: existing.studied, empty: deckCards.length === 0 };
  }
  return pickNewBatch(study, deckCards, today);
}

async function pickNewBatch(study, deckCards, today) {
  if (deckCards.length === 0) {
    // 빈 덱은 배치를 고정 저장하지 않음(이후 단어 추가 시 재추첨되도록)
    return { cards: [], deckId: study.selectedDeckId, studied: false, empty: true };
  }
  const settings = await getSettings();
  const N = Math.max(1, settings.wordsPerDay); // 0/음수 방어 → 최소 1개
  const studiedSet = new Set(study.cycleStudiedIds);
  let unstudied = deckCards.filter((c) => !studiedSet.has(c.id));
  if (unstudied.length === 0) {
    // 회차 완료 → 리셋 후 전체 대상
    study.cycleStudiedIds = [];
    study.cycleStartedAt = Date.now();
    await saveStudyState(study);
    unstudied = deckCards;
  }
  const picked = shuffle(unstudied).slice(0, N);
  await put('meta', { key: batchKey(today), date: today, deckId: study.selectedDeckId, cardIds: picked.map((c) => c.id), studied: false });
  return { cards: picked, deckId: study.selectedDeckId, studied: false };
}

// 오늘 배치를 학습 완료 처리 (회차 진행 + streak/daily 기록)
export async function markBatchStudied(today = todayStr()) {
  const batch = await get('meta', batchKey(today));
  if (!batch || batch.studied || batch.cardIds.length === 0) return false;
  batch.studied = true;
  await put('meta', batch);

  const study = await getStudyState();
  const set = new Set(study.cycleStudiedIds);
  batch.cardIds.forEach((id) => set.add(id));
  study.cycleStudiedIds = [...set];
  await saveStudyState(study);

  const deckCards = await getByIndex('cards', 'byDeck', IDBKeyRange.only(batch.deckId));
  const map = new Map(deckCards.map((c) => [c.id, c]));
  for (const id of batch.cardIds) {
    const c = map.get(id);
    if (c) await recordReview(c.word, today);
  }
  return true;
}

// 회차 진행 상황(통계용) — 삭제된 id는 제외
export async function getCycleProgress() {
  const study = await getStudyState();
  if (study.selectedDeckId == null) return { studied: 0, total: 0 };
  const deckCards = await getByIndex('cards', 'byDeck', IDBKeyRange.only(study.selectedDeckId));
  const ids = new Set(deckCards.map((c) => c.id));
  const studied = study.cycleStudiedIds.filter((id) => ids.has(id)).length;
  return { studied, total: deckCards.length };
}
