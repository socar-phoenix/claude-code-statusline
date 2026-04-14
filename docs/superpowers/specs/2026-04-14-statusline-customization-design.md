# Statusline 커스터마이징 설계

## 배경

현재 `claude-code-statusline`은 모든 레이아웃이 JavaScript 코드에 하드코딩되어 있어, 사용자가 표시되는 필드나 순서를 바꾸려면 파일을 직접 수정해야 한다. 이후 자동 업데이트 시 변경사항이 덮어써진다.

사용자가 안전하게 커스터마이징할 수 있도록, **config 파일 기반 선언적 구성**과 **스킬 기반 대화형 편집**을 제공한다.

## 목표

1. **필드 on/off**: 14개 필드 각각을 표시 여부 토글
2. **라인 이동**: 필드를 원하는 줄에 배치
3. **정렬 유지**: 필드를 끄거나 옮겨도 시각적 정렬이 깨지지 않음
4. **자동 업데이트와 호환**: statusline.js 자동 업데이트 시 사용자 config 보존

## Non-Goals

- 필드 개별 색상/임계값 커스터마이징 (향후 과제)
- 사용자 정의 신규 필드 추가 (플러그인 방식) — 향후 과제
- UI 프리뷰 (웹 UI 등)

## 설계

### 1. Config 파일

**위치**: `~/.claude/statusline.config.json`

**구조** (프리셋 단독):
```json
{ "preset": "minimal" }
```

**구조** (lines 직접 지정):
```json
{
  "lines": [
    ["model", "path", "branch"],
    ["context"],
    ["five_hour"]
  ]
}
```

**규칙:**
- `preset`과 `lines`는 **exclusive** (둘 다 있으면 에러 배너)
- 파일이 없으면 하드코딩된 `default` 프리셋 사용
- statusline.js가 매 실행마다 파일 읽음 (캐싱 없음 → 즉시 반영)

### 2. 필드 카탈로그

14개 필드, 3가지 type으로 분류:

| # | 필드명 | type | 설명 |
|---|---|---|---|
| 1 | `model` | inline | 🤖 모델명 |
| 2 | `git_user` | inline | 🔥 이름(표정) — git user.name + 이모지 + 표정 |
| 3 | `path` | inline | 📂 현재 경로 |
| 4 | `version` | inline | ⚙️ Claude Code 버전 |
| 5 | `branch` | inline | 🌿 git 브랜치 |
| 6 | `context` | bar | 🪶 컨텍스트 progress bar |
| 7 | `five_hour` | bar | 🔥 현재토큰 progress bar |
| 8 | `seven_day` | bar | 📊 주간토큰 progress bar |
| 9 | `cost` | column | 💰 세션비용 |
| 10 | `speed` | column | ⚡️ 출력 속도 |
| 11 | `io_tokens` | column | 🔽 입력/🔼 출력 토큰 |
| 12 | `session_time` | column | 😊 세션 경과 시간 |
| 13 | `code_lines` | column | ✏️ +/- 라인 수 |
| 14 | `cache_ratio` | column | 🔄 캐시/⚖️ Ratio |

### 3. 정렬 전략

필드 type에 따라 정렬 규칙이 다름:

- **inline**: 같은 줄에서 공백으로 구분. 줄 간 정렬 없음.
- **bar**: 여러 bar가 있을 때 라벨 폭을 가장 긴 라벨 기준으로 자동 통일. 어느 줄에 있든 라벨 시작 위치 일치.
- **column**: 같은 줄 안에서만 고정폭 정렬. 줄 간 정렬 없음.

이 규칙 덕분에 필드를 끄거나 옮겨도 정렬이 자연스럽게 유지된다.

### 4. 프리셋

`default`:
```json
{
  "lines": [
    ["model", "git_user", "path"],
    ["version", "branch"],
    ["context"],
    ["five_hour"],
    ["seven_day"],
    ["cost", "speed", "io_tokens"],
    ["session_time", "code_lines", "cache_ratio"]
  ]
}
```

`focus` (작업 집중용, 6줄):
```json
{
  "lines": [
    ["model", "path"],
    ["branch"],
    ["context"],
    ["five_hour"],
    ["seven_day"],
    ["cost", "speed", "code_lines"]
  ]
}
```

`compact` (압축 3줄):
```json
{
  "lines": [
    ["model", "path", "branch"],
    ["context", "cost"],
    ["five_hour", "speed"]
  ]
}
```

`minimal` (최소 3줄):
```json
{
  "lines": [
    ["model", "path", "branch"],
    ["context"],
    ["five_hour"]
  ]
}
```

### 5. 에러 처리

Config 검증 중 다음 오류 발생 시 statusline 최상단에 배너 1줄 출력 후 default로 fallback:

- JSON 파싱 실패
- 알 수 없는 필드명 (오타 등)
- `preset`과 `lines` 동시 지정
- 알 수 없는 preset 이름

**배너 예시:**
```
⚠️ statusline config error: unknown field "xyz" — using default
🤖 Sonnet 📂 ~/path ...
```

### 6. 스킬 구조

동일 레포(`claude-code-statusline`)에 Claude Code plugin 형태로 스킬 추가.

**디렉토리:**
```
claude-code-statusline/
├── statusline/
│   └── statusline.js
├── plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── commands/
│       ├── customize.md
│       └── validate.md
└── install.sh / install.ps1
```

**명령어:**

- `/statusline:customize` — 대화형 커스터마이징
  1. 프리셋 선택 / 프리셋 복사 후 편집 / 처음부터 구성 중 택1
  2. 선택에 따라 대화형으로 `statusline.config.json` 생성

- `/statusline:validate` — 현재 config 검증, 오류/경고 리포트

### 7. statusline.js 리팩토링

현재 하드코딩된 렌더링 흐름을 **필드 레지스트리 + 레이아웃 엔진**으로 분리:

**필드 레지스트리:**
```javascript
const FIELDS = {
  model:    { type: "inline", render: (d) => `${E.model} ${CYAN}${d.model?.display_name || ""}${R}` },
  git_user: { type: "inline", render: (d) => renderGitUser(d) },
  context:  { type: "bar",    render: (d) => renderContextBar(d) },
  cost:     { type: "column", render: (d) => renderCost(d) },
  // ...
};
```

**레이아웃 엔진:**
1. Config에서 `lines` 배열 로드 (preset 해석 포함)
2. 각 줄마다 필드 type별 렌더 호출
3. bar type끼리 라벨 폭 자동 통일
4. 줄 조립 후 stdout 출력

### 8. 자동 업데이트 호환성

- `statusline.js` 자동 업데이트는 기존처럼 동작 (GitHub raw에서 덮어쓰기)
- **`statusline.config.json`은 사용자 영역**이므로 업데이트가 건드리지 않음
- statusline.js가 항상 레지스트리 기반으로 동작하므로, 신규 필드 추가 시에도 기존 config는 무시 없이 동작

## 마이그레이션 및 호환성

- 기존 사용자: config 파일 없음 → 자동으로 `default` 프리셋 사용 → 시각적 변화 없음
- 업그레이드 시 `statusline.js`만 교체됨, 사용자 config 보존

## 리스크 및 제약

1. **bar 타입 라벨 폭 통일 로직의 시각적 정합성**
   - 여러 줄에 걸쳐 라벨이 정렬되는 규칙이 사용자 기대와 다를 수 있음
   - 완화: 구현 후 실제 출력을 다양한 preset 조합으로 시각 검증

2. **statusline 출력의 배너 1줄 소모**
   - 에러 시 1줄 사용
   - 완화: 배너는 에러 상황에서만 표시되므로 정상 동작 시 영향 없음

3. **스킬 배포 — plugin marketplace 구조**
   - 동일 레포에 플러그인을 추가하는 방식이 실제 Claude Code plugin 시스템과 호환되는지 확인 필요
   - 완화: 구현 전 샘플 플러그인 동작 검증

## Open Questions

없음 (브레인스토밍 단계에서 모두 결정).
