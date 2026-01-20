# Claude Code — Global Rules (English)

## 1) Implementation Principles
- Implement using **SOLID**:
  - **Single Responsibility Principle (SRP)**
  - **Open–Closed Principle (OCP)**
  - **Liskov Substitution Principle (LSP)**
  - **Interface Segregation Principle (ISP)**
  - **Dependency Inversion Principle (DIP)**
- Implement with **TDD (Test-Driven Development)**:
  - Write tests first, then implement.
- Use **Clean Architecture**:
  - Clearly separate responsibilities and concerns.
- Implement with **OOP and modularization**:
  - Clearly separate **usability/interface concerns** from **intent/domain (business) logic**.

## 2) Code Quality Principles
- **Simplicity**: Always prefer the simplest solution over a complex one.
- **Avoid duplication (DRY)**: Prevent duplicate code and reuse existing functionality whenever possible.
- **Guardrails**: Do not use mock/fake data outside of tests (in development or production).
- **Efficiency**: Optimize outputs to minimize token usage without sacrificing clarity.

## 3) Refactoring
- If refactoring is needed:
  - Explain the plan first and **proceed only after explicit approval**.
  - The goal is to improve structure; **do not change functionality**.
  - After refactoring, confirm that **all tests pass**.

## 4) Debugging
- When debugging:
  - Explain the root cause and the fix, then **proceed only after explicit approval**.
  - The goal is not merely to “fix the error” but to ensure the system works correctly.
  - If the root cause is unclear, add detailed logs for analysis.

## 5) Language
- Communicate in **Korean**.
- Write documentation and code comments in **Korean**.
- Technical terms and library names may remain in their original form.

## 6) Workflow & Communication

### 6.1) Standard Workflow
- **Focus**: Modify only the specified code; keep all other parts unchanged.
- **Steps**: Break large tasks into phases and wait for approval after each phase.
- **Planning**: Before major changes, write:
  - Design/overview document: `[issue_name]_design.md`
  - Implementation plan: `[issue_name]_plan.md`
  Then wait for approval.
- **Tracking**:
  - Record completed work in `progress.md`
  - Record next steps in `TODO.txt`

### 6.2) Standard Communication
- **Summary**: After each component, summarize what was completed.
- **Change size**: Classify changes as **small**, **medium**, or **large**.
- **Clarification**: If a request is unclear, ask questions before proceeding.

### 6.3) Precise Communication
- **Plan**: For major changes, provide an implementation plan and wait for approval.
- **Tracking**: Always state what is completed and what is pending.
- **Emotional signals**: If urgency is expressed (e.g., “This is important—focus!”), prioritize attention and accuracy.

## 7) Git Commits
- Never use `--no-verify`.
- Write clear and consistent commit messages.
- Keep commits appropriately sized.

## 8) Documentation
- After developing a major component, write a brief summary in `/docs/[component].md`.
- Update documentation alongside code changes.
- Explain complex logic/algorithms with comments.
- `docs/`: All documentation files
  - `architecture/`: Architecture documents
  - `guides/`: Developer guides

## 9) Naming Conventions
- Maintain consistency within the project.
- Filenames: **PascalCase** (e.g., `UserService.py`)
- Class names: **PascalCase** (e.g., `UserService`)
- Function names: **PascalCase** (e.g., `GetUser()`)
- Variable names: **camelCase** (e.g., `userId`, `currentUser`)
- Constants: **UPPER_SNAKE_CASE** (e.g., `MAX_USERS`)
