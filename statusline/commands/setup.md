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

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/statusline.js"
  }
}
```

완료 메시지:
```
✅ statusLine 설정 완료
   command: node ~/.claude/statusline.js
   Claude Code를 재시작하면 상태바가 표시됩니다.
```

**B) 이미 statusline.js로 설정됨 (command에 "statusline.js" 포함)**

```
ℹ️ statusLine이 이미 설정되어 있습니다.
   현재: <현재 command 값>
```

**C) 다른 값이 설정됨**

현재 값을 표시하고 사용자에게 확인:

```
⚠️ statusLine에 다른 command가 설정되어 있습니다.
   현재: <현재 command 값>

statusline으로 변경하시겠습니까?
```

- 사용자가 승인하면 A와 동일하게 등록 (완료 메시지 + 재시작 안내 포함)
- 거부하면 변경 없이 종료

### 주의사항

- `~/.claude/settings.json`의 다른 필드는 절대 수정하지 않는다
- statusLine 외의 키는 건드리지 않는다
