# Claude Code Status Line

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) 터미널에 실시간 세션 메트릭을 표시하는 커스텀 상태바입니다.

![screenshot](screenshot.png)

## 설치

```
claude plugin marketplace add socar-phoenix/claude-code-statusline && claude plugin install statusline@claude-code-statusline
```

새로운 세션을 시작하면 자동으로 적용됩니다.

## 주요 기능

- **Rate Limits** — 5시간/7일 토큰 사용량 프로그래스 바 + 리셋 카운트다운
- **비용 & 속도** — 세션 누적 비용(USD), 출력 속도 (tokens/sec)
- **토큰 입출력** — 세션 누적 입력/출력 토큰
- **컨텍스트 윈도우** — 현재 사용률 프로그래스 바 + 사용/최대 토큰
- **세션 시간** — 세션 시작 후 경과 시간
- **코드 변경량** — 이번 세션에서 추가/삭제된 라인 수
- **Git** — 현재 브랜치, git user.name 자동 감지
- **구간별 색상** — 사용량에 따라 초록/노랑/빨강 자동 변경
- **커스터마이징** — 4개 내장 프리셋, 직접 레이아웃 구성, `/statusline:customize`

## 필드 상세 설명

### inline 타입

| 필드 | 표시 내용 | 비고 |
|------|-----------|------|
| `model` | 🤖 현재 사용 중인 Claude 모델명 | — |
| `git_user` | 이름 + 표정 이모지 | git `user.name` 기반, 없으면 호스트명으로 고정 랜덤 이름 할당 |
| `path` | 📂 현재 작업 디렉터리 | 홈 디렉터리는 `~`로 축약 |
| `version` | ⚙️ Claude Code 버전 | — |
| `branch` | 🌿 현재 git 브랜치 | git 저장소가 아니면 미표시 |

#### `git_user` — 코딩 버디

`git config user.name` 값을 읽어 표시합니다. 이름에 키워드가 포함되면 매칭 이모지를, 없으면 호스트명 해시로 고정 이모지를 할당합니다.

**표정**은 Rate Limit 사용량에 따라 실시간으로 변합니다:

| 사용량 | 표정 | 상태 |
|--------|------|------|
| < 30% | `(n.n)` | 넉넉 |
| 30–50% | `(^.^)` | 여유 |
| 50–70% | `(o.o)` | 보통 |
| 70–80% | `(-_-)` | 불안 |
| 80–90% | `(;_;)` | 위험 |
| 90–100% | `(>.<)` | 거의 소진 |
| 100%+ | `(X.X)` | 초과 |

### bar 타입

진행률 막대(`▄▄▄▁▁▁`)로 사용량을 시각화합니다. 사용량 색상은 [아래 임계값](#색상-임계값) 참조.

| 필드 | 표시 내용 | 동적 요소 |
|------|-----------|-----------|
| `context` | 컨텍스트 윈도우 사용률 | 라벨 이모지가 사용률에 따라 변함 (🪶→🧳→💪→😤→🏋️) |
| `five_hour` | 5시간 토큰 Rate Limit | 우측에 리셋까지 남은 시간 표시 (`↻Xh Ym`), 100% 초과 시 `(초과)` 표시 |
| `seven_day` | 7일 토큰 Rate Limit | 우측에 리셋까지 남은 시간 표시 (`↻Xh Ym`) |

#### `context` 라벨 이모지

| 사용률 | 이모지 | 상태 |
|--------|--------|------|
| < 20% | 🪶 | 가벼움 |
| 20–40% | 🧳 | 짐 있음 |
| 40–60% | 💪 | 좀 묵직 |
| 60–80% | 😤 | 무거움 |
| 80%+ | 🏋️ | 한계 |

### column 타입

| 필드 | 표시 내용 | 동적 요소 |
|------|-----------|-----------|
| `cost` | 💰 세션 누적 비용 (USD) | 금액에 따라 색상 변경 |
| `speed` | ⚡️ 출력 토큰 속도 (t/s) | 속도에 따라 색상 변경 |
| `io_tokens` | 🔽 입력 / 🔼 출력 토큰 수 | 토큰량에 따라 색상 변경 |
| `session_time` | 세션 경과 시간 | 피로도 이모지가 경과 시간에 따라 변함 |
| `code_lines` | ✏️ 추가/삭제 라인 수 | 변경 내역이 없으면 미표시 |
| `cache_ratio` | 🔄 캐시 히트율 / ⚖️ 입출력 토큰 비율 | — |

#### `session_time` 피로도 이모지

| 경과 시간 | 이모지 | 상태 |
|-----------|--------|------|
| < 30분 | 😎 | 상쾌 |
| 30분–1시간 | 😊 | 괜찮음 |
| 1–1.5시간 | 😐 | 슬슬 |
| 1.5–2시간 | 😓 | 피곤 |
| 2–3시간 | 😫 | 힘듦 |
| 3–4시간 | 😵 | 지침 |
| 4시간+ | 🥵 | 과로 |

## 색상 임계값

| 항목 | 초록 | 노랑 | 빨강 |
|------|------|------|------|
| Rate Limits / 컨텍스트 | < 50% | 50–80% | 80%+ |
| 비용 | < $20 | $20–50 | $50+ |
| 속도 | 50+ t/s | 20–50 | < 20 |
| 세션 시간 | < 1h | 1–3h | 3h+ |
| 토큰량 | < 10만 | 10만–50만 | 50만+ |

## 커스터마이징

`/statusline:customize` 실행 또는 `~/.claude/statusline.config.json` 직접 편집.

### 프리셋

```json
{"preset": "minimal"}
```

| 프리셋 | 줄 수 | 구성 |
|--------|-------|------|
| `default` | 7줄 | 전체 메트릭 |
| `focus` | 6줄 | 핵심 메트릭 (git_user, version, io_tokens, session_time, cache_ratio 제외) |
| `compact` | 3줄 | 압축 (model+path+branch / context+cost / five_hour+speed) |
| `minimal` | 3줄 | 최소 (model+path+branch / context / five_hour) |

### 직접 구성

```json
{
  "lines": [
    ["model", "path", "branch"],
    ["context"],
    ["five_hour"]
  ]
}
```

### 사용 가능한 필드

| 타입 | 필드 | 설명 |
|------|------|------|
| `inline` | `model` | 모델명 |
| `inline` | `git_user` | 코딩 버디 (이름 + 표정) |
| `inline` | `path` | 작업 디렉터리 |
| `inline` | `version` | Claude Code 버전 |
| `inline` | `branch` | git 브랜치 |
| `bar` | `context` | 컨텍스트 윈도우 사용률 |
| `bar` | `five_hour` | 5시간 Rate Limit |
| `bar` | `seven_day` | 7일 Rate Limit |
| `column` | `cost` | 세션 비용 |
| `column` | `speed` | 출력 속도 |
| `column` | `io_tokens` | 입출력 토큰 수 |
| `column` | `session_time` | 세션 경과 시간 |
| `column` | `code_lines` | 코드 변경 라인 수 |
| `column` | `cache_ratio` | 캐시 히트율 / 토큰 비율 |

> 커스텀 config에서는 `bar`와 `inline`/`column`을 같은 줄에 혼합 불가 (내장 프리셋은 예외)  
> 동일 필드를 여러 줄에 중복 배치 불가

## 삭제

```
claude plugin uninstall statusline
```
