// app.js — 진입점: DB 초기화, 화면 라우팅, 이벤트 연결, SW 등록

import { openDB } from './db.js';
import { importCSV, downloadCSV } from './csv.js';
import { listDecks, createDeck, renameDeck, deleteDeck, countDeckCards } from './decks.js';
import { renderHome } from './home.js';
import { getCycleProgress } from './cycle.js';
import { getStats } from './stats.js';
import { getSettings, saveSettings } from './settings.js';
import { requestNotifyPermission, scheduleDailyNotification, applyBadge } from './notify.js';

const screens = ['home', 'stats', 'settings'];

function show(name) {
  screens.forEach((s) => {
    document.getElementById(`screen-${s}`).hidden = s !== name;
    document.querySelector(`[data-nav="${s}"]`)?.classList.toggle('active', s === name);
  });
  if (name === 'home') renderHome(document.getElementById('home-root'), toast);
  if (name === 'stats') renderStats();
  if (name === 'settings') renderSettings();
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

async function renderStats() {
  const s = await getStats();
  const cycle = await getCycleProgress();
  document.getElementById('stat-reviewed').textContent = s.reviewedToday;
  document.getElementById('stat-streak').textContent = s.streak;
  document.getElementById('stat-known').textContent = cycle.studied;
  document.getElementById('stat-total').textContent = cycle.total;
}

async function renderSettings() {
  const s = await getSettings();
  document.getElementById('set-wordsPerDay').value = s.wordsPerDay;
  document.getElementById('set-notifyTime').value = s.notifyTime;
  await renderDeckList();
}

async function renderDeckList() {
  const decks = await listDecks();
  const sel = document.getElementById('import-deck');
  sel.innerHTML = decks.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join('');

  const list = document.getElementById('deck-list');
  if (decks.length === 0) {
    list.innerHTML = '<p class="muted">단어장이 없습니다. 추가하세요.</p>';
    return;
  }
  const rows = await Promise.all(decks.map(async (d) => {
    const n = await countDeckCards(d.id);
    return `<div class="deck-row" data-id="${d.id}">
      <div class="dr-main"><span class="dr-name">${esc(d.name)}</span><span class="muted small">${n}개</span></div>
      <div class="dr-actions">
        <button type="button" class="dr-rename btn small">이름변경</button>
        <button type="button" class="dr-export btn small">내보내기</button>
        <button type="button" class="dr-del btn small danger">삭제</button>
      </div>
    </div>`;
  }));
  list.innerHTML = rows.join('');

  list.querySelectorAll('.deck-row').forEach((row) => {
    const id = Number(row.dataset.id);
    row.querySelector('.dr-rename').addEventListener('click', async () => {
      const name = prompt('새 단어장 이름');
      if (name == null) return;
      await renameDeck(id, name);
      renderDeckList();
    });
    row.querySelector('.dr-export').addEventListener('click', async () => {
      const deck = (await listDecks()).find((x) => x.id === id);
      await downloadCSV(id, `${deck ? deck.name : 'vocab'}.csv`);
    });
    row.querySelector('.dr-del').addEventListener('click', async () => {
      if (!confirm('이 단어장과 모든 단어를 삭제할까요?')) return;
      await deleteDeck(id);
      renderDeckList();
    });
  });
}

async function updateBanner() {
  const n = await applyBadge();
  const banner = document.getElementById('banner');
  if (n > 0) {
    banner.textContent = '오늘의 단어를 아직 학습하지 않았어요.';
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

  document.getElementById('btn-new-deck').addEventListener('click', async () => {
    const input = document.getElementById('new-deck-name');
    const name = input.value.trim();
    if (!name) { toast('단어장 이름을 입력하세요.'); return; }
    await createDeck(name);
    input.value = '';
    renderDeckList();
    toast('단어장 추가됨');
  });

  const fileInput = document.getElementById('csv-file');
  document.getElementById('btn-import').addEventListener('click', () => {
    if (!document.getElementById('import-deck').value) { toast('단어장을 먼저 추가하세요.'); return; }
    fileInput.click();
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const deckId = Number(document.getElementById('import-deck').value);
    const text = await file.text();
    try {
      const { added, skipped } = await importCSV(text, deckId);
      toast(`추가 ${added}개, 건너뜀 ${skipped}개`);
      renderDeckList();
    } catch (e) {
      toast('가져오기 실패: ' + e.message);
    }
    fileInput.value = '';
  });

  document.getElementById('btn-save-settings').addEventListener('click', async () => {
    const wordsPerDay = document.getElementById('set-wordsPerDay').value;
    const notifyTime = document.getElementById('set-notifyTime').value;
    await saveSettings({ wordsPerDay, notifyTime });
    await requestNotifyPermission();
    const scheduled = await scheduleDailyNotification();
    toast(scheduled ? '저장됨(알림 예약 완료)' : '저장됨(알림 미지원 → 배지로 대체)');
  });
}

async function init() {
  await openDB();
  wireEvents();
  await updateBanner();
  show('home');

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (e) {
      console.warn('SW 등록 실패:', e);
    }
  }
}

init();
