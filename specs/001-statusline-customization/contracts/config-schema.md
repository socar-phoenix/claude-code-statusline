# Contract: statusline.config.json Schema

**Type**: User-owned configuration file  
**Path**: `~/.claude/statusline.config.json`  
**Consumed by**: `statusline.js` (every render)

## Schema

```json
// variant A: preset 방식
{
  "preset": "default" | "focus" | "compact" | "minimal"
}

// variant B: lines 직접 지정
{
  "lines": [
    [fieldName, ...],  // 1줄
    [fieldName, ...],  // 2줄
    // ...
  ]
}
```

### fieldName 허용값

```
"model" | "git_user" | "path" | "version" | "branch"
"context" | "five_hour" | "seven_day"
"cost" | "speed" | "io_tokens" | "session_time" | "code_lines" | "cache_ratio"
```

## 유효성 제약

1. `preset`과 `lines` 중 **정확히 하나**만 존재해야 한다
2. `lines` 배열은 비어있으면 안 된다 (`length >= 1`)
3. 각 줄 배열은 비어있으면 안 된다 (`length >= 1`)
4. `fieldName`은 위 14개 허용값 중 하나여야 한다
5. 동일 필드명이 전체 `lines`에서 중복될 수 없다
6. 같은 줄 내 필드의 타입이 모두 동일해야 한다 (단, 내장 프리셋 예외 처리 필요 — data-model.md 참조)
7. `preset` 값은 4개 허용값 중 하나여야 한다

## 오류 메시지 형식

```
⚠️  statusline config error: {message} — using default
```

| 오류 유형 | message |
|-----------|---------|
| JSON 파싱 실패 | `invalid JSON` |
| preset + lines 동시 지정 | `use either "preset" or "lines", not both` |
| preset/lines 모두 없음 | `must specify "preset" or "lines"` |
| 알 수 없는 preset | `unknown preset "{name}"` |
| 빈 lines 배열 | `"lines" must not be empty` |
| 알 수 없는 필드명 | `unknown field "{name}"` |
| 중복 필드 | `duplicate field "{name}"` |
| 타입 혼합 | `line {n}: cannot mix bar with inline/column fields` |
