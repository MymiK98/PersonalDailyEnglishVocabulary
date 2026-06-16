// csv.js 파싱/변환 단위 테스트 (순수 함수)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, rowsToCards } from '../js/csv.js';

test('parseCSV: 기본 행/열 분리', () => {
  const rows = parseCSV('word,phonetic,meaning,example\napple,/p/,사과,ex');
  assert.deepEqual(rows[0], ['word', 'phonetic', 'meaning', 'example']);
  assert.deepEqual(rows[1], ['apple', '/p/', '사과', 'ex']);
});

test('parseCSV: 큰따옴표로 감싼 필드 내 쉼표', () => {
  const rows = parseCSV('w,p,m,e\ndiligent,/d/,근면한,"She is diligent, always on time."');
  assert.equal(rows[1][3], 'She is diligent, always on time.');
});

test('parseCSV: 이스케이프된 따옴표("")', () => {
  const rows = parseCSV('w\n"say ""hi"""');
  assert.equal(rows[1][0], 'say "hi"');
});

test('parseCSV: BOM 제거 + CRLF 처리', () => {
  const rows = parseCSV('﻿word,m\r\napple,사과\r\n');
  assert.deepEqual(rows[0], ['word', 'm']);
  assert.deepEqual(rows[1], ['apple', '사과']);
});

test('rowsToCards: 헤더 스킵 + deckId 부여 + SRS 필드 없음', () => {
  const rows = parseCSV('word,phonetic,meaning,example\napple,/p/,사과,ex\nbanana,/b/,바나나,ex2');
  const cards = rowsToCards(rows, 7);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].deckId, 7);
  assert.equal(cards[0].word, 'apple');
  assert.deepEqual(Object.keys(cards[0]).sort(),
    ['addedAt', 'deckId', 'example', 'meaning', 'phonetic', 'word']);
  // SRS 필드 폐기 확인
  assert.equal('ease' in cards[0], false);
  assert.equal('dueDate' in cards[0], false);
});

test('rowsToCards: 헤더 없는 CSV는 첫 행도 데이터', () => {
  const rows = parseCSV('apple,/p/,사과,ex');
  const cards = rowsToCards(rows, 1);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].word, 'apple');
});

test('rowsToCards: 빈 word 행 스킵, 공백 trim (열=word,phonetic,meaning,example)', () => {
  const rows = parseCSV('word,phonetic,meaning,example\n  spaced  ,/s/,뜻,예문\n,/x/,빈단어,x');
  const cards = rowsToCards(rows, 1);
  assert.equal(cards.length, 1);        // word 없는 행 스킵
  assert.equal(cards[0].word, 'spaced'); // trim
  assert.equal(cards[0].phonetic, '/s/');
  assert.equal(cards[0].meaning, '뜻');
  assert.equal(cards[0].example, '예문');
});
