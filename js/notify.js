// notify.js — 매일 학습/복습 알림(최선노력형)
// 1) Notification Trigger API 시도(실험적, 대개 미지원)
// 2) 미지원/실패 시: 앱 배지 + 인앱 배너로 대체. 푸시 서버 없음.
// 본문은 예약 시점의 "오늘 학습 여부" 기준(발화 순간 상태 아님 — 푸시 서버 없음 한계).

import { get } from './db.js';
import { todayStr } from './srs.js';
import { getSettings } from './settings.js';

// 오늘 배치를 학습 완료했는지
async function studiedToday() {
  const batch = await get('meta', `batch:${todayStr()}`);
  return !!(batch && batch.studied);
}

export async function requestNotifyPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try { return await Notification.requestPermission(); }
  catch { return 'denied'; }
}

export async function scheduleDailyNotification() {
  if (!('serviceWorker' in navigator)) return false;
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  if (typeof window.TimestampTrigger === 'undefined') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const settings = await getSettings();
    const [h, m] = (settings.notifyTime || '09:00').split(':').map(Number);
    const when = new Date();
    when.setHours(h, m, 0, 0);
    if (when.getTime() <= Date.now()) when.setDate(when.getDate() + 1);
    const studied = await studiedToday();
    await reg.showNotification('영어 단어장', {
      tag: 'daily-review',
      body: studied ? '오늘 학습 완료! 복습해 볼까요?' : '오늘의 단어를 학습할 시간이에요.',
      showTrigger: new window.TimestampTrigger(when.getTime()),
      badge: './icons/icon-192.png',
      icon: './icons/icon-192.png',
    });
    return true;
  } catch (e) {
    console.warn('알림 예약 실패:', e);
    return false;
  }
}

// 미학습이면 배지 1, 학습 완료면 해제
export async function applyBadge() {
  const studied = await studiedToday();
  const n = studied ? 0 : 1;
  if ('setAppBadge' in navigator) {
    try {
      if (n > 0) await navigator.setAppBadge(n);
      else await navigator.clearAppBadge();
    } catch { /* 무시 */ }
  }
  return n;
}
