# Claude Code Status Line

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) 터미널에 실시간 세션 메트릭을 표시하는 커스텀 상태바입니다.

![screenshot](screenshot.png)

## 설치

```
claude plugin marketplace add socar-phoenix/claude-code-statusline && claude plugin install statusline@claude-code-statusline
```

새로운 세션을 시작하면 자동으로 적용됩니다.

## 주요 기능

- **Rate Limits** — 5시간/7일 토큰 사용량 프로그래스 바 + 리셋 시간
- **비용 & 속도** — 세션 누적 비용, 출력 속도 (tokens/sec)
- **토큰 입출력** — 누적 입력/출력 토큰
- **컨텍스트 윈도우** — 사용률 프로그래스 바
- **세션 시간** — 세션 시작 후 경과 시간
- **코드 변경량** — 추가/삭제된 라인 수
- **Git** — 현재 브랜치, git user.name 자동 감지
- **구간별 색상** — 사용량에 따라 초록/노랑/빨강 자동 변경
- **커스터마이징** — 4개 내장 프리셋, 직접 레이아웃 구성, `/statusline:customize`

## 색상 임계값

| 항목 | 초록 | 노랑 | 빨강 |
|------|------|------|------|
| Rate Limits | < 50% | 50-80% | 80%+ |
| 비용 | < $20 | $20-50 | $50+ |
| 속도 | 50+ t/s | 20-50 | < 20 |
| 컨텍스트 | < 50% | 50-80% | 80%+ |
| 세션 시간 | < 1h | 1-3h | 3h+ |

## 커스터마이징

`/statusline:customize` 실행 또는 `~/.claude/statusline.config.json` 직접 편집.

### 프리셋

```json
{"preset": "minimal"}
```

| 프리셋 | 줄 수 | 구성 |
|--------|-------|------|
| `default` | 7줄 | 전체 메트릭 |
| `focus` | 6줄 | 핵심 메트릭 |
| `compact` | 3줄 | 압축 |
| `minimal` | 3줄 | 최소 |

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

| 타입 | 필드 |
|------|------|
| inline | `model`, `git_user`, `path`, `version`, `branch` |
| bar | `context`, `five_hour`, `seven_day` |
| column | `cost`, `speed`, `io_tokens`, `session_time`, `code_lines`, `cache_ratio` |

> 같은 줄에 `bar`와 `inline`/`column` 혼합 불가

## 삭제

```
claude plugin uninstall statusline
```

