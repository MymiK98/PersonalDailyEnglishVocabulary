# decks.js — 단어장(덱) 관리

`decks` 스토어 CRUD + 카드 cascade. 설정 화면의 "단어장(CSV) 관리"에서 사용.

## 레코드
```js
{ id, name, createdAt }   // decks 스토어, keyPath id(autoIncrement)
```

## API

| 함수 | 설명 |
|---|---|
| `listDecks()` | 전체 덱(생성순 정렬) |
| `createDeck(name)` | 덱 생성 → 생성된 `id` 반환. 빈 이름은 "새 단어장" |
| `renameDeck(id, name)` | 이름 변경(빈 이름이면 기존 유지) |
| `deleteDeck(id)` | 덱 + **소속 카드 전부 삭제**. 선택 중이던 덱이면 `study` 초기화·오늘 배치 정리 |
| `countDeckCards(id)` | 덱 내 카드 수 |

## cascade 삭제
`deleteDeck`은 `byDeck` 인덱스로 소속 카드를 모두 찾아 개별 삭제 후 덱을 삭제. 삭제한 덱이 `study.selectedDeckId`였다면 `study`를 `{selectedDeckId:null, cycleStudiedIds:[]}`로 리셋(홈은 다음 진입 시 첫 덱으로 동기화).

## 가져오기/내보내기 (csv.js 연동)
- 가져오기: 설정에서 대상 덱 선택 → `csv.importCSV(text, deckId)`. 덱 내 단어 중복은 `byDeckWord` unique로 자동 스킵, 덱 간 동일 단어는 허용.
- 내보내기: `csv.downloadCSV(deckId, '<덱이름>.csv')` — 해당 덱만 출력.

## 의존
- `db.js`: add/get/put/del/getByIndex
