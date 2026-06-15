// review.js — 복습 큐 구성, 카드 뒤집기, 자가채점, 새 카드 점진 투입

import { getByIndex, put, get } from './db.js';
import { review, todayStr, GRADE } from './srs.js';
import { getSettings } from './settings.js';
import { getDaily, recordNewIntroduced, recordReview } from './stats.js';
import { speak, ttsSupported } from './tts.js';

export async function buildQueue(today = todayStr()) {
  const settings = await getSettings();
  const daily = await getDaily(today);

  const dueRange = IDBKeyRange.upperBound(today);
  const due = await getByIndex('cards', 'byDueDate', dueRange);

  const remaining = Math.max(0, settings.newPerDay - daily.newIntroduced);
  let introduced = [];
  if (remaining > 0) {
    const newCards = (await getByIndex('cards', 'byAddedAt'))
      .filter((c) => c.dueDate === null)
      .sort((a, b) => a.addedAt - b.addedAt)
      .slice(0, remaining);
    for (const c of newCards) {
      c.dueDate = today;
      await put('cards', c);
    }
    introduced = newCards;
    if (newCards.length > 0) await recordNewIntroduced(newCards.length, today);
  }

  const map = new Map();
  for (const c of [...introduced, ...due]) map.set(c.word, c);
  return Array.from(map.values());
}

export async function dueCount(today = todayStr()) {
  const dueRange = IDBKeyRange.upperBound(today);
  const due = await getByIndex('cards', 'byDueDate', dueRange);
  return due.length;
}

export async function gradeCard(word, q, today = todayStr()) {
  const card = await get('cards', word);
  if (!card) return;
  const updated = review(card, q, today);
  await put('cards', { ...card, ...updated });
  await recordReview(word, today);
}

// root 안에 복습 UI를 렌더. onDone은 큐 소진 시 콜백.
export async function startReviewUI(root, onDone) {
  const queue = await buildQueue();
  let idx = 0;

  function render() {
    if (idx >= queue.length) {
      root.innerHTML = `<div class="card-empty">
        <p>🎉 오늘 복습 완료!</p>
        <p class="muted">복습한 카드: ${idx}개</p>
      </div>`;
      if (onDone) onDone();
      return;
    }
    const card = queue[idx];
    root.innerHTML = `
      <div class="review-progress">${idx + 1} / ${queue.length}</div>
      <div class="flashcard" id="flashcard">
        <div class="fc-word">${esc(card.word)}</div>
        <div class="fc-back" id="fcBack" hidden>
          ${card.phonetic ? `<div class="fc-phonetic">${esc(card.phonetic)}</div>` : ''}
          <div class="fc-meaning">${esc(card.meaning)}</div>
          ${card.example ? `<div class="fc-example">${esc(card.example)}</div>` : ''}
          ${ttsSupported() ? `
            <div class="fc-tts">
              <button type="button" data-tts="word">🔊 단어</button>
              ${card.example ? `<button type="button" data-tts="example">🔊 예문</button>` : ''}
            </div>` : ''}
        </div>
        <div class="fc-hint" id="fcHint">탭하면 뜻 보기</div>
      </div>
      <div class="grade-buttons" id="gradeButtons" hidden>
        <button type="button" class="grade again" data-q="${GRADE.AGAIN}">모름</button>
        <button type="button" class="grade hard"  data-q="${GRADE.HARD}">애매</button>
        <button type="button" class="grade good"  data-q="${GRADE.GOOD}">알음</button>
        <button type="button" class="grade easy"  data-q="${GRADE.EASY}">쉬움</button>
      </div>`;

    const flashcard = root.querySelector('#flashcard');
    const back = root.querySelector('#fcBack');
    const hint = root.querySelector('#fcHint');
    const gradeButtons = root.querySelector('#gradeButtons');

    flashcard.addEventListener('click', (e) => {
      if (e.target.closest('[data-tts]')) return;
      if (back.hidden) {
        back.hidden = false;
        hint.hidden = true;
        gradeButtons.hidden = false;
      }
    });

    root.querySelectorAll('[data-tts]').forEach((btn) => {
      btn.addEventListener('click', () => {
        speak(btn.dataset.tts === 'example' ? card.example : card.word);
      });
    });

    gradeButtons.querySelectorAll('[data-q]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        gradeButtons.querySelectorAll('button').forEach((b) => (b.disabled = true));
        await gradeCard(card.word, Number(btn.dataset.q));
        idx++;
        render();
      });
    });
  }

  render();
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}
