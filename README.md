# 영어 단어장 (PersonalDailyEnglishVocabulary)

개인용 영어 단어 학습 PWA. **CSV 단어장(덱) 단위로 매일 랜덤 N개 학습**.

빌드 없는 PWA(순수 HTML/CSS/JS, IndexedDB, 오프라인). 안드로이드 Chrome 대상.

**라이브:** https://mymik98.github.io/PersonalDailyEnglishVocabulary/

## 화면 구성 (홈 / 통계 / 설정)

### 홈 — 오늘의 학습
- **학습할 단어장 선택** — 여러 CSV 덱 중 하나를 선택. 덱을 바꾸거나 전체 단어를 한 바퀴 다 볼 때까지 유지.
- **매일 랜덤 N개** — 선택한 덱에서 아직 안 본 단어 중 무작위 N개(설정값). 중복 없이 한 회차(전체 단어)를 다 보면 회차가 리셋되어 다시 시작. 오늘의 배치는 날짜별로 고정(재접속해도 같은 단어).
- **학습 모드 2종**
  - **카드형** — 앞=단어, 탭하면 발음기호·뜻·예문·TTS 공개. 다음으로 진행, 마지막에 학습 완료.
  - **리스트형** — 단어+뜻 목록, 항목을 탭하면 예문으로 전환. 하단 "학습 완료"로 마무리.
- **오늘 학습한 단어 복사** — 그날 학습한 단어를 `word1, word2, ...` 형식으로 클립보드 복사.

### 통계
- 오늘 학습 수, 연속 학습일, 이번 회차 진행(학습한 단어 수), 단어장 단어 수(선택 덱 기준).

### 설정
- **하루 학습 단어 수** / **알림 시각**.
- **단어장(CSV) 관리** — 덱 추가, 덱별 CSV 가져오기/내보내기, 이름 변경, 삭제.

## 기능 요약
- **CSV 덱 관리** — 단어장을 여러 개 만들어 주제별로 분리. 같은 단어가 서로 다른 덱에 들어갈 수 있음. 같은 덱 안에서는 단어 기준 중복은 가져오기 시 자동 건너뜀.
- **랜덤 회차 학습** — 간격반복(SRS) 대신 단순 랜덤 순회. 매일 N개씩, 한 회차에 전체를 중복 없이 커버.
- **TTS 발음 재생** — Web Speech API로 단어·예문 음성(카드형).
- **학습/복습 알림** — 최선노력형. 설정 시각에 그날 학습 안 했으면 학습 알림, 했으면 복습 알림.

## 폰에 설치 (안드로이드 Chrome)
1. Chrome으로 위 라이브 주소를 연다.
2. ⋮ 메뉴 → **앱 설치 / 홈 화면에 추가**.
3. 홈 아이콘으로 실행 → 주소창 없는 전체화면이면 설치 성공.
4. 한 번 정상 실행 후에는 오프라인에서도 동작.

## 단어 CSV 형식
헤더 행 포함, UTF-8 인코딩:

```csv
word,phonetic,meaning,example
apple,/ˈæp.əl/,사과,I ate an apple for breakfast.
diligent,/ˈdɪl.ɪ.dʒənt/,근면한,"She is a diligent student, always on time."
```

- 열: `word`(영단어), `phonetic`(발음기호), `meaning`(뜻), `example`(예문).
- 예문에 쉼표가 있으면 큰따옴표로 감싼다.
- `sample.csv`(5개), `example-words.csv`(30개)로 바로 테스트 가능.

## 로컬 실행
ES 모듈·IndexedDB 때문에 `file://`이 아닌 로컬 서버로 연다.

```bash
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 파일 구조
```
index.html        화면 골격 + 하단 탭 네비(홈/통계/설정)
manifest.json     PWA 매니페스트
sw.js             서비스워커(오프라인 캐시)
css/styles.css    라이트/다크 자동 테마
js/
  app.js          진입점: 라우팅·이벤트·SW 등록
  db.js           IndexedDB 래퍼 + v1→v2 마이그레이션
  decks.js        단어장(덱) CRUD + 카드 cascade
  cycle.js        오늘의 배치 선정 + 회차(순회) 관리
  home.js         홈 화면: 덱 선택·학습(카드형/리스트형)·복사
  csv.js          CSV 파싱/직렬화(덱별)
  stats.js        일일 기록·streak·통계·복사
  settings.js     설정 저장/로드
  tts.js          Web Speech API 발음
  notify.js       알림(최선노력형)
  srs.js          날짜 헬퍼(todayStr/addDays/daysBetween)
icons/            앱 아이콘(192/512)
sample.csv        테스트용 단어 5개
example-words.csv 테스트용 단어 30개
```

## 데이터 모델 (IndexedDB v2)
- **cards** (keyPath: `id` 자동증가): `id, deckId, word, phonetic, meaning, example, addedAt`.
  - 인덱스: `byDeck`(deckId), `byDeckWord`(`[deckId, word]`, unique — 덱 내 단어 중복 금지·덱 간 동일 단어 허용).
- **decks** (keyPath: `id` 자동증가): `id, name, createdAt`.
- **meta** (keyPath: `key`):
  - `settings` — `wordsPerDay, notifyTime, studyMode`.
  - `study` — `selectedDeckId, cycleStudiedIds[], cycleStartedAt`(현재 회차 진행).
  - `batch:YYYY-MM-DD` — `date, deckId, cardIds[], studied`(날짜별 고정 배치).
  - `daily:YYYY-MM-DD`, `streak` — 일일 기록·연속 학습일.

> v1(단일 풀 + SM-2)에서 업그레이드 시, 기존 단어는 "기본" 덱으로 자동 이전되고 SRS 메타는 폐기된다.

## 알려진 제약
- **알림 정시 보장 불가** — Notification Trigger API는 실험적(Chromium 계열만, iOS 미지원). 미지원 기기에선 배지/배너로 대체(푸시 서버 없음). 알림 문구는 앱을 마지막으로 연 시점의 학습 여부 기준.
- **iOS 미대상** — TTS·알림·설치 제약으로 안드로이드 Chrome 전용.
- **백업 수동** — 데이터는 기기 IndexedDB에만 저장. 기기 변경/캐시 삭제 시 사라지므로 **CSV 내보내기로 백업**.

## 향후 확장 여지
- 사전 API로 빈 발음기호·뜻·예문 자동 채움
- 객관식 학습 모드
