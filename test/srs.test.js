// srs.js 날짜 헬퍼 단위 테스트 (순수 함수)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayStr, addDays, daysBetween } from '../js/srs.js';

test('todayStr: YYYY-MM-DD 포맷, 0 패딩', () => {
  assert.equal(todayStr(new Date(2026, 5, 16)), '2026-06-16');
  assert.equal(todayStr(new Date(2026, 0, 5)), '2026-01-05');
});

test('addDays: 월/연 경계 처리', () => {
  assert.equal(addDays('2026-06-30', 1), '2026-07-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addDays('2026-06-16', 0), '2026-06-16');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01'); // 비윤년
});

test('daysBetween: 부호 있는 일수 차이', () => {
  assert.equal(daysBetween('2026-06-16', '2026-06-15'), 1);
  assert.equal(daysBetween('2026-06-15', '2026-06-16'), -1);
  assert.equal(daysBetween('2026-07-01', '2026-06-30'), 1);
  assert.equal(daysBetween('2026-06-16', '2026-06-16'), 0);
  assert.equal(daysBetween('2027-01-01', '2026-01-01'), 365);
});
