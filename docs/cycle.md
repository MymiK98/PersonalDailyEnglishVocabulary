# cycle.js — 배치/회차 엔진

선택한 덱에서 **매일 랜덤 N개**를 뽑고, **중복 없이 한 회차(전체 단어)를 순회**한 뒤 리셋하는 로직.

## 개념
- **배치(batch)**: 그날 학습할 단어 묶음. `meta` 키 `batch:YYYY-MM-DD`에 저장되어 **날짜별로 고정**(재접속해도 동일).
- **회차(cycle)**: 선택 덱의 전체 단어를 중복 없이 한 바퀴 도는 단위. 진행 상황은 `study.cycleStudiedIds`(학습한 카드 id 목록).
- **리셋**: 안 본 단어가 0이 되면(전체 학습 완료) `cycleStudiedIds`를 비우고 새 회차 시작.

## 상태 (`meta.study`)
```js
{ key: 'study', selectedDeckId, cycleStudiedIds: [], cycleStartedAt }
```

## API

| 함수 | 설명 |
|---|---|
| `getStudyState()` | 현재 학습 상태. 없으면 기본값(selectedDeckId=null) 반환 |
| `selectDeck(deckId)` | 학습할 덱 변경 → **회차 리셋 + 오늘 배치 삭제**(새 덱으로 재추첨) |
| `getTodaysBatch(today?)` | 오늘 배치 반환. 고정 배치 있으면 hydrate(삭제된 id 필터), 없으면 새로 추첨 |
| `markBatchStudied(today?)` | 오늘 배치를 학습 완료 처리 → 회차 진행 갱신 + `stats.recordReview` 단어별 호출 |
| `getCycleProgress()` | `{ studied, total }` — 통계용. 삭제된 카드 id는 제외 |

## 추첨 알고리즘 (`pickNewBatch`)
1. `N = max(1, settings.wordsPerDay)` (0/음수 방어)
2. 선택 덱 카드 중 `cycleStudiedIds`에 없는 것 = **unstudied**
3. unstudied가 비면 → **회차 완료**: `cycleStudiedIds` 리셋 후 전체를 대상으로
4. `unstudied`를 Fisher–Yates 셔플 → 앞에서 N개
5. `batch:오늘` 키에 저장하고 반환

## 엣지 처리
- **빈 덱**: 카드 0개면 배치를 저장하지 않고 빈 결과 반환 → 이후 단어 추가 시 재추첨(고정된 빈 배치로 막히지 않음).
- **삭제된 카드**: `getTodaysBatch` hydrate 시 현재 덱에 없는 id는 필터. `getCycleProgress`도 존재하는 id만 카운트.
- **덱 변경**: `selectDeck`이 회차 리셋 + 오늘 배치 삭제.

## 완료 처리 의미 (배치 단위)
카드형·리스트형 모두 **배치 단위**로 학습 완료를 기록:
- 카드형: 마지막 카드 통과(완료 화면) 시 `markBatchStudied()`
- 리스트형: 하단 "학습 완료" 버튼 클릭 시 `markBatchStudied()`

`markBatchStudied`는 idempotent(이미 studied면 false 반환, 재호출 무해). streak는 `stats`의 날짜 가드로 그날 1회만 증가.

## 의존
- `db.js`: get/put/del/getByIndex
- `srs.js`: todayStr
- `settings.js`: getSettings (wordsPerDay)
- `stats.js`: recordReview
