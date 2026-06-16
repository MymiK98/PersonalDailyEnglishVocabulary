# db.js — IndexedDB 래퍼 + 스키마 + 마이그레이션

DB `vocabPWA`, 버전 **2**. Promise 기반 얇은 래퍼.

## 스키마
| 스토어 | keyPath | 인덱스 |
|---|---|---|
| `cards` | `id` (autoIncrement) | `byDeck`(deckId), `byDeckWord`(`[deckId,word]`, unique) |
| `decks` | `id` (autoIncrement) | — |
| `meta` | `key` | — |

레코드 형태는 [architecture/overview.md](architecture/overview.md) 참고.

## 헬퍼 API
| 함수 | 설명 |
|---|---|
| `openDB()` | 연결(싱글톤 Promise). `onupgradeneeded`에서 스키마/마이그레이션 처리 |
| `add(store, value)` | 추가 → 생성된 key 반환 |
| `put(store, value)` | upsert |
| `get(store, key)` | 단건 조회 |
| `getAll(store)` | 전체 조회 |
| `del(store, key)` | 삭제 |
| `count(store)` | 개수 |
| `getByIndex(store, indexName, range)` | 인덱스 범위 조회(배열). 예: `getByIndex('cards','byDeck', IDBKeyRange.only(deckId))` |
| `addMany(store, values)` | 배치 추가. 키/유니크 인덱스 위반은 건너뜀(`{ addedWords, skipped }`) |

`tx(store, mode, fn)`는 내부 트랜잭션 헬퍼(외부 미사용). `addMany`의 skip-on-error는 `byDeckWord` unique 위반에도 동작 → 덱 내 단어 중복 자동 스킵.

## 마이그레이션

### 신규 설치 (oldVersion < 1)
`decks`/`cards`/`meta` 생성 + "기본" 덱 + `study` 시드.

### v1 → v2 (`migrateV1toV2`)
v1은 `cards` keyPath가 `word`. keyPath는 변경 불가하므로 **삭제 후 재생성**이 필요:
1. 기존 `cards` 전체 `getAll()`로 읽기
2. `cards` 삭제 → 새 스키마로 재생성, `decks` 생성
3. "기본" 덱 add → 반환된 id 확보
4. 각 기존 카드를 `{ ...필드, deckId: 기본id }`로 재삽입 (SRS 필드 `ease/interval/repetitions/dueDate/lastReviewed` 폐기)
5. `meta.study` 시드(selectedDeckId=기본)

> **주의**: `onupgradeneeded` 안에서는 `versionchange` 트랜잭션(`req.transaction`)의 raw 요청만 사용한다. 모듈의 `tx()`/`openDB()` 헬퍼는 새 연결을 열어 **데드락**을 유발하므로 호출 금지. 비동기 IDB 요청은 `onsuccess` 콜백으로 연결하며, 트랜잭션이 abort되면 전체 롤백된다(안전).

## 검증
Playwright로 실측 완료: 신규 설치, v1→v2 이전(카드 deckId 부여·SRS 제거), 덱 간 동일 단어 허용, cascade 삭제. 자세한 결과는 `progress.md`.
