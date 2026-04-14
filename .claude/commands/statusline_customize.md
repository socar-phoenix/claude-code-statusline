# /statusline:customize

`~/.claude/statusline.config.json` 설정 커맨드.

## 실행 지침

### 1단계: 현재 설정 + 프리셋 목록

`~/.claude/statusline.config.json`을 읽고, 현재 설정과 프리셋 선택지를 한 번에 표시한다.

```
현재 설정: {현재 프리셋명 또는 "default (config 파일 없음)" 또는 "커스텀 레이아웃"}

프리셋을 선택하세요:

  1) default (7줄)
     model, git_user, path / version, branch / context / five_hour / seven_day / cost, speed, io_tokens / session_time, code_lines, cache_ratio

  2) focus (6줄)
     model, path / branch / context / five_hour / seven_day / cost, speed, code_lines

  3) compact (3줄)
     model, path, branch / context, cost / five_hour, speed

  4) minimal (3줄)
     model, path, branch / context / five_hour

  5) 직접 구성 (고급)
```

### 2단계: 선택 처리

**1~4 선택 시** → 미리보기 표시:

```
프리셋: minimal
  Line 1: model, path, branch     [inline]
  Line 2: context                 [bar]
  Line 3: five_hour               [bar]

적용할까요? (y/n)
```

- `y` → `{"preset": "<이름>"}` 저장 → 완료
- `n` → 1단계로 돌아감

**5 선택 시** → 직접 구성 흐름으로 진행

### 3단계: 완료

```
✅ ~/.claude/statusline.config.json 저장 완료
```

---

## 프리셋 레이아웃 참고

- **default** (7줄): `["model","git_user","path"], ["version","branch"], ["context"], ["five_hour"], ["seven_day"], ["cost","speed","io_tokens"], ["session_time","code_lines","cache_ratio"]`
- **focus** (6줄): `["model","path"], ["branch"], ["context"], ["five_hour"], ["seven_day"], ["cost","speed","code_lines"]`
- **compact** (3줄): `["model","path","branch"], ["context","cost"], ["five_hour","speed"]`
- **minimal** (3줄): `["model","path","branch"], ["context"], ["five_hour"]`

---

## 직접 구성 흐름

### 필드 안내

```
사용 가능한 필드:
  [inline] model, git_user, path, version, branch
  [bar]    context, five_hour, seven_day
  [column] cost, speed, io_tokens, session_time, code_lines, cache_ratio

bar 필드는 다른 타입과 같은 줄에 배치 불가
```

### 줄별 입력

```
Line 1 (쉼표 구분): model, path, branch
Line 2 (빈 입력으로 완료): context
Line 3 (빈 입력으로 완료): five_hour
Line 4 (빈 입력으로 완료):
```

빈 입력 시 → 미리보기 → 확인 → 저장

### 유효성 검사

- 필드명 14개 허용값 체크
- 전체 lines 필드 중복 불가
- 같은 줄 bar + inline/column 혼합 불가

위반 시 경고 후 재입력