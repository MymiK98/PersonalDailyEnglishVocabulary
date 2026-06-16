// stats.js — 일일 기록, streak, 통계, 클립보드 복사
// daily: { key: 'daily:YYYY-MM-DD', date, reviewedCount, reviewedWords: [] }
// streak: { key: 'streak', lastStudyDate, count }

import { get, put } from './db.js';
import { todayStr, addDays, daysBetween } from './srs.js';

function dailyKey(date = todayStr()) { return `daily:${date}`; }

export async function getDaily(date = todayStr()) {
  const d = await get('meta', dailyKey(date));
  return d || { key: dailyKey(date), date, reviewedCount: 0, reviewedWords: [] };
}

export async function saveDaily(daily) { await put('meta', daily); }

export async function recordReview(word, date = todayStr()) {
  const d = await getDaily(date);
  d.reviewedCount += 1;
  if (!d.reviewedWords.includes(word)) d.reviewedWords.push(word);
  await saveDaily(d);
  await bumpStreak(date);
}

async function bumpStreak(date) {
  const s = (await get('meta', 'streak')) || { key: 'streak', lastStudyDate: null, count: 0 };
  if (s.lastStudyDate === date) return;
  if (s.lastStudyDate === addDays(date, -1)) s.count += 1;
  else s.count = 1;
  s.lastStudyDate = date;
  await put('meta', s);
}

export async function getStreak(date = todayStr()) {
  const s = await get('meta', 'streak');
  if (!s || !s.lastStudyDate) return 0;
  const gap = daysBetween(date, s.lastStudyDate);
  if (gap <= 1) return s.count;
  return 0;
}

export async function getStats(date = todayStr()) {
  const daily = await getDaily(date);
  const streak = await getStreak(date);
  return {
    reviewedToday: daily.reviewedCount,
    streak,
    reviewedWords: daily.reviewedWords,
  };
}

export async function copyReviewedWords(date = todayStr()) {
  const daily = await getDaily(date);
  const text = daily.reviewedWords.join(', ');
  await navigator.clipboard.writeText(text);
  return { count: daily.reviewedWords.length, text };
}
