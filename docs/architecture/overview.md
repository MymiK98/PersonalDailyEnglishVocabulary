# 아키텍처 개요

빌드 없는 PWA. 순수 ES 모듈 + IndexedDB. 서버/번들러 없음.

## 레이어

```
UI/라우팅      app.js (진입점, 탭 라우팅, 이벤트 배선, SW 등록)
  ├─ home.js      홈 화면 렌더 + 학습 UI(카드형/리스트형)
  └─ (통계·설정 렌더는 app.js 내)

도메인 로직    cycle.js   배치 선정 + 회차(순회) 관리
              decks.js   단어장(덱) CRUD + cascade
              stats.js   일일 기록·streak·통계
              csv.js     CSV 파싱/직렬화(덱별)
              settings.js 설정 로드/저장

유틸          srs.js   날짜 헬퍼(todayStr/addDays/daysBetween)
              tts.js   Web Speech API 발음
              notify.js 알림/배지(최선노력형)

영속          db.js    IndexedDB 래퍼 + 스키마 + 마이그레이션
```

의존 방향은 위→아래 단방향. 도메인 모듈은 `db.js` 헬퍼만 사용하고 DOM을 직접 만지지 않음(home.js 예외 — 홈 학습 UI 담당).

## 데이터 흐름 (홈 학습)

```
사용자 → home.renderHome
        → cycle.getTodaysBatch()           오늘 배치(날짜별 고정) 조회/추첨
        → (카드형/리스트형 렌더)
        → "학습 완료" → cycle.markBatchStudied()
                          → 회차 진행(cycleStudiedIds) 갱신
                          → stats.recordReview(word) × N  (daily/streak)
        → "오늘 학습한 단어 복사" → stats.copyReviewedWords()
```

## 데이터 모델 (IndexedDB `vocabPWA`, v2)

| 스토어 | keyPath | 레코드 | 인덱스 |
|---|---|---|---|
| `cards` | `id` (autoIncrement) | `id, deckId, word, phonetic, meaning, example, addedAt` | `byDeck`(deckId), `byDeckWord`(`[deckId,word]`, unique) |
| `decks` | `id` (autoIncrement) | `id, name, createdAt` | — |
| `meta` | `key` | 키별 상이(아래) | — |

`meta` 키:
- `settings` — `wordsPerDay, notifyTime, studyMode`
- `study` — `selectedDeckId, cycleStudiedIds[], cycleStartedAt` (현재 회차 진행)
- `batch:YYYY-MM-DD` — `date, deckId, cardIds[], studied` (그날 고정 배치)
- `daily:YYYY-MM-DD` — `date, reviewedCount, reviewedWords[]`
- `streak` — `lastStudyDate, count`

### 핵심 설계 결정
- **cards keyPath = `id`** (word 아님): 같은 단어가 여러 덱에 존재 가능해야 하므로 자연키 불가. `byDeckWord` unique 인덱스가 "덱 내 중복 금지 + 덱 간 동일 단어 허용"을 보장.
- **회차(cycle)**: 선택 덱 단어를 중복 없이 한 바퀴 도는 단위. `cycleStudiedIds`로 추적, 전부 학습하면 리셋.
- **배치 날짜 고정**: `batch:날짜` 키로 그날 뽑힌 단어를 저장 → 재접속해도 동일.

## 마이그레이션 (v1 → v2)
v1은 단일 풀(`cards` keyPath `word`) + SM-2 SRS였음. v2 업그레이드 시 `db.js`의 `migrateV1toV2`가:
1. 기존 카드 전체 읽기 → `cards` 스토어 삭제·재생성(id keyPath)
2. "기본" 덱 생성, 모든 기존 카드를 그 덱으로 이전(SRS 필드 폐기)
3. `study` 시드(selectedDeckId=기본)

versionchange 트랜잭션의 raw 요청만 사용(모듈 헬퍼 호출 시 데드락). 자세한 내용은 [db.md](../db.md).

## 오프라인 (sw.js)
`vocab-pwa-v2` 캐시에 셸 프리캐시(cache-first). 파일 추가/삭제 시 SHELL 목록 + 캐시 버전을 함께 갱신해야 설치된 PWA에 반영됨.

## 알려진 제약
- 알림은 실험적 TimestampTrigger 의존(Chromium 계열만, iOS 미지원). 미지원 시 배지/배너 대체. 문구는 앱 마지막 오픈 시점 기준(푸시 서버 없음).
- 데이터는 기기 IndexedDB에만 저장. 백업은 CSV 내보내기.
