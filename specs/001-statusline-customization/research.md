# Research: Statusline Customization

**Phase**: 0  
**Date**: 2026-04-14  
**Branch**: `design/statusline-customization`

## 1. Config 읽기 방식

**Decision**: `fs.readFileSync` + `JSON.parse` (동기)

**Rationale**: statusline.js는 이미 `stdin.on('end')` 콜백에서 모든 처리를 동기식으로 수행한다. `fs.existsSync` → `fs.readFileSync` → `JSON.parse` 패턴이 기존 코드 스타일과 일치하고 추가 의존성 없이 구현 가능하다.

**Alternatives considered**:
- `fs.readFileSync` + `try/catch` vs `fs.existsSync` 선행 체크: `try/catch` 단독으로 처리하는 것이 더 단순하고 race condition 없음 → `try/catch` 채택
- 비동기(`fs.readFile`): 기존 코드가 동기 구조이므로 불필요한 복잡도 증가 → 기각

---

## 2. Single-file 제약 유지

**Decision**: 모든 신규 로직을 `statusline.js` 내 함수로 인라인 추가

**Rationale**: install.sh가 `statusline.js` 단일 파일을 `~/.claude/`에 복사한다. `require('./fields')` 등 상대 경로 require는 복사 후 동작하지 않는다.

**Alternatives considered**:
- 멀티파일 + 번들러: 배포 복잡도 증가, 자동 업데이트 로직 재설계 필요 → 기각
- config 로더만 별도 파일로 분리: 역시 install 시 단일 파일 복사 방식과 충돌 → 기각

---

## 3. Claude Code 커스텀 커맨드 구조

**Decision**: `.claude/commands/` 디렉토리에 `.md` 파일로 프로젝트 전용 커맨드 등록; 설치 시 `~/.claude/commands/`로 복사

**Rationale**: Claude Code는 `~/.claude/commands/` (전역)과 `.claude/commands/` (프로젝트 전용) 두 경로를 지원한다. 프로젝트 레포에 `.claude/commands/statusline_customize.md`, `.claude/commands/statusline_validate.md`를 작성하고, install.sh가 이를 `~/.claude/commands/`로 복사하면 사용자가 전역에서 사용할 수 있다.

**Alternatives considered**:
- `.claude-plugin/` 기반 marketplace 플러그인: 현재 `marketplace.json`은 statusline 렌더러 등록용이며, 커맨드 시스템과 분리되어 있음 → marketplace는 변경 없이 유지
- 별도 `plugin/` 디렉토리: install.sh 수정 없이 `.claude/commands/`에 직접 위치시키는 것이 더 단순 → 기각

---

## 4. 필드 레지스트리 + 레이아웃 엔진 패턴

**Decision**: `const FIELDS = { fieldName: { type, render } }` 객체 + `renderLines(lines, data)` 함수

**Rationale**: 기존 303줄 코드에서 라인별 렌더링 로직이 변수명(`line1`, `line2`, `line2b` 등)으로 하드코딩되어 있다. 이를 `FIELDS` 레지스트리로 분리하면 config에서 받은 `lines` 배열을 순회해 동적으로 렌더링할 수 있다.

**Alternatives considered**:
- 클래스 기반 필드 객체: 단일 파일 + 단순 데이터 구조로 충분, 과도한 추상화 → 기각
- 함수 배열 방식: 필드명 기반 검증(알 수 없는 필드 감지)이 어려워짐 → 기각

---

## 5. Bar 라벨 폭 정렬 방식

**Decision**: 렌더링 전 `lines` 배열을 스캔해 모든 bar 필드의 raw 라벨 폭 최대값을 계산, 각 bar 필드 렌더 시 `maxBarLabelWidth` 주입

**Rationale**: 현재 코드에서도 `COL_W` 변수로 컬럼 폭을 맞추는 패턴이 사용된다. 이를 bar 필드 전체에 적용하면 된다.

**Alternatives considered**:
- 렌더 후 정렬 (post-render padding): ANSI escape 포함 문자열의 시각 폭 측정(`getVisWidth`)이 필요하지만 이미 구현되어 있음 → 사용 가능하나 사전 계산이 더 단순 → 사전 계산 채택

---

## 6. 에러 배너 형식

**Decision**: `process.stdout.write`로 dataLines 배열의 첫 번째 항목에 배너를 삽입

**Rationale**: 기존 출력 흐름(`dataLines.join("\n")`)을 그대로 유지하면서 배너를 prepend하면 구조 변경 없이 적용 가능하다.

**Format**: `⚠️  statusline config error: {message} — using default`
