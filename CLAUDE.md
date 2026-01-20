# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PersonalDailyEnglishVocabulary - 개인용 일일 영어 단어장 애플리케이션

## Repository

- GitHub: MymiK98/PersonalDailyEnglishVocabulary
- Branch: main

## Implementation Principles

- **SOLID 원칙** 준수 (SRP, OCP, LSP, ISP, DIP)
- **TDD**: 테스트 먼저 작성 후 구현
- **Clean Architecture**: 책임과 관심사 명확히 분리
- **OOP 및 모듈화**: UI/인터페이스와 도메인 로직 분리

## Code Quality

- 항상 단순한 솔루션 우선
- DRY 원칙 준수
- 테스트 외 mock/fake 데이터 사용 금지

## Refactoring & Debugging

- 리팩토링: 계획 설명 후 **명시적 승인 필요**, 기능 변경 금지, 테스트 통과 확인
- 디버깅: 근본 원인과 수정 방안 설명 후 **명시적 승인 필요**

## Language

- 한국어로 소통
- 문서 및 코드 주석은 한국어
- 기술 용어/라이브러리명은 원문 유지

## Workflow

- 지정된 코드만 수정, 나머지는 변경 금지
- 큰 작업은 단계별로 분리하여 각 단계 후 승인 대기
- 주요 변경 전: `[issue_name]_design.md`, `[issue_name]_plan.md` 작성 후 승인 대기
- 완료 작업: `progress.md` 기록 / 다음 작업: `TODO.txt` 기록

## Git Commits

- `--no-verify` 사용 금지
- 명확하고 일관된 커밋 메시지
- 적절한 크기로 커밋 유지

## Documentation

- 주요 컴포넌트 개발 후 `/docs/[component].md` 작성
- `docs/architecture/`: 아키텍처 문서
- `docs/guides/`: 개발자 가이드

## Naming Conventions

- 파일명: **PascalCase** (예: `UserService.py`)
- 클래스명: **PascalCase** (예: `UserService`)
- 함수명: **PascalCase** (예: `GetUser()`)
- 변수명: **camelCase** (예: `userId`, `currentUser`)
- 상수: **UPPER_SNAKE_CASE** (예: `MAX_USERS`)
