# 진행 기록

## 리팩토링: 홈 중심 + CSV 단어장 + 랜덤 학습
플랜: `~/.claude/plans/replicated-beaming-honey.md`

### Phase A — 데이터 모델 + 마이그레이션 (완료)
- `js/db.js`: DB_VERSION 1→2. `cards` keyPath `word`→`id`(autoIncrement), 인덱스 `byDeck`/`byDeckWord`(unique), 기존 `byDueDate`/`byAddedAt` 제거. 신규 `decks` 스토어. `migrateV1toV2`로 기존 카드를 "기본" 덱으로 이전(SRS 필드 폐기), `meta.study` 시드. 신규 설치 경로도 기본 덱 생성.
- `js/decks.js` (신규): `listDecks/createDeck/renameDeck/deleteDeck(cascade)/countDeckCards`.
- `js/settings.js`: `newPerDay`→`wordsPerDay`(레거시 lazy 매핑), `studyMode` 추가.
- 구문 체크 통과 (`node --check`).
### Phase B — 설정 내 CSV/덱 관리 (완료)
- `js/csv.js`: `rowsToCards(rows, deckId)`/`importCSV(text, deckId)`/`exportCSV(deckId)`/`downloadCSV(deckId, filename)` deckId 파라미터, SRS 필드 제거. export는 `getByIndex('cards','byDeck')`로 덱 필터.
- `index.html`: 카드 탭 CSV 툴바 제거. 설정에 "단어장(CSV) 관리"(추가/가져올 덱 select/가져오기/덱별 목록) 추가. `set-newPerDay`→`set-wordsPerDay`, 라벨 "하루 학습 단어 수".
- `js/app.js`: `decks.js` import. `renderSettings`→`renderDeckList`(덱 목록+카운트+이름변경/내보내기/삭제, import select 채움). 가져오기 핸들러 deckId 기반. 저장 핸들러 wordsPerDay.
- `css/styles.css`: `.btn.small`, `.btn.danger`, `.deck-list`, `.deck-row`, `.dr-*`.

### 브라우저 실측 검증 (Playwright, 모두 통과)
- 신규 설치: v2, cards/decks/meta, 기본 덱 id=1, study 시드 ✅
- v1→v2 마이그레이션: 구형 카드 2개 deckId=1로 이전(SRS 필드 제거, id 자동), 기본 덱, study 시드, settings는 newPerDay 유지(getSettings lazy 매핑) ✅
- 설정 UI: wordsPerDay=15 레거시 매핑, 덱 목록/카운트 렌더 ✅
- 덱 생성(고급), CSV 가져오기(기본 중복 apple 스킵 → 6개, 고급 30개) ✅
- 덱 간 동일 단어 허용: sample을 고급에도 import → apple이 덱[1,2] 양쪽 존재(unique byDeckWord 정상) ✅
- 삭제 cascade: 고급+31카드 전부 삭제, selectedDeckId=1 유지 ✅
- 이름변경: 기본→기초단어 ✅
- 알려진 콘솔 에러 1개: 복습 탭 buildQueue의 byDueDate 인덱스 없음 → Phase C/D에서 정리(의도된 상태)

### Phase C — 홈 + cycle/batch + 학습 모드 (완료, + nav 3탭 재편 + notify/sw 결합분 포함)
- `js/cycle.js` (신규): `getStudyState/selectDeck/getTodaysBatch/markBatchStudied/getCycleProgress`. 날짜별 고정 배치, 안 본 단어 우선 랜덤, 회차 완료 시 리셋. 빈 덱은 배치 미저장(단어 추가 후 재추첨).
- `js/home.js` (신규): 덱 선택 select, 카드형(플립/다음/완료), 리스트형(단어+뜻, 탭→예문, 학습완료), 오늘 학습한 단어 복사. studyMode 설정 영속.
- `index.html`: nav 4탭→3탭(홈/통계/설정), screen-review/screen-cards 제거, screen-home 추가, 통계 라벨(오늘 학습/이번 회차/단어장 단어), copy-words 버튼 제거(홈으로 이동).
- `js/app.js`: review/cards 렌더·import 제거, renderHome 라우팅, renderStats는 getCycleProgress로 known/total, copy-words 핸들러 제거, 기본 화면 home, updateBanner 텍스트 갱신.
- `css/styles.css`: nav 3그리드, grade 버튼 제거, mode-toggle/study-list/sl-row/study-done/field select.
- (결합) `js/notify.js`: `dueCount`(review.js) 제거 → `studiedToday` 기반 body/badge. 앱 로드 차단 해소.
- (결합) `sw.js`: 캐시 v2, SHELL에 decks/cycle/home.js 추가.
- 결과: review.js 완전 미사용(orphan) → Phase D 삭제 대상.

### 브라우저 실측 (Playwright, 새 출처 8767, 모두 통과)
- 신규 출처 콘솔 에러 0 (byDueDate는 8765의 SW stale 캐시였음; sw.js v2가 실사용 해결)
- 홈 init 렌더(덱 picker/모드 토글/복사) ✅
- 카드형: 플립(발음/뜻/예문/TTS)→다음 3장→완료. cycleStudiedIds=3, daily reviewedWords 기록, 복사 활성 ✅
- 리스트형: 단어+뜻, 행 탭→예문 전환, 학습완료→studied/버튼 비활성/복사 활성 ✅
- 회차: 1회차 10일(3개씩)=30개 전체 중복 없이 커버 → 완료 후 11일차 리셋 새 배치 ✅
- 배치 날짜별 고정(동일 cardIds 반복 반환) ✅
- 덱 전환: cycleStudiedIds 리셋, 이전 배치 삭제, 새 배치는 새 덱에서 ✅
- 빈 덱 후 import 시 배치 재추첨(고정 빈배치 버그 수정) ✅
- 통계: 오늘 학습/연속/이번 회차/단어장 단어 선택 덱 기준 일관 ✅

### Phase D — 잔여 dead-code 정리 (완료)
- `js/review.js` 삭제 (완전 orphan).
- `js/srs.js`: SM-2 `review()` + `GRADE` 제거, 날짜 헬퍼(todayStr/addDays/daysBetween)만 유지.
- `js/sw.js`: SHELL에서 review.js 제거.
- `js/stats.js`: orphan `recordNewIntroduced` 제거, getStats의 죽은 known/total 계산(interval≥21, getAll cards) 제거 → {reviewedToday, streak, reviewedWords}. getAll import 제거, daily에서 newIntroduced 필드 제거.
- 검증(Playwright 새 출처 8768): 런타임 에러 0, import/study/stats 정상, srs exports=[addDays,daysBetween,todayStr], stats keys 정리 확인 ✅

### Phase E — 알림 마무리 (완료)
- `index.html`: 설정 알림 안내 문구 갱신(학습/복습 알림 구분, iOS 미지원, 문구는 마지막 오픈 시점 학습 여부 기준).
- notify body/badge studiedToday 기반 로직은 Phase C에서 처리됨.
- 검증(Playwright): 에러 0, 배지 미학습 1 → 학습완료 0, scheduleDailyNotification 미지원 환경서 graceful false ✅. 설정 화면 안내 문구 렌더 확인 ✅.

## 전체 완료 요약
- 신규: js/decks.js, js/cycle.js, js/home.js, TODO.txt, progress.md
- 삭제: js/review.js
- 수정: index.html, css/styles.css, sw.js, js/{app,db,csv,settings,srs,stats,notify}.js
- 미사용 보존: 없음 (tts.js는 카드형 TTS에서 계속 사용)
