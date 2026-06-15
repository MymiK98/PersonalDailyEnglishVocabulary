// settings.js — 설정 읽기/쓰기 (meta store의 'settings' 레코드)

import { get, put } from './db.js';

const DEFAULTS = { key: 'settings', newPerDay: 20, notifyTime: '09:00' };

export async function getSettings() {
  const s = await get('meta', 'settings');
  return { ...DEFAULTS, ...(s || {}) };
}

export async function saveSettings(partial) {
  const cur = await getSettings();
  const next = { ...cur, ...partial, key: 'settings' };
  next.newPerDay = Math.max(0, parseInt(next.newPerDay, 10) || 0);
  await put('meta', next);
  return next;
}
