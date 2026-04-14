# Marketplace 배포 전환 디자인

## 개요

claude-code-statusline을 현재 install.sh/install.ps1 기반 배포에서 Claude Code 플러그인 marketplace 배포로 전환한다.

## 배경

- Claude Code에 공식 플러그인 시스템이 존재함 (`claude plugin install/update/uninstall`)
- 현재 프로젝트는 이미 `.claude-plugin/marketplace.json`과 `statusline/plugin.json`을 갖추고 있으며, `claude plugin validate` 통과
- archivist 플러그인(`socar-inc/claude-archivist`)이 동일한 구조로 운영 중 — 참조 모델로 사용

## 제약사항

- 플러그인 `settings.json`은 `agent`와 `subagentStatusLine` 키만 지원 — `statusLine` 키는 자동 등록 불가
- 플러그인 update 후 lifecycle hook 없음 — SessionStart 훅으로 우회
- 플러그인 캐시 경로에 버전 번호 포함 (`~/.claude/plugins/cache/.../1.0.0/`) — 고정 경로로 동기화 필요

## 디자인

### 디렉터리 구조

```
변경 전                              변경 후
├── .claude/                         ├── statusline/
│   └── commands/                    │   ├── plugin.json
│       ├── statusline_customize.md  │   ├── statusline.js
│       └── statusline_update.md     │   ├── commands/
├── statusline/                      │   │   ├── setup.md        (신규)
│   ├── plugin.json                  │   │   └── customize.md    (이동+리네임)
│   └── statusline.js                │   └── hooks/
├── install.sh                       │       ├── hooks.json      (신규)
├── install.ps1                      │       └── sync.js         (신규)
└── .claude-plugin/                  │
    └── marketplace.json             ├── .claude-plugin/
                                     │   └── marketplace.json
                                     │
                                     (삭제: install.sh, install.ps1,
                                      .claude/commands/statusline_update.md,
                                      .claude/commands/statusline_customize.md)
```

- 커맨드 파일명에서 `statusline_` prefix 제거 — 플러그인 시스템이 `/statusline:` prefix를 자동 부여
- 커맨드 파일에 frontmatter(`---` description `---`) 추가 (archivist 패턴)
- `commands/`, `hooks/` 디렉터리는 플러그인 시스템이 자동 인식 (plugin.json 선언 불필요)

### 설치 흐름

```
최초 설치:
1. claude plugin marketplace add socar-phoenix/claude-code-statusline
2. claude plugin install statusline
3. Claude Code 재시작
4. /statusline:setup   ← statusLine settings.json 등록 (1회)

이후 업데이트:
1. claude plugin update statusline
2. Claude Code 재시작
3. SessionStart 훅이 자동으로 캐시 → 고정 경로 동기화
```

### `/statusline:setup` 스킬

Claude에게 지시하는 `.md` 파일. 실행 시 Claude가 Read/Edit 도구로 직접 처리.

동작:
1. `~/.claude/settings.json` 읽기
2. `statusLine` 필드 확인:
   - 미설정 → `statusLine` 등록 후 완료
   - 이미 `statusline.js`로 설정됨 → "이미 설정됨" 안내
   - 다른 값 존재 → 현재 값 표시 + 덮어쓸지 사용자에게 확인
3. 완료 메시지 + "Claude Code 재시작 필요" 안내

OS 구분 불필요 — Claude가 플랫폼 무관하게 JSON 파일을 편집.

### SessionStart 훅

`statusline/hooks/hooks.json`:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/sync.js\""
          }
        ]
      }
    ]
  }
}
```

`statusline/hooks/sync.js` 동작:
1. `${CLAUDE_PLUGIN_ROOT}/statusline.js`와 `~/.claude/statusline.js` 비교
2. 다르면 복사
3. 같으면 스킵

Node.js 스크립트이므로 OS 호환 문제 없음.

### `statusline.js` 변경

- 자동 업데이트 로직 (1~30줄) 제거 — SessionStart 훅 + `claude plugin update`가 대체

### 삭제 대상

| 파일 | 이유 |
|------|------|
| `install.sh` | 플러그인 시스템이 대체 |
| `install.ps1` | 플러그인 시스템이 대체 |
| `.claude/commands/statusline_update.md` | `claude plugin update`가 대체 |
| `.claude/commands/statusline_customize.md` | `statusline/commands/customize.md`로 이동 |
| `statusline.js` 내 자동 업데이트 로직 | SessionStart 훅이 대체 |

### README 변경

설치 방법:
```
claude plugin marketplace add socar-phoenix/claude-code-statusline
claude plugin install statusline
# Claude Code 재시작 후
/statusline:setup
```

삭제 방법:
```
claude plugin uninstall statusline
```

### Marketplace

자체 marketplace(`socar-phoenix/claude-code-statusline`) 사용. 기존 `.claude-plugin/marketplace.json` 활용.

## Unchanged Behavior

- statusline.js의 실제 렌더링 로직 — 변경 없음
- `/statusline:customize` 기능 — 파일 위치만 이동, 동작 동일
- `statusline.config.json` 커스터마이즈 시스템 — 변경 없음
- `~/.claude/statusline.js` 고정 경로 — settings.json이 참조하는 경로 동일
