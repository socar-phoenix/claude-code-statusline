# /statusline:customize

`~/.claude/statusline.config.json`을 대화형으로 생성하거나 수정하는 커맨드.

---

## 실행 지침

### 0단계: 현재 설정 표시

`~/.claude/statusline.config.json` 파일을 읽어 현재 상태를 표시한다.

- 파일이 없으면: `현재 default 프리셋 사용 중 (config 파일 없음)`
- `{"preset": "minimal"}` 형태이면: `현재 프리셋: minimal`
- `{"lines": [...]}` 형태이면: 각 줄의 필드 목록을 표시
  ```
  현재 커스텀 레이아웃:
    Line 1: model, path
    Line 2: context
    Line 3: five_hour
  ```

### 1단계: 흐름 선택

다음 세 가지 선택지를 제시한다.

```
어떻게 설정하시겠습니까?
  A) 프리셋 선택  (default / focus / compact / minimal)
  B) 프리셋 복사 후 편집
  C) 처음부터 직접 구성
```

사용자의 응답에 따라 해당 흐름으로 진행한다.

---

## 흐름 A: 프리셋 선택

1. 다음 4개 프리셋을 설명과 함께 제시한다.

   ```
   1) default  — 7줄, 모든 필드 포함 (model, git_user, path / version, branch / context / five_hour / seven_day / cost, speed, io_tokens / session_time, code_lines, cache_ratio)
   2) focus    — 6줄, 핵심 필드 중심 (model, path / branch / context / five_hour / seven_day / cost, speed, code_lines)
   3) compact  — 3줄, 간결한 구성 (model, path, branch / context, cost / five_hour, speed)
   4) minimal  — 3줄, 최소 구성 (model, path, branch / context / five_hour)
   ```

2. 사용자가 프리셋 이름 또는 번호를 선택하면, 아래 형식으로 `~/.claude/statusline.config.json`에 저장한다.

   ```json
   {"preset": "<선택한 프리셋 이름>"}
   ```

---

## 흐름 B: 프리셋 복사 후 편집

### B-1: 기준 프리셋 선택

흐름 A와 동일한 프리셋 목록을 제시하고, 기준으로 삼을 프리셋을 선택하게 한다.

### B-2: 현재 레이아웃 표시

선택한 프리셋의 `lines` 구조를 펼쳐서 표시한다.

```
선택한 프리셋: focus
현재 레이아웃:
  Line 1: model, path
  Line 2: branch
  Line 3: context
  Line 4: five_hour
  Line 5: seven_day
  Line 6: cost, speed, code_lines
```

**프리셋별 lines 정의 (참고용)**:

- `default` (7줄):
  - Line 1: `model`, `git_user`, `path`
  - Line 2: `version`, `branch`
  - Line 3: `context`
  - Line 4: `five_hour`
  - Line 5: `seven_day`
  - Line 6: `cost`, `speed`, `io_tokens`
  - Line 7: `session_time`, `code_lines`, `cache_ratio`

- `focus` (6줄):
  - Line 1: `model`, `path`
  - Line 2: `branch`
  - Line 3: `context`
  - Line 4: `five_hour`
  - Line 5: `seven_day`
  - Line 6: `cost`, `speed`, `code_lines`

- `compact` (3줄):
  - Line 1: `model`, `path`, `branch`
  - Line 2: `context`, `cost`
  - Line 3: `five_hour`, `speed`

- `minimal` (3줄):
  - Line 1: `model`, `path`, `branch`
  - Line 2: `context`
  - Line 3: `five_hour`

### B-3: 편집

다음 편집 옵션을 반복적으로 제공한다. 완료를 선택할 때까지 계속한다.

```
편집 옵션:
  1) 필드 추가  — 줄 번호와 필드명 입력
  2) 필드 제거  — 줄 번호와 필드명 입력
  3) 필드 이동  — 원본 줄 번호, 필드명, 대상 줄 번호 입력
  4) 줄 추가    — 새 빈 줄 삽입
  5) 줄 삭제    — 줄 번호 입력
  6) 완료       — 저장
```

편집 중 타입 혼합 경고를 표시한다 (B-3-경고 참조).

### B-4: 저장

완료 시 `{"lines": [...]}` 형식으로 저장한다.

---

## 흐름 C: 처음부터 직접 구성

### C-1: 필드 안내

사용 가능한 14개 필드를 타입별로 안내한다.

```
사용 가능한 필드:
  [inline] model, git_user, path, version, branch
  [bar]    context, five_hour, seven_day
  [column] cost, speed, io_tokens, session_time, code_lines, cache_ratio

⚠️  타입 혼합 주의:
  - 같은 줄에는 같은 타입의 필드만 배치하세요
  - bar 필드(context, five_hour, seven_day)는 다른 타입과 같은 줄에 배치할 수 없습니다
```

### C-2: 줄별 구성

줄 1부터 시작해서 반복적으로 필드를 추가한다.

```
Line 1에 포함할 필드를 입력하세요 (쉼표 구분, 예: model, path):
```

각 줄 입력 후:
- 유효성 검사 (타입 혼합 경고 포함)
- 계속 줄 추가 여부 질문: `다음 줄을 추가하시겠습니까? (y/n)`
- n이면 저장 단계로 진행

### C-3: 저장

`{"lines": [...]}` 형식으로 저장한다.

---

## 타입 혼합 경고 (공통)

bar 타입 필드(`context`, `five_hour`, `seven_day`)를 inline 또는 column 필드와 같은 줄에 배치하려 할 때 경고를 표시한다.

```
⚠️  경고: bar 타입 필드(context)는 inline/column 필드와 같은 줄에 배치할 수 없습니다.
    별도 줄에 배치하거나 다른 필드를 선택하세요.
```

경고 후 해당 입력을 무시하고 다시 입력받는다.

---

## 유효성 검사 규칙

저장 전 다음 조건을 반드시 확인한다.

1. `lines` 배열이 비어있지 않을 것 (`length >= 1`)
2. 각 줄 배열이 비어있지 않을 것 (`length >= 1`)
3. 모든 필드명이 아래 14개 허용값 중 하나일 것:
   `model`, `git_user`, `path`, `version`, `branch`, `context`, `five_hour`, `seven_day`, `cost`, `speed`, `io_tokens`, `session_time`, `code_lines`, `cache_ratio`
4. 전체 `lines`에서 동일한 필드명이 중복되지 않을 것
5. 같은 줄 내 필드 타입이 모두 동일할 것 (bar ↔ inline/column 혼용 금지)

위반 시 사용자에게 알리고 수정 기회를 제공한다.

---

## 저장 단계

유효성 검사를 통과하면 `~/.claude/statusline.config.json`에 JSON을 저장한다.

- 흐름 A: `{"preset": "<name>"}` 형식
- 흐름 B/C: `{"lines": [["field1", "field2"], ["field3"], ...]}` 형식

파일이 이미 존재하면 덮어쓴다.

---

## 완료 메시지

저장 성공 후 다음 형식으로 결과를 출력한다.

```
✅ ~/.claude/statusline.config.json 저장 완료

레이아웃 미리보기:
  Line 1: model, path, branch     [inline]
  Line 2: context                 [bar]
  Line 3: five_hour               [bar]
```

흐름 A(프리셋 저장)인 경우:

```
✅ ~/.claude/statusline.config.json 저장 완료

프리셋: minimal
레이아웃 미리보기:
  Line 1: model, path, branch     [inline]
  Line 2: context                 [bar]
  Line 3: five_hour               [bar]
```
