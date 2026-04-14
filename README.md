# Claude Code Status Line

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) 터미널에 실시간 세션 메트릭을 표시하는 커스텀 상태바입니다.

![screenshot](screenshot.png)

## 주요 기능

- **Rate Limits** — 5시간/7일 토큰 사용량 프로그래스 바 + 리셋 시간
- **비용 & 속도** — 세션 누적 비용, 출력 속도 (tokens/sec)
- **토큰 입출력** — 누적 입력/출력 토큰
- **컨텍스트 윈도우** — 사용률 프로그래스 바
- **세션 시간** — 세션 시작 후 경과 시간
- **코드 변경량** — 추가/삭제된 라인 수
- **Git 브랜치** — 현재 브랜치 (git 저장소에서만 표시)
- **Git 사용자** — git user.name 자동 감지 및 표시
- **구간별 색상** — 사용량에 따라 초록/노랑/빨강 자동 변경
- **커스터마이징** — config 파일로 레이아웃 변경, 4개 내장 프리셋, 슬래시 커맨드 지원

## 설치

```
claude plugin marketplace add socar-phoenix/claude-code-statusline
claude plugin install statusline
```

설치 후 Claude Code를 재시작하고 `/statusline:setup`을 실행하세요.

## 색상 임계값

| 항목 | 초록 | 노랑 | 빨강 |
|------|------|------|------|
| Rate Limits | < 50% | 50-80% | 80%+ |
| 비용 | < $20 | $20-50 | $50+ |
| 속도 | 50+ t/s | 20-50 | < 20 |
| 토큰 | < 100K | 100-500K | 500K+ |
| 컨텍스트 | < 50% | 50-80% | 80%+ |
| 세션 시간 | < 1h | 1-3h | 3h+ |

## 삭제

```
claude plugin uninstall statusline
```

수동 정리 (선택):
```bash
rm ~/.claude/statusline.js
rm ~/.claude/statusline.config.json   # 커스텀 설정이 있는 경우
rm ~/.claude/.statusline-last-update  # 이전 버전 잔여 파일
# settings.json에서 statusLine 항목 수동 제거
```

## 커스터마이징

`~/.claude/statusline.config.json` 파일을 생성해 표시 항목과 레이아웃을 변경할 수 있습니다.

### 프리셋 방식

```json
{"preset": "minimal"}
```

| 프리셋 | 줄 수 | 레이아웃 |
|--------|-------|---------|
| `default` | 7줄 | model git_user path / version branch / context / five_hour / seven_day / cost speed io_tokens / session_time code_lines cache_ratio |
| `focus` | 6줄 | model path / branch / context / five_hour / seven_day / cost speed code_lines |
| `compact` | 3줄 | model path branch / context cost / five_hour speed |
| `minimal` | 3줄 | model path branch / context / five_hour |

### 직접 지정 방식

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
| inline | `model` | 모델명 |
| inline | `git_user` | git user + 이모지 |
| inline | `path` | 작업 경로 |
| inline | `version` | Claude Code 버전 |
| inline | `branch` | git 브랜치 |
| bar | `context` | 컨텍스트 사용률 |
| bar | `five_hour` | 5시간 토큰 사용률 |
| bar | `seven_day` | 7일 토큰 사용률 |
| column | `cost` | 세션 비용 |
| column | `speed` | 출력 속도 |
| column | `io_tokens` | 입출력 토큰 |
| column | `session_time` | 세션 시간 |
| column | `code_lines` | 코드 변경 줄 수 |
| column | `cache_ratio` | 캐시 히트율 |

> 같은 줄에 `bar` 타입과 `inline`/`column` 타입을 함께 사용할 수 없습니다.
> 허용 조합: `inline` + `inline`, `bar` 단독, `column` + `column`

### config 오류 처리

잘못된 config는 에러 배너를 표시하고 default 레이아웃으로 자동 fallback됩니다.

```
⚠️  statusline config error: unknown preset "typo" — using default
```

플러그인 설치 시 아래 커맨드가 자동으로 등록됩니다.

### 슬래시 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/statusline:setup` | 최초 설치 후 statusLine 설정 등록 |
| `/statusline:customize` | 대화형으로 config 생성/수정 (프리셋 선택 / 직접 구성) |

## 요구사항

- Claude Code CLI

## License

MIT
