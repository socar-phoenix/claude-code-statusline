# Tasks: Statusline Customization

**Input**: Design documents from `specs/001-statusline-customization/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Organization**: 유저 스토리별 독립 구현·검증 가능하도록 구성

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 해당 유저 스토리 (US1~US5)
- 파일 경로 포함 필수

---

## Phase 1: Setup (기존 코드 파악)

**Purpose**: 리팩토링 전 현재 statusline.js 구조 확인 — 신규 파일/디렉토리 없음

- [ ] T001 현재 `statusline/statusline.js` 렌더링 흐름 검토 (line1~line3b 변수, getVisWidth/padR/padL 유틸 위치 파악)

---

## Phase 2: Foundational (핵심 엔진 — 모든 유저 스토리의 전제 조건)

**Purpose**: config 독립적으로 동작하는 필드 레지스트리 + 레이아웃 엔진 구현

**⚠️ CRITICAL**: Phase 2가 완료되기 전까지 US1~US5 구현 불가

- [ ] T002 `PRESETS` 상수 객체 정의 (default/focus/compact/minimal 4개, 각 lines 배열) in `statusline/statusline.js`
- [ ] T003 [P] `FIELDS` 레지스트리 객체 정의 (14개 필드 각각 `{ type, render(data, opts) }` 형태로 추출) in `statusline/statusline.js`
- [ ] T004 `renderLayout(lines, data, errorBanner)` 함수 구현 (bar 필드 라벨 폭 최대값 사전 계산, 타입별 렌더링, errorBanner 첫 줄 prepend) in `statusline/statusline.js`

**Checkpoint**: `renderLayout(PRESETS.default.lines, data)`가 기존 출력과 동일한지 단위 확인 후 다음 진행

---

## Phase 3: User Story 1 - Config 파일로 레이아웃 변경 (Priority: P1) 🎯 MVP

**Goal**: `~/.claude/statusline.config.json` 읽기 + 레이아웃 동적 적용. config 없으면 default 유지.

**Independent Test**: `statusline.config.json`에 `{"lines":[["model","path"],["context"]]}` 작성 후 Claude Code 실행 → 2줄 레이아웃 확인

### Implementation for User Story 1

- [ ] T005 [US1] `loadConfig()` 함수 구현 — 파일 없음 → default 반환; 읽기 실패(권한 등) → 조용히 default 반환; JSON 파싱 성공 + 기본 구조 확인 후 `{ lines, error }` 반환 in `statusline/statusline.js`
- [ ] T006 [US1] stdin.on('end') 메인 흐름 교체 — 기존 `line1~line3b` 하드코딩 변수 제거, `loadConfig() → renderLayout()` 호출로 대체 in `statusline/statusline.js`
- [ ] T007 [US1] config 파일 없는 상태에서 실제 Claude Code 실행 → 기존 레이아웃과 동일한 출력 수동 검증

**Checkpoint**: config 없어도 기존과 동일하게 동작 + lines 직접 지정 config 적용 확인

---

## Phase 4: User Story 2 - 내장 프리셋 선택 (Priority: P2)

**Goal**: `{"preset": "minimal"}` 등 4개 프리셋 이름으로 레이아웃 즉시 변경

**Independent Test**: `{"preset": "compact"}` config → Claude Code 실행 → 3줄 레이아웃(model/path/branch, context/cost, five_hour/speed) 확인

### Implementation for User Story 2

- [ ] T008 [US2] `loadConfig()`에 preset 해석 로직 추가 — `{"preset": "focus"}` → `PRESETS.focus` lines 반환 in `statusline/statusline.js`
- [ ] T009 [US2] 4개 프리셋(default/focus/compact/minimal) 각각 config 파일 작성 후 출력 수동 검증 (줄 수 + 필드 포함 여부)

**Checkpoint**: 4개 프리셋 모두 정상 동작 + compact의 bar+column 혼합 줄도 정상 렌더링 확인

---

## Phase 5: User Story 3 - Config 오류 시 명확한 피드백 (Priority: P2)

**Goal**: 잘못된 config → statusline 최상단 1줄 에러 배너 + default fallback

**Independent Test**: `{"preset":"unknown"}` config → Claude Code 실행 → 첫 줄에 `⚠️ statusline config error: unknown preset "unknown" — using default` 배너 확인

### Implementation for User Story 3

- [ ] T010 [US3] `loadConfig()`에 8가지 유효성 검사 구현 — JSON 파싱 실패 / `{}` 빈 config / preset+lines 동시 지정 / 알 수 없는 preset / 빈 lines 배열 / 알 수 없는 필드명 / 중복 필드 / 타입 혼합(bar+inline/column) → 각각 errorBanner 메시지 반환 in `statusline/statusline.js`
- [ ] T011 [US3] `contracts/config-schema.md`의 오류 메시지 형식에 맞춰 배너 문자열 포맷 일치 확인 in `statusline/statusline.js`
- [ ] T012 [US3] 8가지 오류 케이스 각각 `statusline.config.json` 작성 후 에러 배너 출력 수동 검증 (배너 내용 + default 레이아웃 fallback 확인)

**Checkpoint**: 모든 오류 케이스에서 배너 1줄 + default 7줄 출력. 정상 config에서는 배너 없음.

---

## Phase 6: User Story 4 - 대화형 커스터마이징 스킬 (Priority: P3)

**Goal**: `/statusline:customize` 커맨드로 대화형 config 생성/수정

**Independent Test**: `/statusline:customize` 실행 → 프리셋 선택 → `~/.claude/statusline.config.json` 올바른 JSON으로 생성 확인

### Implementation for User Story 4

- [ ] T013 [P] [US4] `.claude/commands/statusline_customize.md` 작성 — contracts/commands.md의 3가지 진입 흐름(프리셋 선택 / 복사 후 편집 / 직접 구성) 구현
- [ ] T014 [P] [US4] `install.sh`에 `~/.claude/commands/` 디렉토리 생성 + `statusline_customize.md`, `statusline_validate.md` 복사 로직 추가 in `install.sh`
- [ ] T015 [P] [US4] `install.ps1`에 동일한 커맨드 파일 복사 로직 추가 in `install.ps1`
- [ ] T016 [US4] 로컬에서 `/statusline:customize` 실행 후 3가지 흐름 모두 수동 테스트

**Checkpoint**: `/statusline:customize` 완료 후 생성된 config로 실제 렌더링 변경 확인

---

## Phase 7: User Story 5 - Config 검증 스킬 (Priority: P3)

**Goal**: `/statusline:validate`로 현재 config 유효성 검사 리포트

**Independent Test**: 유효한 config / 오류 config / 파일 없음 각각에서 `/statusline:validate` 실행 → contracts/commands.md 형식의 출력 확인

### Implementation for User Story 5

- [ ] T017 [P] [US5] `.claude/commands/statusline_validate.md` 작성 — contracts/commands.md의 3가지 출력 케이스(유효/오류/파일없음) 구현
- [ ] T018 [US5] `/statusline:validate` 3가지 케이스 수동 테스트

**Checkpoint**: 모든 케이스에서 올바른 형식의 리포트 출력

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 자동 업데이트 호환성 확인 + 문서화

- [ ] T019 [P] `statusline/statusline.js`의 `checkUpdate` 함수 및 `RAW_URL` 무변경 확인 (자동 업데이트 메커니즘 보존)
- [ ] T020 [P] `README.md`에 커스터마이징 사용법 섹션 추가 (config 파일 예시 + 프리셋 목록 + 커맨드 설명)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 즉시 시작 가능
- **Foundational (Phase 2)**: Phase 1 완료 후 — **모든 US 차단**
- **US1 (Phase 3)**: Phase 2 완료 필수 — T005→T006→T007 순서
- **US2 (Phase 4)**: Phase 3(T006) 완료 필수 — T005(loadConfig) 위에 preset 로직 추가
- **US3 (Phase 5)**: Phase 3(T005) 완료 필수 — loadConfig 유효성 검사 확장
- **US4 (Phase 6)**: Phase 2 완료 후 독립 진행 가능 — T013/T014/T015 병렬
- **US5 (Phase 7)**: Phase 2 완료 후 독립 진행 가능 — T017 단독 작성
- **Polish (Phase 8)**: 원하는 US 완료 후 진행

### User Story Dependencies

- **US1 (P1)**: Foundational 완료 후 시작 — 다른 US 불필요
- **US2 (P2)**: US1 loadConfig 함수(T005) 위에 preset 해석 추가 — T005 완료 필요
- **US3 (P2)**: US1 loadConfig 함수(T005) 위에 유효성 검사 추가 — T005 완료 필요
- **US4 (P3)**: statusline.js 변경 불필요 — Foundational 완료 후 독립 진행
- **US5 (P3)**: statusline.js 변경 불필요 — Foundational 완료 후 독립 진행

### Parallel Opportunities

- T002, T003: PRESETS와 FIELDS는 서로 독립적 → 병렬 가능
- T005, T013, T017: loadConfig / customize.md / validate.md → 각각 다른 파일, 병렬 가능
- T014, T015: install.sh / install.ps1 → 다른 파일, 병렬 가능
- US4, US5: 커맨드 파일 작성은 statusline.js 변경과 무관 → US1~US3 병렬 진행 가능

---

## Parallel Example: Foundational Phase

```
병렬 실행 가능:
Task T002: PRESETS 정의 in statusline/statusline.js (상단부)
Task T003: FIELDS 레지스트리 정의 in statusline/statusline.js (중간부)

순차 실행:
Task T004: renderLayout 구현 (T002 + T003 완료 후)
```

## Parallel Example: US4 + US5 (US1~US3 진행 중 병렬 가능)

```
병렬 실행:
Task T013: .claude/commands/statusline_customize.md 작성
Task T017: .claude/commands/statusline_validate.md 작성
Task T014: install.sh 업데이트
Task T015: install.ps1 업데이트
```

---

## Implementation Strategy

### MVP First (User Story 1만으로 가치 전달)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002→T003→T004)
3. Phase 3: US1 (T005→T006→T007)
4. **STOP & VALIDATE**: config 파일로 레이아웃 변경 동작 확인
5. 이미 사용 가능한 상태 — 추가 US는 선택적

### Incremental Delivery

1. Setup + Foundational → 엔진 준비
2. US1 → config 기반 레이아웃 동작 (MVP 배포 가능)
3. US2 → 프리셋 지원
4. US3 → 에러 피드백 (US2와 동시 진행 가능)
5. US4+US5 → 대화형 도구 (동시 진행 가능)
6. Polish → 문서화 + 호환성 확인

---

## Notes

- 총 태스크 수: **20개**
- [P] 병렬 가능 태스크: 8개 (T003, T013, T014, T015, T017, T019, T020 등)
- statusline.js는 단일 파일 — 같은 파일을 수정하는 T002~T011은 순차 처리 권장
- compact 프리셋의 bar+column 혼합(context+cost)은 내장 프리셋 예외로 유효성 검사 우회 (plan.md 참조)
- 수동 테스트 태스크(T007, T009, T012, T016, T018)는 실제 Claude Code 실행 환경 필요
