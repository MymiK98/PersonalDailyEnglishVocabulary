// notify.js — 매일 복습 알림(최선노력형)
// 1) Notification Trigger API 시도(실험적, 대개 미지원)
// 2) 미지원/실패 시: 앱 배지 + 인앱 "밀린 개수" 배너로 대체. 푸시 서버 없음.

import { dueCount } from './review.js';
import { getSettings } from './settings.js';

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
    const n = await dueCount();
    await reg.showNotification('영어 단어 복습', {
      tag: 'daily-review',
      body: n > 0 ? `오늘 복습할 단어 ${n}개가 있어요.` : '오늘의 복습을 시작해 볼까요?',
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

export async function applyBadge() {
  const n = await dueCount();
  if ('setAppBadge' in navigator) {
    try {
      if (n > 0) await navigator.setAppBadge(n);
      else await navigator.clearAppBadge();
    } catch { /* 무시 */ }
  }
  return n;
}
