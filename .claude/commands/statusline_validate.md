# /statusline:validate

`~/.claude/statusline.config.json` 파일을 읽어 유효성을 검사하고 결과를 리포트한다.
config 파일은 **절대 수정하지 않는다** (읽기 전용 작업).

## 실행 절차

### 1단계: 파일 읽기

`~/.claude/statusline.config.json` 파일을 읽는다.

**파일이 없는 경우** → 아래 메시지를 출력하고 종료:

```
ℹ️  No config file found at ~/.claude/statusline.config.json
   Using default preset (7 lines)
   Run /statusline:customize to create a custom config
```

### 2단계: JSON 파싱

파일 내용을 JSON으로 파싱한다.

**파싱 실패 시** → 오류 목록에 추가:
- `invalid JSON`

### 3단계: 유효성 검사

파싱 성공 시 아래 규칙을 **모두** 검사한다 (첫 번째 오류에서 멈추지 말고 전체 검사).

#### 규칙 1: preset + lines 동시 지정 금지

`preset` 필드와 `lines` 필드가 **둘 다** 존재하면:
- `use either "preset" or "lines", not both`

이 오류가 있으면 이후 규칙 3~9는 건너뛴다.

#### 규칙 2: preset 또는 lines 중 하나는 반드시 존재

`preset`도 없고 `lines`도 없으면:
- `must specify "preset" or "lines"`

이 오류가 있으면 이후 규칙은 건너뛴다.

#### 규칙 3: 알 수 없는 최상위 필드

`preset`, `lines` 외의 다른 필드가 있으면, 각각:
- `unknown field "{fieldName}"`

#### 규칙 4: preset 값 검증 (preset 방식인 경우)

`preset` 값이 다음 4개 중 하나가 아니면:
- `default`, `focus`, `compact`, `minimal`

오류: `unknown preset "{name}"`

#### 규칙 5: lines 배열 비어있음 (lines 방식인 경우)

`lines` 배열의 길이가 0이면:
- `"lines" must not be empty`

이 오류가 있으면 규칙 6~9는 건너뛴다.

#### 규칙 6: 각 줄 배열 비어있음

`lines[N]` (0-indexed)의 길이가 0이면:
- `line {N+1}: must not be empty`  (1-indexed로 표시)

#### 규칙 7: 알 수 없는 필드명

허용된 field name 목록:

```
inline 타입: model, git_user, path, version, branch
bar 타입:    context, five_hour, seven_day
column 타입: cost, speed, io_tokens, session_time, code_lines, cache_ratio
```

전체 14개 중 하나가 아닌 필드명이 있으면:
- `unknown field "{name}"`

#### 규칙 8: 중복 필드

전체 `lines` 배열에서 동일한 필드명이 두 번 이상 등장하면:
- `duplicate field "{name}"`

첫 번째 중복 발견 시에만 오류 추가 (같은 필드명을 여러 번 오류에 추가하지 않음).

#### 규칙 9: 타입 혼합 (같은 줄 내)

한 줄 안에 `bar` 타입 필드 (`context`, `five_hour`, `seven_day`)와
`inline` 또는 `column` 타입 필드가 **함께** 있으면:
- `line {N+1}: cannot mix bar with inline/column fields`

### 4단계: 결과 출력

#### 오류가 있는 경우

```
❌ statusline config errors found:
  - {오류 메시지 1}
  - {오류 메시지 2}
  ...
Suggestion: run /statusline:customize to fix
```

#### 유효한 경우 — preset 방식

```
✅ statusline config is valid
Preset: {preset 이름}
```

#### 유효한 경우 — lines 방식

```
✅ statusline config is valid
Layout:
  Line 1: {field1}, {field2}, ...
  Line 2: {field1}, ...
  ...
```

## 주의사항

- config 파일을 **읽기만** 하고 절대 수정하지 않는다
- 오류는 첫 번째 발견 시 멈추지 말고 **모두** 수집한 후 한 번에 출력한다
- 단, 규칙 1 오류(preset + lines 동시 지정)가 있으면 규칙 3~9 검사는 생략한다
- 단, 규칙 2 오류(둘 다 없음)가 있으면 이후 규칙 검사는 생략한다
- 단, 규칙 5 오류(lines 배열이 빔)가 있으면 규칙 6~9 검사는 생략한다
