# 영어 단어장 (PersonalDailyEnglishVocabulary)

개인용 영어 단어 능동 학습 PWA. **CSV 가져오기 → 플래시카드 복습 → SM-2 간격반복**.

빌드 없는 PWA(순수 HTML/CSS/JS, IndexedDB, 오프라인). 안드로이드 Chrome 대상.

**라이브:** https://mymik98.github.io/PersonalDailyEnglishVocabulary/

## 기능
- **CSV 가져오기/내보내기** — 주 입력 경로. 재import 시 단어 기준 중복은 건너뛰고 기존 학습 진행 보존.
- **플래시카드 복습** — 앞=단어, 탭하면 발음기호·뜻·예문 공개. 자가채점(모름/애매/알음/쉬움) → SM-2로 다음 복습일 계산.
- **새 카드 점진 투입** — 하루 N개 제한(기본 20, 설정에서 조절). 대량 import해도 한꺼번에 쏟아지지 않음.
- **TTS 발음 재생** — Web Speech API로 단어·예문 음성.
- **매일 복습 알림** — 최선노력형(기기 지원 시 예약, 미지원이면 앱 열 때 밀린 개수 배지/배너).
- **학습 통계** — 오늘 복습 수, 연속 학습일, 아는 단어 수, 전체 단어 수.
- **오늘 복습한 단어 복사** — `word1, word2, ...` 형식으로 클립보드 복사.

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
- `sample.csv`로 바로 테스트 가능.

## 로컬 실행
ES 모듈·IndexedDB 때문에 `file://`이 아닌 로컬 서버로 연다.

```bash
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 파일 구조
```
index.html        화면 골격 + 하단 탭 네비
manifest.json     PWA 매니페스트
sw.js             서비스워커(오프라인 캐시)
css/styles.css    라이트/다크 자동 테마
js/
  app.js          진입점: 라우팅·이벤트·SW 등록
  db.js           IndexedDB 래퍼
  srs.js          SM-2 알고리즘 + 날짜 헬퍼
  csv.js          CSV 파싱/직렬화
  review.js       복습 큐·플래시카드·채점
  stats.js        일일 기록·streak·통계·복사
  settings.js     설정 저장/로드
  tts.js          Web Speech API 발음
  notify.js       알림(최선노력형)
icons/            앱 아이콘(192/512)
sample.csv        테스트용 단어 5개
```

## 데이터 모델
- **cards** (keyPath: `word`): `word, phonetic, meaning, example` + SRS 메타(`ease, interval, repetitions, dueDate, lastReviewed, addedAt`).
- **meta** (keyPath: `key`): 설정, 일일 기록, streak.

## 알려진 제약
- **알림 정시 보장 불가** — Notification Trigger API는 실험적. 미지원 기기에선 배지/배너로 대체(푸시 서버 없음).
- **iOS 미대상** — TTS·알림·설치 제약으로 v1은 안드로이드 Chrome 전용.
- **백업 수동** — 데이터는 기기 IndexedDB에만 저장. 기기 변경/캐시 삭제 시 사라지므로 **CSV 내보내기로 백업**.

## 향후 확장 여지
- 사전 API로 빈 발음기호·뜻·예문 자동 채움
- 객관식 복습 모드
