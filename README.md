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

## 설치

**macOS / Linux**
```bash
curl -sL https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/install.sh | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/install.ps1 | iex
```

설치 후 바로 적용됩니다.

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

```bash
rm ~/.claude/statusline.js
```

`~/.claude/settings.json`에서 `"statusLine"` 항목을 제거합니다.

## 요구사항

- Claude Code CLI
- Node.js (Claude Code에 포함)

## License

MIT
