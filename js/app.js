// app.js — 진입점: DB 초기화, 화면 라우팅, 이벤트 연결, SW 등록

import { openDB, getAll, del } from './db.js';
import { importCSV, downloadCSV } from './csv.js';
import { startReviewUI, dueCount } from './review.js';
import { getStats, copyReviewedWords } from './stats.js';
import { getSettings, saveSettings } from './settings.js';
import { requestNotifyPermission, scheduleDailyNotification, applyBadge } from './notify.js';

const screens = ['review', 'cards', 'stats', 'settings'];

function show(name) {
  screens.forEach((s) => {
    document.getElementById(`screen-${s}`).hidden = s !== name;
    document.querySelector(`[data-nav="${s}"]`)?.classList.toggle('active', s === name);
  });
  if (name === 'review') renderReview();
  if (name === 'cards') renderCards();
  if (name === 'stats') renderStats();
  if (name === 'settings') renderSettings();
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

async function renderReview() {
  const root = document.getElementById('review-root');
  root.innerHTML = '<p class="muted">불러오는 중…</p>';
  await startReviewUI(root, () => { updateBanner(); });
}

async function renderCards() {
  const list = document.getElementById('cards-list');
  const cards = await getAll('cards');
  document.getElementById('cards-count').textContent = `총 ${cards.length}개`;
  if (cards.length === 0) {
    list.innerHTML = '<p class="muted">아직 카드가 없습니다. CSV를 가져오세요.</p>';
    return;
  }
  cards.sort((a, b) => a.word.localeCompare(b.word));
  list.innerHTML = cards.map((c) => `
    <div class="card-row">
      <div class="cr-main">
        <span class="cr-word">${esc(c.word)}</span>
        <span class="cr-meaning">${esc(c.meaning)}</span>
      </div>
      <div class="cr-meta">
        <span>${c.dueDate ? `복습일 ${c.dueDate}` : '미시작'}</span>
        <button type="button" class="cr-del" data-word="${esc(c.word)}">삭제</button>
      </div>
    </div>`).join('');
  list.querySelectorAll('.cr-del').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await del('cards', btn.dataset.word);
      renderCards();
    });
  });
}

async function renderStats() {
  const s = await getStats();
  document.getElementById('stat-reviewed').textContent = s.reviewedToday;
  document.getElementById('stat-streak').textContent = s.streak;
  document.getElementById('stat-known').textContent = s.knownCount;
  document.getElementById('stat-total').textContent = s.totalCount;
  document.getElementById('copy-words').disabled = s.reviewedWords.length === 0;
}

async function renderSettings() {
  const s = await getSettings();
  document.getElementById('set-newPerDay').value = s.newPerDay;
  document.getElementById('set-notifyTime').value = s.notifyTime;
}

async function updateBanner() {
  const n = await applyBadge();
  const banner = document.getElementById('banner');
  if (n > 0) {
    banner.textContent = `오늘 복습할 단어 ${n}개가 밀려 있어요.`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}

function wireEvents() {
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => show(btn.dataset.nav));
  });

  const fileInput = document.getElementById('csv-file');
  document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const { added, skipped } = await importCSV(text);
      toast(`추가 ${added}개, 건너뜀 ${skipped}개`);
      renderCards();
      updateBanner();
    } catch (e) {
      toast('가져오기 실패: ' + e.message);
    }
    fileInput.value = '';
  });

  document.getElementById('btn-export').addEventListener('click', async () => {
    await downloadCSV();
  });

  document.getElementById('copy-words').addEventListener('click', async () => {
    try {
      const { count } = await copyReviewedWords();
      toast(`${count}개 단어를 복사했어요.`);
    } catch {
      toast('복사 실패(클립보드 권한 확인).');
    }
  });

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const newPerDay = document.getElementById('set-newPerDay').value;
    const notifyTime = document.getElementById('set-notifyTime').value;
    await saveSettings({ newPerDay, notifyTime });
    await requestNotifyPermission();
    const scheduled = await scheduleDailyNotification();
    toast(scheduled ? '저장됨(알림 예약 완료)' : '저장됨(알림 미지원 → 배지로 대체)');
  });
}

async function init() {
  await openDB();
  wireEvents();
  await updateBanner();
  show('review');

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (e) {
      console.warn('SW 등록 실패:', e);
    }
  }
}

init();
