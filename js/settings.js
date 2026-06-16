// settings.js — 설정 읽기/쓰기 (meta store의 'settings' 레코드)

import { get, put } from './db.js';

const DEFAULTS = { key: 'settings', wordsPerDay: 20, notifyTime: '09:00', studyMode: 'card' };

export async function getSettings() {
  const s = await get('meta', 'settings');
  const merged = { ...DEFAULTS, ...(s || {}) };
  // 레거시 newPerDay → wordsPerDay 매핑 (구버전 설정 호환)
  if (s && s.newPerDay != null && s.wordsPerDay == null) {
    merged.wordsPerDay = s.newPerDay;
  }
  delete merged.newPerDay;
  return merged;
}

export async function saveSettings(partial) {
  const cur = await getSettings();
  const next = { ...cur, ...partial, key: 'settings' };
  next.wordsPerDay = Math.max(1, parseInt(next.wordsPerDay, 10) || 1);
  await put('meta', next);
  return next;
}
