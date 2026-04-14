# Data Model: Statusline Customization

**Phase**: 1  
**Date**: 2026-04-14

## Config File Schema

**경로**: `~/.claude/statusline.config.json`

```json
// 프리셋 방식
{ "preset": "minimal" }

// 직접 지정 방식
{
  "lines": [
    ["model", "path", "branch"],
    ["context"],
    ["five_hour"]
  ]
}
```

### 유효성 규칙

| 조건 | 처리 |
|------|------|
| 파일 없음 | default 프리셋 사용 (배너 없음) |
| JSON 파싱 실패 | 에러 배너 + default fallback |
| `{}` (둘 다 없음) | 에러 배너 + default fallback |
| `preset` + `lines` 동시 지정 | 에러 배너 + default fallback |
| 알 수 없는 preset 이름 | 에러 배너 + default fallback |
| 알 수 없는 필드명 | 에러 배너 + default fallback |
| `lines: []` (빈 배열) | 에러 배너 + default fallback |
| 같은 줄에 타입 혼합 (bar+inline/column) | 에러 배너 + default fallback |
| 중복 필드 | 에러 배너 + default fallback |
| 읽기 권한 없음 | 조용히 default fallback (배너 없음) |

---

## Field Registry

14개 필드, 3가지 타입:

### inline 타입 (같은 줄에 공백 구분)

| 필드명 | 이모지 | 설명 |
|--------|--------|------|
| `model` | 🤖 | 모델명 |
| `git_user` | 🔥 | git user.name + 이모지 + 표정 |
| `path` | 📂 | 현재 작업 경로 |
| `version` | ⚙️ | Claude Code 버전 |
| `branch` | 🌿 | git 브랜치명 |

### bar 타입 (라벨 + progress bar; 라벨 폭 자동 통일)

| 필드명 | 이모지 | 설명 |
|--------|--------|------|
| `context` | 🪶→🏋️ | 컨텍스트 progress bar |
| `five_hour` | 🔥 | 5시간 토큰 progress bar |
| `seven_day` | 📊 | 주간 토큰 progress bar |

### column 타입 (같은 줄 내 고정폭 정렬)

| 필드명 | 이모지 | 설명 |
|--------|--------|------|
| `cost` | 💰 | 세션 비용 |
| `speed` | ⚡️ | 출력 속도 (t/s) |
| `io_tokens` | 🔽🔼 | 입력/출력 토큰 |
| `session_time` | 😊→😵 | 세션 경과 시간 |
| `code_lines` | ✏️ | +/- 코드 라인 수 |
| `cache_ratio` | 🔄⚖️ | 캐시 비율 / O/I ratio |

---

## Preset Definitions

### `default` (7줄)
```json
[
  ["model", "git_user", "path"],
  ["version", "branch"],
  ["context"],
  ["five_hour"],
  ["seven_day"],
  ["cost", "speed", "io_tokens"],
  ["session_time", "code_lines", "cache_ratio"]
]
```

### `focus` (6줄)
```json
[
  ["model", "path"],
  ["branch"],
  ["context"],
  ["five_hour"],
  ["seven_day"],
  ["cost", "speed", "code_lines"]
]
```

### `compact` (3줄)
```json
[
  ["model", "path", "branch"],
  ["context", "cost"],
  ["five_hour", "speed"]
]
```

### `minimal` (3줄)
```json
[
  ["model", "path", "branch"],
  ["context"],
  ["five_hour"]
]
```

> **compact 주의**: `context`(bar)와 `cost`(column)가 같은 줄 — 타입 혼합 규칙 위반이 아닌가?
>
> **해석**: `compact`의 `["context", "cost"]`는 bar + column 혼합이다. 설계 문서에서 compact는 공식 지원 프리셋이므로 **내장 프리셋은 유효성 검사를 우회**하거나, 해당 케이스를 허용 예외로 처리해야 한다.
>
> → **구현 결정 필요**: `/speckit.tasks` 전에 이 예외를 명확히 결정할 것.

---

## 레이아웃 엔진 처리 흐름

```
loadConfig()
  ├── 파일 없음 → resolvedLines = PRESETS.default
  ├── 읽기 실패 → resolvedLines = PRESETS.default (배너 없음)
  ├── 파싱 실패 → errorBanner + resolvedLines = PRESETS.default
  ├── 유효성 실패 → errorBanner + resolvedLines = PRESETS.default
  └── 성공 → preset 해석 or lines 직접 사용 → resolvedLines

renderLayout(resolvedLines, data)
  ├── 모든 bar 필드 라벨 폭 최대값 계산
  ├── 각 줄 순회
  │   ├── inline: 렌더 후 공백 join
  │   ├── bar: maxLabelWidth 적용 후 렌더
  │   └── column: RC 고정폭 적용 후 렌더
  └── 줄 배열 → stdout
```
