# Contract: Custom Claude Code Commands

**Type**: Claude Code 슬래시 커맨드  
**설치 경로**: `~/.claude/commands/statusline_customize.md`, `~/.claude/commands/statusline_validate.md`  
**소스 경로**: `.claude/commands/statusline_customize.md`, `.claude/commands/statusline_validate.md`

---

## `/statusline:customize`

**목적**: 대화형 레이아웃 설정을 통해 `~/.claude/statusline.config.json` 생성/수정

**진입 흐름**:

```
1. 현재 config 상태 표시 (없으면 "현재 default 프리셋 사용 중")
2. 선택지 제시:
   A) 프리셋 선택 (default / focus / compact / minimal)
   B) 프리셋 복사 후 편집
   C) 처음부터 직접 구성
3A) → 프리셋 이름 선택 → {"preset": "..."} 저장
3B) → 프리셋 선택 → lines 표시 → 필드 추가/제거/이동 → {"lines": [...]} 저장
3C) → 줄별로 필드 선택 → {"lines": [...]} 저장
4. 저장 완료 메시지 + 미리보기 (어떤 필드가 어느 줄에 위치하는지)
```

**사전 조건**: 없음 (config 파일 없어도 실행 가능)

**사후 조건**: `~/.claude/statusline.config.json`이 유효한 JSON으로 존재

---

## `/statusline:validate`

**목적**: 현재 `~/.claude/statusline.config.json` 유효성 검사 및 리포트

**출력 형식**:

```
// 유효한 경우
✅ statusline config is valid
Preset: minimal
Layout:
  Line 1: model, path, branch
  Line 2: context
  Line 3: five_hour

// 오류가 있는 경우
❌ statusline config errors found:
  - unknown field "xyz"
  - use either "preset" or "lines", not both
Suggestion: run /statusline:customize to fix

// 파일 없는 경우
ℹ️  No config file found at ~/.claude/statusline.config.json
   Using default preset (7 lines)
   Run /statusline:customize to create a custom config
```

**사전 조건**: 없음

**사후 조건**: config 파일 변경 없음 (읽기 전용 작업)
