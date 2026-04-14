# /statusline:customize

statusline 프리셋을 선택하는 인터랙티브 TUI를 실행한다.

## 실행 지침

아래 명령을 실행한다:

```bash
node ~/.claude/statusline.js --setup
```

이 명령은 터미널에서 방향키(↑↓)로 프리셋을 선택하고, Enter로 적용하는 인터랙티브 메뉴를 표시한다.

## 직접 구성 (고급)

프리셋 대신 필드를 직접 선택하려면 `~/.claude/statusline.config.json`을 수동으로 편집한다:

```json
{
  "lines": [
    ["model", "path", "branch"],
    ["context"],
    ["five_hour"],
    ["cost", "speed"]
  ]
}
```

### 사용 가능한 필드 (14개)

| 타입 | 필드 |
|------|------|
| inline | `model`, `git_user`, `path`, `version`, `branch` |
| bar | `context`, `five_hour`, `seven_day` |
| column | `cost`, `speed`, `io_tokens`, `session_time`, `code_lines`, `cache_ratio` |

### 규칙

- 같은 줄에 `bar` + `inline`/`column` 혼합 불가
- 전체 lines에서 필드 중복 불가
