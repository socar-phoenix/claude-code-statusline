# Feature Specification: Statusline Customization

**Feature Branch**: `design/statusline-customization`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "docs/superpowers/specs/2026-04-14-statusline-customization-design.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Config 파일로 레이아웃 변경 (Priority: P1)

사용자가 `~/.claude/statusline.config.json` 파일을 만들어 원하는 필드와 줄 구성을 지정하면, 다음 statusline 렌더링부터 즉시 반영된다.

**Why this priority**: 커스터마이징의 핵심 기능이자 모든 다른 스토리의 토대. 이것이 없으면 나머지 기능이 의미없음.

**Independent Test**: `~/.claude/statusline.config.json`에 `lines` 설정을 작성하고 Claude Code를 실행해 statusline이 지정한 필드만 표시하는지 확인.

**Acceptance Scenarios**:

1. **Given** config 파일이 없을 때, **When** statusline을 렌더링하면, **Then** `default` 프리셋 레이아웃이 표시된다
2. **Given** `{"preset": "minimal"}`이 config에 있을 때, **When** statusline을 렌더링하면, **Then** minimal 프리셋 필드(model, path, branch, context, five_hour)만 표시된다
3. **Given** `{"lines": [["model", "path"], ["context"]]}` config가 있을 때, **When** statusline을 렌더링하면, **Then** 첫 줄에 model과 path, 둘째 줄에 context가 표시된다
4. **Given** config 파일을 수정한 뒤, **When** 다음 Claude Code 명령을 실행하면, **Then** 재시작 없이 변경된 레이아웃이 바로 반영된다

---

### User Story 2 - 내장 프리셋 선택 (Priority: P2)

사용자가 `preset` 키 하나로 목적에 맞는 레이아웃(default / focus / compact / minimal)을 즉시 선택할 수 있다.

**Why this priority**: 대부분의 사용자에게 lines 직접 지정보다 프리셋이 더 쉽고 빠른 진입점.

**Independent Test**: 각 프리셋 이름을 config에 지정하고 해당 프리셋 정의의 필드들이 정확히 표시되는지 확인.

**Acceptance Scenarios**:

1. **Given** `{"preset": "focus"}` config가 있을 때, **When** statusline을 렌더링하면, **Then** focus 프리셋 정의의 6줄 레이아웃이 표시된다
2. **Given** `{"preset": "compact"}` config가 있을 때, **When** statusline을 렌더링하면, **Then** compact 프리셋 3줄 레이아웃이 표시된다
3. **Given** `{"preset": "unknown_preset"}` config가 있을 때, **When** statusline을 렌더링하면, **Then** 에러 배너가 표시되고 default 프리셋으로 fallback된다

---

### User Story 3 - Config 오류 시 명확한 피드백 (Priority: P2)

사용자가 config를 잘못 작성했을 때(오타, JSON 파싱 오류 등), statusline 최상단에 한 줄 에러 배너가 표시되고 default 레이아웃은 그대로 동작한다.

**Why this priority**: 사용자가 오류를 모른 채 default로만 동작하면 혼란스러움. 명확한 피드백이 필수.

**Independent Test**: 잘못된 config(오타 필드명, 잘못된 JSON, preset+lines 동시 지정)를 각각 작성하고 배너 메시지와 default fallback 동작 확인.

**Acceptance Scenarios**:

1. **Given** JSON 파싱이 불가능한 config가 있을 때, **When** statusline을 렌더링하면, **Then** "statusline config error: invalid JSON" 배너가 첫 줄에 표시되고 default 프리셋이 사용된다
2. **Given** 알 수 없는 필드명(`"xyz"`)이 lines에 포함된 config가 있을 때, **When** statusline을 렌더링하면, **Then** "statusline config error: unknown field 'xyz'" 배너가 표시된다
3. **Given** `preset`과 `lines`가 동시에 지정된 config가 있을 때, **When** statusline을 렌더링하면, **Then** 배너가 표시되고 default로 fallback된다
4. **Given** 에러 배너가 표시될 때, **When** config를 올바르게 수정하면, **Then** 다음 렌더링부터 배너 없이 지정한 레이아웃이 표시된다

---

### User Story 4 - 대화형 커스터마이징 스킬 (Priority: P3)

사용자가 `/statusline:customize`를 실행하면 단계별 안내를 통해 config 파일을 생성하거나 수정할 수 있다.

**Why this priority**: config 직접 편집이 어려운 사용자를 위한 편의 기능. 핵심 기능은 이미 P1/P2로 커버됨.

**Independent Test**: `/statusline:customize` 실행 후 대화형 흐름을 따라가서 `~/.claude/statusline.config.json`이 올바르게 생성/수정되는지 확인.

**Acceptance Scenarios**:

1. **Given** 사용자가 `/statusline:customize`를 실행하면, **When** 프리셋 선택 옵션이 제시되면, **Then** 사용자가 프리셋을 선택하거나 직접 구성을 선택할 수 있다
2. **Given** 사용자가 프리셋 복사 후 편집을 선택하면, **When** 기존 프리셋의 lines가 제시되면, **Then** 사용자가 필드를 추가/제거/이동해 config를 저장할 수 있다
3. **Given** 커스터마이징 완료 후, **When** `~/.claude/statusline.config.json`을 확인하면, **Then** 선택한 내용이 올바른 JSON 형식으로 저장되어 있다

---

### User Story 5 - Config 검증 스킬 (Priority: P3)

사용자가 `/statusline:validate`를 실행하면 현재 config의 유효성과 오류 목록을 확인할 수 있다.

**Why this priority**: 사용자가 직접 config를 편집할 때 문제를 사전에 파악할 수 있는 도구.

**Independent Test**: 유효한 config와 다양한 오류 config를 각각 작성하고 `/statusline:validate` 실행 결과 비교.

**Acceptance Scenarios**:

1. **Given** 유효한 config가 있을 때, **When** `/statusline:validate`를 실행하면, **Then** "config is valid" 메시지와 현재 레이아웃 요약이 표시된다
2. **Given** 오류가 있는 config가 있을 때, **When** `/statusline:validate`를 실행하면, **Then** 각 오류 유형과 수정 방법이 리포트된다
3. **Given** config 파일이 없을 때, **When** `/statusline:validate`를 실행하면, **Then** "no config file, using default preset" 메시지가 표시된다

---

### Edge Cases

- config 파일은 있지만 빈 JSON `{}`인 경우 → 에러 배너 + default fallback
- `lines` 배열이 비어있는 경우(`{"lines": []}`) → 에러 배너 + default fallback (빈 배열 허용 시 null 처리로 인한 undefined 렌더링 발생)
- 하나의 줄에 같은 필드가 중복 지정된 경우 → 필드는 전체 레이아웃에서 유니크하게 관리되므로 중복 불가 (에러 배너 + default fallback)
- bar 타입 필드가 inline/column과 같은 줄에 섞인 경우 → 에러 배너 + default fallback
- config 파일 읽기 권한이 없는 경우 → 조용히 default 프리셋 사용 (사용자 디렉토리 특성상 발생 가능성 극히 낮음)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 시스템은 매 statusline 렌더링 시 `~/.claude/statusline.config.json`을 읽어야 한다 (캐싱 없음)
- **FR-002**: config는 `preset` 또는 `lines` 중 하나만 허용하며, 둘 다 존재 시 에러로 처리해야 한다
- **FR-003**: config 파일이 없으면 하드코딩된 `default` 프리셋을 사용해야 한다
- **FR-004**: config 오류 발생 시 statusline 최상단에 1줄 에러 배너를 출력하고 `default` 프리셋으로 fallback해야 한다
- **FR-005**: 시스템은 다음 8가지 오류 유형을 감지해야 한다: JSON 파싱 실패, 알 수 없는 필드명, preset+lines 동시 지정, 알 수 없는 preset 이름, preset/lines 모두 없는 빈 config, 빈 lines 배열(`[]`), 같은 줄에 타입이 다른 필드 혼합(bar+inline/column), 중복 필드 지정
- **FR-006**: 시스템은 14개의 명명된 필드를 지원해야 한다: `model`, `git_user`, `path`, `version`, `branch`, `context`, `five_hour`, `seven_day`, `cost`, `speed`, `io_tokens`, `session_time`, `code_lines`, `cache_ratio`
- **FR-007**: 시스템은 4개의 내장 프리셋을 지원해야 한다: `default`, `focus`, `compact`, `minimal`
- **FR-008**: `bar` 타입 필드가 여러 개일 때 라벨 폭을 가장 긴 라벨 기준으로 자동 통일해야 한다
- **FR-009**: `column` 타입 필드는 같은 줄 안에서 고정폭으로 정렬되어야 한다
- **FR-010**: `inline` 타입 필드는 같은 줄에서 공백으로 구분되어야 한다
- **FR-011**: statusline.js 자동 업데이트는 `statusline.config.json`을 수정해서는 안 된다
- **FR-012**: 시스템은 `/statusline:customize` 명령어를 통해 대화형 config 생성/수정을 지원해야 한다
- **FR-013**: 시스템은 `/statusline:validate` 명령어를 통해 현재 config 유효성 검사 리포트를 제공해야 한다

### Key Entities

- **Config File**: 사용자 소유 JSON 파일 (`~/.claude/statusline.config.json`), `preset` 문자열 또는 `lines` 배열 중 하나 포함
- **Field**: 이름, 타입(inline/bar/column), 렌더 함수를 가진 statusline 표시 단위 (14개)
- **Preset**: 명명된 사전 정의 레이아웃 (`lines` 배열의 집합), 4개 내장
- **Layout Line**: 한 줄에 표시할 필드명 배열
- **Error Banner**: config 오류 시 statusline 최상단에 출력되는 1줄 경고 메시지

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 사용자가 소스 코드를 수정하지 않고 config 파일 편집만으로 표시 레이아웃을 변경할 수 있다
- **SC-002**: config 오류는 statusline 출력 내에서 1줄 이내로 명확하게 전달된다
- **SC-003**: config 변경 사항이 다음 Claude Code 명령 실행 시 (재시작 없이) 즉시 반영된다
- **SC-004**: `/statusline:customize`를 사용해 선호하는 레이아웃 설정을 2분 이내에 완료할 수 있다
- **SC-005**: statusline.js 자동 업데이트 후 사용자 config 재설정이 불필요하다
- **SC-006**: 기존 사용자가 업그레이드 후 config 파일 없이도 시각적으로 동일한 레이아웃을 유지한다

## Clarifications

### Session 2026-04-14

- Q: `{}` 빈 config 파일의 동작은? → A: 에러 배너 출력 + default 프리셋으로 fallback
- Q: `{"lines": []}` 빈 lines 배열의 동작은? → A: 에러 배너 + default fallback (허용 시 null 처리로 undefined 렌더링 발생)
- Q: bar 타입과 inline/column 타입이 같은 줄에 혼합된 경우의 동작은? → A: 에러 배너 + default fallback
- Q: config 파일 읽기 권한 오류 발생 시 동작은? → A: 조용히 default 프리셋 사용 (사용자 디렉토리 특성상 발생 가능성 극히 낮음)
- Q: 한 줄에 같은 필드가 중복 지정된 경우의 동작은? → A: 필드는 전체 레이아웃에서 유니크하게 관리되므로 중복 자체가 허용되지 않는 구조 (에러 배너 + default fallback)

## Assumptions

- 사용자는 `~/.claude/` 디렉토리에 파일 읽기/쓰기 권한을 가진다
- statusline.js는 표준 Node.js 파일시스템 API로 config를 읽을 수 있다 (추가 의존성 불필요)
- Claude Code plugin 구조(`plugin.json` + `commands/`)는 실제 Claude Code 플러그인 시스템과 호환된다
- v1 범위는 필드 색상/임계값 커스터마이징 및 사용자 정의 신규 필드 추가를 포함하지 않는다
- 설계 문서에 명시된 14개 필드가 v1의 완전한 필드 목록이다
- 빈 config(`{}`)는 JSON 파싱은 성공하지만 유효하지 않은 구성으로 간주해 에러 처리한다
