# Implementation Plan: Statusline Customization

**Branch**: `design/statusline-customization` | **Date**: 2026-04-14 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-statusline-customization/spec.md`

## Summary

`statusline.js`를 필드 레지스트리 + 레이아웃 엔진 구조로 리팩토링하고, `~/.claude/statusline.config.json` 기반의 선언적 커스터마이징 기능을 추가한다. 기존 하드코딩 레이아웃은 `default` 프리셋으로 보존되며, 사용자는 config 파일 편집 또는 `/statusline:customize` 슬래시 커맨드로 레이아웃을 변경할 수 있다.

## Technical Context

**Language/Version**: JavaScript (Node.js) — 기존 단일 파일 패턴 유지  
**Primary Dependencies**: Node.js 내장 모듈만 사용 (`fs`, `os`, `child_process`) — 외부 npm 패키지 없음  
**Storage**: `~/.claude/statusline.config.json` (사용자 소유 JSON)  
**Testing**: 기존 테스트 없음 — 수동 테스트 + 시나리오 체크리스트  
**Target Platform**: macOS/Linux (bash), Windows (PowerShell) — Node.js 크로스플랫폼  
**Project Type**: CLI 도구 (statusline 렌더러) + Claude Code 슬래시 커맨드  
**Performance Goals**: config 읽기 오버헤드 < 1ms (동기 단일 파일 읽기)  
**Constraints**: `statusline.js` 단일 파일 유지 (상대 경로 require 불가); 외부 npm 의존성 없음

## Constitution Check

Constitution이 빈 템플릿 상태 — 게이트 없음. 진행.

## Project Structure

### Documentation (this feature)

```text
specs/001-statusline-customization/
├── plan.md              ← 이 파일
├── research.md          ← Phase 0 완료
├── data-model.md        ← Phase 1 완료
├── contracts/
│   ├── config-schema.md ← config 유효성 규칙
│   └── commands.md      ← 커맨드 인터페이스
└── tasks.md             ← /speckit.tasks 출력 (미생성)
```

### Source Code (repository root)

```text
statusline/
└── statusline.js        ← 리팩토링 (필드 레지스트리 + 레이아웃 엔진 + config 로더)

.claude/
└── commands/
    ├── statusline_customize.md  ← /statusline:customize 커맨드 (신규)
    └── statusline_validate.md  ← /statusline:validate 커맨드 (신규)

install.sh               ← 업데이트 (커맨드 파일 복사 추가)
install.ps1              ← 업데이트 (커맨드 파일 복사 추가)
```

**Structure Decision**: 단일 파일 패턴 유지. 커맨드 파일은 `.claude/commands/`에 위치하고 install.sh가 `~/.claude/commands/`로 복사.

## Open Issue: compact 프리셋 타입 혼합

`data-model.md`에 기록된 대로, `compact` 프리셋의 `["context", "cost"]` 줄은 bar(context) + column(cost) 혼합이다. 사용자 config에서는 타입 혼합이 에러이지만, **내장 프리셋은 예외 처리**가 필요하다.

**결정**: 내장 프리셋은 유효성 검사를 우회한다. 유효성 검사는 사용자 custom config의 `lines`에만 적용된다.

## Implementation Tasks (High-Level)

### Task 1: Config 로더 (`loadConfig`)

- `~/.claude/statusline.config.json` 읽기 시도 (`try/catch`)
- 권한 오류 → 조용히 default 반환
- JSON 파싱 실패 → 에러 배너 + default 반환
- 8가지 유효성 규칙 검증 (contracts/config-schema.md 참조)
- 성공 시 preset 해석 또는 lines 직접 반환
- 반환값: `{ lines: [[fieldName,...], ...], error?: string }`

### Task 2: 필드 레지스트리 (`FIELDS`)

- 14개 필드를 `{ type, render }` 형태의 객체로 정의
- 기존 렌더링 로직을 각 필드의 `render(data, opts)` 함수로 추출
- `opts.maxLabelWidth` (bar 타입), `opts.colWidth` (column 타입) 주입

### Task 3: 레이아웃 엔진 (`renderLayout`)

- `loadConfig()`에서 받은 `lines` 배열 순회
- 렌더링 전 스캔: 모든 bar 필드 라벨 폭 최대값 계산
- 각 줄 타입별 렌더링 호출
- 에러 배너가 있으면 첫 줄에 prepend
- 결과 줄 배열 반환

### Task 4: 프리셋 정의 (`PRESETS`)

- 4개 프리셋 (default, focus, compact, minimal) lines 정의
- `default` 프리셋은 현재 하드코딩 레이아웃과 동일하게 유지

### Task 5: 기존 하드코딩 렌더링 제거 및 통합

- 기존 `line1`, `line2`, `line2b`, `line3`, `line3b`, `lineCtx`, `lineGit`, `lineGitVer` 변수 기반 코드 제거
- `process.stdout.write(renderLayout(...).join("\n") + "\n")` 로 교체
- 자동 업데이트 로직 (`checkUpdate`) 은 변경 없이 유지

### Task 6: `/statusline:customize` 커맨드 파일

- `.claude/commands/statusline_customize.md` 작성
- 대화형 흐름: 프리셋 선택 / 복사 후 편집 / 직접 구성
- `~/.claude/statusline.config.json` 생성/덮어쓰기

### Task 7: `/statusline:validate` 커맨드 파일

- `.claude/commands/statusline_validate.md` 작성
- 현재 config 읽기 → 유효성 검사 → 결과 리포트
- contracts/commands.md 형식 준수

### Task 8: install.sh / install.ps1 업데이트

- `~/.claude/commands/` 디렉토리 생성
- `.claude/commands/statusline_customize.md` → `~/.claude/commands/statusline_customize.md` 복사
- `.claude/commands/statusline_validate.md` → `~/.claude/commands/statusline_validate.md` 복사

### Task 9: 수동 테스트 체크리스트

spec.md의 5개 유저 스토리 + 8가지 에러 케이스 + 4개 프리셋을 커버하는 테스트 시나리오 실행.

## Complexity Tracking

해당 없음 — Constitution 게이트 위반 없음.

## Risk

| 리스크 | 완화 방안 |
|--------|-----------|
| bar 라벨 폭 통일 시각 정합성 | Task 9에서 다양한 프리셋 조합으로 실제 터미널 출력 확인 |
| compact 프리셋 bar+column 혼합 렌더링 | Task 4에서 내장 프리셋 예외 처리 명시적으로 구현 |
| 자동 업데이트 후 리팩토링 코드 유지 | 단일 파일 구조 유지로 업데이트 메커니즘 변경 없음 |
