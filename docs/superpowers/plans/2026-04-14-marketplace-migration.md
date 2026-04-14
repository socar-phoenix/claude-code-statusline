# Marketplace 배포 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** install.sh/install.ps1 기반 배포를 Claude Code 플러그인 marketplace 배포로 전환한다.

**Architecture:** 플러그인 디렉터리(`statusline/`) 안에 commands, hooks를 통합 배치. SessionStart 훅으로 플러그인 캐시→고정 경로 자동 동기화. setup 스킬로 최초 statusLine 등록.

**Tech Stack:** JavaScript (Node.js 내장 모듈 only — `fs`, `os`, `path`), Claude Code Plugin System

**Spec:** `docs/superpowers/specs/2026-04-14-marketplace-migration-design.md`

---

### Task 1: SessionStart 훅 생성 (sync.js + hooks.json)

**Files:**
- Create: `statusline/hooks/sync.js`
- Modify: `statusline/hooks/hooks.json` (테스트용 기존 파일 교체)

- [ ] **Step 1: 테스트 훅 파일 제거**

기존 테스트용 `statusline/hooks/test-node.js` 삭제:

```bash
rm statusline/hooks/test-node.js
```

- [ ] **Step 2: hooks.json 작성**

`statusline/hooks/hooks.json`을 실제 내용으로 교체:

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

- [ ] **Step 3: sync.js 작성**

`statusline/hooks/sync.js` — 플러그인 캐시 → `~/.claude/statusline.js` 동기화:

```javascript
#!/usr/bin/env node
// SessionStart 훅: 플러그인 캐시의 statusline.js를 고정 경로로 동기화
const fs = require("fs");
const os = require("os");
const path = require("path");

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
if (!pluginRoot) process.exit(0);

const src = path.join(pluginRoot, "statusline.js");
const destDir = path.join(os.homedir(), ".claude");
const dest = path.join(destDir, "statusline.js");

try {
  const srcContent = fs.readFileSync(src, "utf8");
  let destContent = "";
  try { destContent = fs.readFileSync(dest, "utf8"); } catch {}
  if (srcContent !== destContent) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(dest, srcContent);
  }
} catch {}
```

- [ ] **Step 4: sync.js 직접 실행 테스트**

```bash
CLAUDE_PLUGIN_ROOT=/Users/admin/Projects/claude-code-statusline/statusline node statusline/hooks/sync.js
cat ~/.claude/statusline.js | head -3
```

Expected: `statusline.js`의 첫 3줄이 출력됨.

- [ ] **Step 5: 커밋**

```bash
git add statusline/hooks/
git commit -m "feat: SessionStart 훅 추가 — 플러그인 캐시→고정 경로 자동 동기화"
```

---

### Task 2: setup 커맨드 생성

**Files:**
- Create: `statusline/commands/setup.md`

- [ ] **Step 1: commands 디렉터리 생성**

```bash
mkdir -p statusline/commands
```

- [ ] **Step 2: setup.md 작성**

`statusline/commands/setup.md`:

```markdown
---
description: "statusline 초기 설정 — settings.json에 statusLine 등록"
---

# /statusline:setup

Claude Code 상태바를 활성화하기 위해 `~/.claude/settings.json`에 statusLine 설정을 등록한다.

## 실행 지침

### 1단계: settings.json 읽기

`~/.claude/settings.json`을 읽는다.
- 파일이 없으면 `{}` 로 초기화하여 생성한다.

### 2단계: statusLine 필드 확인

`statusLine` 필드를 확인하고 분기 처리:

**A) 미설정 (statusLine 필드 없음)**

아래 값을 추가한다:

\```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/statusline.js"
  }
}
\```

완료 메시지:
\```
✅ statusLine 설정 완료
   command: node ~/.claude/statusline.js
   Claude Code를 재시작하면 상태바가 표시됩니다.
\```

**B) 이미 statusline.js로 설정됨 (command에 "statusline.js" 포함)**

\```
ℹ️ statusLine이 이미 설정되어 있습니다.
   현재: <현재 command 값>
\```

**C) 다른 값이 설정됨**

현재 값을 표시하고 사용자에게 확인:

\```
⚠️ statusLine에 다른 command가 설정되어 있습니다.
   현재: <현재 command 값>

statusline으로 변경하시겠습니까?
\```

- 사용자가 승인하면 A와 동일하게 등록 (완료 메시지 + 재시작 안내 포함)
- 거부하면 변경 없이 종료

### 주의사항

- `~/.claude/settings.json`의 다른 필드는 절대 수정하지 않는다
- statusLine 외의 키는 건드리지 않는다
```

- [ ] **Step 3: 커밋**

```bash
git add statusline/commands/setup.md
git commit -m "feat: /statusline:setup 커맨드 추가 — statusLine settings.json 등록"
```

---

### Task 3: customize 커맨드 이동

**Files:**
- Move: `.claude/commands/statusline_customize.md` → `statusline/commands/customize.md`
- Delete: `.claude/commands/statusline_update.md`

- [ ] **Step 1: customize 커맨드 이동 + frontmatter 추가**

`.claude/commands/statusline_customize.md`를 `statusline/commands/customize.md`로 이동하고 frontmatter를 추가한다:

```bash
mv .claude/commands/statusline_customize.md statusline/commands/customize.md
```

파일 상단에 frontmatter 추가:

```markdown
---
description: "statusline 레이아웃 커스터마이징 (프리셋 선택 / 직접 구성)"
---
```

기존 첫 줄 `# /statusline:customize`는 유지.

- [ ] **Step 2: statusline_update.md 삭제**

```bash
rm .claude/commands/statusline_update.md
```

- [ ] **Step 3: .claude/commands/ 디렉터리 정리**

남은 파일 확인:

```bash
ls .claude/commands/
```

비어있으면 디렉터리 삭제:

```bash
rmdir .claude/commands/ 2>/dev/null || true
```

- [ ] **Step 4: 커밋**

```bash
git add -A .claude/commands/ statusline/commands/customize.md
git commit -m "refactor: 커맨드 파일 플러그인 디렉터리로 이동 + update 커맨드 제거"
```

---

### Task 4: statusline.js 자동 업데이트 로직 제거

**Files:**
- Modify: `statusline/statusline.js:1-32`

- [ ] **Step 1: 자동 업데이트 IIFE 제거**

`statusline/statusline.js`에서 4~30줄(checkUpdate IIFE 전체)을 삭제한다:

```
삭제 범위:
Line 4:  // ── 자동 업데이트 (24h마다 최신 버전 백그라운드 다운로드) ──
Line 5:  (function checkUpdate() {
  ...
Line 30: })();
```

삭제 후 파일은 이렇게 시작해야 한다:

```javascript
#!/usr/bin/env node
// Claude Code 커스텀 Status Line - B안: 2줄 컴팩트, 카테고리 그룹핑

// ── 기존 파이프 모드 ──
let input = "";
```

- [ ] **Step 2: 동작 확인**

```bash
echo '{}' | node statusline/statusline.js
```

Expected: 에러 없이 실행됨 (빈 JSON이므로 기본 출력).

- [ ] **Step 3: 커밋**

```bash
git add statusline/statusline.js
git commit -m "refactor: 자동 업데이트 로직 제거 — SessionStart 훅으로 대체"
```

---

### Task 5: install 스크립트 삭제

**Files:**
- Delete: `install.sh`
- Delete: `install.ps1`

- [ ] **Step 1: install 스크립트 삭제**

```bash
rm install.sh install.ps1
```

- [ ] **Step 2: 커밋**

```bash
git rm install.sh install.ps1
git commit -m "chore: install.sh, install.ps1 삭제 — 플러그인 시스템으로 대체"
```

---

### Task 6: README 업데이트

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 설치 섹션 교체**

`## 설치` 섹션(20~32줄)을 교체:

```markdown
## 설치

```
claude plugin marketplace add socar-phoenix/claude-code-statusline
claude plugin install statusline
```

설치 후 Claude Code를 재시작하고 `/statusline:setup`을 실행하세요.
```

- [ ] **Step 2: 삭제 섹션 교체**

`## 삭제` 섹션(45~93줄)을 교체:

```markdown
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
```

- [ ] **Step 3: 슬래시 커맨드 섹션 업데이트**

`### 슬래시 커맨드` 테이블(154~161줄)을 교체:

```markdown
### 슬래시 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/statusline:setup` | 최초 설치 후 statusLine 설정 등록 |
| `/statusline:customize` | 대화형으로 config 생성/수정 (프리셋 선택 / 직접 구성) |
```

- [ ] **Step 4: 설치 스크립트 언급 제거**

156줄 `설치 스크립트가 ~/.claude/commands/에 커맨드 파일도 함께 설치합니다.` 문장을 제거하거나 교체:

```markdown
플러그인 설치 시 아래 커맨드가 자동으로 등록됩니다.
```

- [ ] **Step 5: 커밋**

```bash
git add README.md
git commit -m "docs: README 설치/삭제 방법을 플러그인 시스템으로 변경"
```

---

### Task 7: validate + 최종 검증

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 플러그인 유효성 검증**

```bash
claude plugin validate /Users/admin/Projects/claude-code-statusline
```

Expected: `✔ Validation passed`

- [ ] **Step 2: 디렉터리 구조 확인**

```bash
ls -R statusline/
```

Expected:
```
statusline/:
commands/  hooks/  plugin.json  statusline.js

statusline/commands:
customize.md  setup.md

statusline/hooks:
hooks.json  sync.js
```

- [ ] **Step 3: 삭제된 파일 확인**

```bash
ls install.sh install.ps1 .claude/commands/statusline_update.md 2>&1
```

Expected: 모두 `No such file or directory`

- [ ] **Step 4: statusline.js에 자동 업데이트 로직 없는지 확인**

```bash
head -10 statusline/statusline.js
```

Expected: `checkUpdate` 또는 `자동 업데이트` 문자열 없음.
