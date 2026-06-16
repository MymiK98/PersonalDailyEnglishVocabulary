# home.js — 홈 화면 / 학습 UI

`#home-root`에 홈 전체(덱 선택 · 모드 토글 · 학습 영역 · 복사 버튼)를 렌더. 정적 컨트롤도 매 렌더마다 새로 만들어 리스너 중복을 피함.

## 진입점
```js
renderHome(root, toast)
```
- `root`: `#home-root` 엘리먼트
- `toast`: app.js의 토스트 함수(복사·완료 알림용)

## 렌더 흐름
1. `decks.listDecks()` — 덱 없으면 "설정에서 CSV 가져오세요" 안내 후 종료
2. `cycle.getStudyState()` — 선택 덱. null이면 첫 덱으로 `selectDeck` 동기화
3. `settings.studyMode` — `card`(기본) / `list`
4. 골격 렌더: 덱 `<select>` + 모드 토글 + `#study-root` + "오늘 학습한 단어 복사"
5. `cycle.getTodaysBatch()` — 비었으면 "학습할 단어가 없습니다", 아니면 모드별 렌더

## 이벤트
- **덱 select change** → `cycle.selectDeck(id)` → `renderHome` 재호출
- **모드 토글** → `settings.saveSettings({ studyMode })` → 재렌더(영속)
- **복사 버튼** → `stats.copyReviewedWords()` (오늘 배치 학습 완료 시 활성)

## 카드형 (`renderCardMode`)
- 플래시카드: 앞=단어. 카드 탭 → 뒷면(발음기호·뜻·예문·TTS 버튼) 공개.
- "다음"으로 진행, 마지막은 "학습 완료". 끝 화면 도달 시 `cycle.markBatchStudied()` → 복사 버튼 활성.
- TTS 버튼은 `tts.ttsSupported()`일 때만 노출, 클릭 시 `tts.speak`. 카드 탭 핸들러는 TTS 버튼 클릭을 무시(이벤트 위임 가드).

## 리스트형 (`renderListMode`)
- 각 행: 단어 + 뜻. **행 탭 → 뜻↔예문 전환**(예문 표시 시 뜻 숨김).
- 하단 "학습 완료" 버튼 → `cycle.markBatchStudied()` → 버튼 비활성("학습 완료됨") + 복사 활성.
- 이미 학습 완료된 배치면 버튼이 처음부터 비활성.

## 비고
- HTML 삽입 값은 모듈 내 `esc()`로 이스케이프(단어/뜻/예문에 특수문자 대비).
- 학습 완료는 **배치 단위**(개별 카드 추적 안 함). 회차 진행은 `cycle.js`가 관리.

## 의존
- `decks.js`, `cycle.js`, `settings.js`, `stats.js`, `tts.js`
