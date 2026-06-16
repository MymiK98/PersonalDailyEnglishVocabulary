// home.js — 홈 화면: 덱 선택, 학습(카드형/리스트형), 오늘 학습한 단어 복사

import { listDecks } from './decks.js';
import { getStudyState, selectDeck, getTodaysBatch, markBatchStudied } from './cycle.js';
import { getSettings, saveSettings } from './settings.js';
import { copyReviewedWords } from './stats.js';
import { speak, ttsSupported } from './tts.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function renderHome(root, toast) {
  const decks = await listDecks();
  if (decks.length === 0) {
    root.innerHTML = '<p class="muted">단어장이 없습니다. 설정에서 CSV를 가져오세요.</p>';
    return;
  }

  let study = await getStudyState();
  const selectedId = study.selectedDeckId ?? decks[0].id;
  // 선택 덱이 없으면(첫 진입/덱 삭제 후) 첫 덱으로 동기화
  if (study.selectedDeckId == null) {
    await selectDeck(selectedId);
    study = await getStudyState();
  }

  const settings = await getSettings();
  const mode = settings.studyMode === 'list' ? 'list' : 'card';

  root.innerHTML = `
    <label class="field">
      <span>학습할 단어장</span>
      <select id="home-deck">
        ${decks.map((d) => `<option value="${d.id}" ${d.id === selectedId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
      </select>
    </label>
    <div class="mode-toggle">
      <button type="button" data-mode="card" class="${mode === 'card' ? 'active' : ''}">카드형</button>
      <button type="button" data-mode="list" class="${mode === 'list' ? 'active' : ''}">리스트형</button>
    </div>
    <div id="study-root"></div>
    <button type="button" id="copy-words" class="btn" disabled>오늘 학습한 단어 복사</button>
  `;

  root.querySelector('#home-deck').addEventListener('change', async (e) => {
    await selectDeck(Number(e.target.value));
    renderHome(root, toast);
  });
  root.querySelectorAll('.mode-toggle button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await saveSettings({ studyMode: btn.dataset.mode });
      renderHome(root, toast);
    });
  });

  const batch = await getTodaysBatch();
  const copyBtn = root.querySelector('#copy-words');
  copyBtn.disabled = !batch.studied;
  copyBtn.addEventListener('click', async () => {
    try {
      const { count } = await copyReviewedWords();
      toast(`${count}개 단어를 복사했어요.`);
    } catch {
      toast('복사 실패(클립보드 권한 확인).');
    }
  });

  const studyRoot = root.querySelector('#study-root');
  if (batch.empty || batch.cards.length === 0) {
    studyRoot.innerHTML = '<p class="muted">학습할 단어가 없습니다. 설정에서 단어를 추가하세요.</p>';
    return;
  }
  if (mode === 'card') renderCardMode(studyRoot, batch, copyBtn, toast);
  else renderListMode(studyRoot, batch, copyBtn, toast);
}

// 카드형: 플래시카드 — 단어 → 탭하면 발음/뜻/예문/TTS, 다음으로 진행
function renderCardMode(studyRoot, batch, copyBtn, toast) {
  const cards = batch.cards;
  let idx = 0;
  let revealed = false;

  async function finish() {
    const changed = await markBatchStudied();
    if (changed && copyBtn) copyBtn.disabled = false;
  }

  function draw() {
    if (idx >= cards.length) {
      studyRoot.innerHTML = `<div class="study-done"><p>오늘 학습 완료! (${cards.length}개)</p></div>`;
      finish();
      return;
    }
    const card = cards[idx];
    studyRoot.innerHTML = `
      <div class="review-progress">${idx + 1} / ${cards.length}</div>
      <div class="flashcard" id="flashcard">
        <div class="fc-word">${esc(card.word)}</div>
        <div class="fc-back" id="fcBack" ${revealed ? '' : 'hidden'}>
          ${card.phonetic ? `<div class="fc-phonetic">${esc(card.phonetic)}</div>` : ''}
          <div class="fc-meaning">${esc(card.meaning)}</div>
          ${card.example ? `<div class="fc-example">${esc(card.example)}</div>` : ''}
          ${ttsSupported() ? `<div class="fc-tts">
            <button type="button" class="tts-btn" data-text="${esc(card.word)}">🔊 단어</button>
            ${card.example ? `<button type="button" class="tts-btn" data-text="${esc(card.example)}">🔊 예문</button>` : ''}
          </div>` : ''}
        </div>
        <div class="fc-hint" id="fcHint">${revealed ? '' : '탭하면 뜻 보기'}</div>
      </div>
      <button type="button" id="nextBtn" class="btn primary">${idx + 1 === cards.length ? '학습 완료' : '다음'}</button>
    `;
    studyRoot.querySelector('#flashcard').addEventListener('click', (e) => {
      if (e.target.closest('.tts-btn')) return;
      revealed = true;
      studyRoot.querySelector('#fcBack').hidden = false;
      studyRoot.querySelector('#fcHint').textContent = '';
    });
    studyRoot.querySelectorAll('.tts-btn').forEach((b) => b.addEventListener('click', () => speak(b.dataset.text)));
    studyRoot.querySelector('#nextBtn').addEventListener('click', () => {
      idx += 1;
      revealed = false;
      draw();
    });
  }

  draw();
}

// 리스트형: 단어+뜻 목록, 항목 탭하면 뜻↔예문 전환
function renderListMode(studyRoot, batch, copyBtn, toast) {
  const cards = batch.cards;
  studyRoot.innerHTML = `
    <div class="study-list">
      ${cards.map((c) => `
        <div class="sl-row">
          <div class="sl-word">${esc(c.word)}</div>
          <div class="sl-meaning">${esc(c.meaning)}</div>
          <div class="sl-example" hidden>${esc(c.example || '(예문 없음)')}</div>
        </div>`).join('')}
    </div>
    <button type="button" id="doneBtn" class="btn primary" ${batch.studied ? 'disabled' : ''}>${batch.studied ? '학습 완료됨' : '학습 완료'}</button>
  `;
  studyRoot.querySelectorAll('.sl-row').forEach((row) => {
    row.addEventListener('click', () => {
      const ex = row.querySelector('.sl-example');
      const me = row.querySelector('.sl-meaning');
      const showEx = ex.hidden;
      ex.hidden = !showEx;
      me.hidden = showEx;
    });
  });
  studyRoot.querySelector('#doneBtn').addEventListener('click', async () => {
    const changed = await markBatchStudied();
    if (changed) {
      const btn = studyRoot.querySelector('#doneBtn');
      btn.disabled = true;
      btn.textContent = '학습 완료됨';
      if (copyBtn) copyBtn.disabled = false;
      toast('학습 완료!');
    }
  });
}
