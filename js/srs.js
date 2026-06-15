// srs.js — SM-2 간격반복 알고리즘 + 날짜 헬퍼 (순수 함수)

export const GRADE = { AGAIN: 0, HARD: 3, GOOD: 4, EASY: 5 };

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return todayStr(dt);
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((da - db) / 86400000);
}

// SM-2 복습 계산. 갱신된 SRS 필드 객체 반환(입력 불변)
export function review(card, q, today = todayStr()) {
  let ease = card.ease ?? 2.5;
  let interval = card.interval ?? 0;
  let repetitions = card.repetitions ?? 0;

  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease);
    repetitions += 1;
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  return {
    ease: Math.round(ease * 1000) / 1000,
    interval,
    repetitions,
    dueDate: addDays(today, interval),
    lastReviewed: today,
  };
}
