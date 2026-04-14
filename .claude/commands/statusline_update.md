# /statusline:update

statusline.js와 커맨드 파일을 GitHub 최신 버전으로 업데이트한다.

## 실행 절차

### 1단계: 현재 상태 확인

`~/.claude/statusline.js` 파일이 존재하는지 확인한다.

- 파일이 없으면: `statusline이 설치되어 있지 않습니다. install.sh를 먼저 실행하세요.` 출력 후 종료

### 2단계: 업데이트 실행

아래 명령을 실행하여 최신 파일을 다운로드한다.

```bash
# statusline.js 업데이트
curl -sL https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/statusline/statusline.js -o ~/.claude/statusline.js
chmod +x ~/.claude/statusline.js

# 커맨드 파일 업데이트
mkdir -p ~/.claude/commands
curl -sL https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/.claude/commands/statusline_customize.md -o ~/.claude/commands/statusline_customize.md
curl -sL https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/.claude/commands/statusline_validate.md -o ~/.claude/commands/statusline_validate.md
curl -sL https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/.claude/commands/statusline_update.md -o ~/.claude/commands/statusline_update.md
```

### 3단계: 결과 출력

```
✅ statusline 업데이트 완료
  - statusline.js
  - statusline_customize.md
  - statusline_validate.md
  - statusline_update.md
```

## 주의사항

- `~/.claude/statusline.config.json` (사용자 설정)은 건드리지 않는다
- `~/.claude/settings.json`은 건드리지 않는다
- 기존 파일을 덮어쓴다
