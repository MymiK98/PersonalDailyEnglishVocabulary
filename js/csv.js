// csv.js — CSV 파싱/직렬화 (가져오기·내보내기)
// 헤더: word,phonetic,meaning,example (UTF-8)

import { getByIndex, addMany } from './db.js';

const HEADER = ['word', 'phonetic', 'meaning', 'example'];

export function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM 제거
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = []; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

export function rowsToCards(rows, deckId) {
  if (rows.length === 0) return [];
  const cards = [];
  const now = Date.now();
  let start = 0;
  const first = rows[0].map((s) => s.trim().toLowerCase());
  if (first[0] === 'word') start = 1;
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    const word = (r[0] || '').trim();
    if (!word) continue;
    cards.push({
      deckId,
      word,
      phonetic: (r[1] || '').trim(),
      meaning: (r[2] || '').trim(),
      example: (r[3] || '').trim(),
      addedAt: now + i,
    });
  }
  return cards;
}

export async function importCSV(text, deckId) {
  const cards = rowsToCards(parseCSV(text), deckId);
  const seen = new Set();
  const unique = [];
  let dupInFile = 0;
  for (const c of cards) {
    if (seen.has(c.word)) { dupInFile++; continue; }
    seen.add(c.word);
    unique.push(c);
  }
  // 덱 내 기존 중복은 byDeckWord unique 인덱스가 addMany에서 자동 스킵
  const { addedWords, skipped } = await addMany('cards', unique);
  return { added: addedWords.length, skipped: skipped + dupInFile };
}

function escapeField(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export async function exportCSV(deckId) {
  const cards = await getByIndex('cards', 'byDeck', IDBKeyRange.only(deckId));
  const lines = [HEADER.join(',')];
  for (const c of cards) {
    lines.push(HEADER.map((h) => escapeField(c[h])).join(','));
  }
  return lines.join('\n');
}

export async function downloadCSV(deckId, filename = 'vocab-backup.csv') {
  const csv = await exportCSV(deckId);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
