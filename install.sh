#!/bin/bash
set -e

# $HOME이 잘못 설정된 경우를 대비해 시스템에서 직접 홈 디렉토리를 가져옴
HOME=$(eval echo ~$(whoami))

STATUSLINE_DIR="$HOME/.claude"
STATUSLINE_FILE="$STATUSLINE_DIR/statusline.js"
SETTINGS_FILE="$STATUSLINE_DIR/settings.json"
RAW_URL="https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/statusline/statusline.js"

echo "Installing Claude Code Status Line..."

# 1. Download statusline.js
mkdir -p "$STATUSLINE_DIR"
curl -sL "$RAW_URL" -o "$STATUSLINE_FILE"
chmod +x "$STATUSLINE_FILE"
echo "  Downloaded statusline.js -> $STATUSLINE_FILE"

# 2. Configure settings.json
if [ ! -f "$SETTINGS_FILE" ]; then
  echo '{}' > "$SETTINGS_FILE"
fi

# 현재 statusLine command 읽기
CURRENT_CMD=$(node -e "
  const fs = require('fs');
  try {
    const s = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));
    console.log((s.statusLine && s.statusLine.command) ? s.statusLine.command : '');
  } catch { console.log(''); }
" 2>/dev/null)

if [ -z "$CURRENT_CMD" ]; then
  # statusLine 미설정 → 새로 추가
  node -e "
    const fs = require('fs');
    const f = '$SETTINGS_FILE';
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    s.statusLine = { type: 'command', command: 'node $STATUSLINE_FILE' };
    fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
  "
  echo "  Configured statusLine in settings.json"
elif echo "$CURRENT_CMD" | grep -q "statusline-collector.js"; then
  # socar-board collector 감지 → original_statusline_cmd에 등록 (pass-through)
  SOCAR_BOARD_DIR="$HOME/.config/socar-board"
  mkdir -p "$SOCAR_BOARD_DIR"
  echo "node $STATUSLINE_FILE" > "$SOCAR_BOARD_DIR/original_statusline_cmd"
  echo "  socar-board collector 감지 → pass-through 등록"
  echo "    $SOCAR_BOARD_DIR/original_statusline_cmd"
elif echo "$CURRENT_CMD" | grep -q "statusline.js"; then
  # 이미 설치된 경우 → 스킵
  echo "  statusLine already configured (skipped)"
else
  # 알 수 없는 다른 statusLine → 스킵 후 안내
  echo "  statusLine already configured with a different command (skipped)"
  echo "  To update manually:"
  echo "    \"statusLine\": { \"type\": \"command\", \"command\": \"node $STATUSLINE_FILE\" }"
fi

# 3. 업데이트 마커 초기화 (설치 직후 불필요한 업데이트 체크 방지)
echo "$(date +%s)000" > "$STATUSLINE_DIR/.statusline-last-update"

echo ""
echo "Done! Status line is now active."
echo ""
echo "To uninstall:"
echo "  rm $STATUSLINE_FILE"
echo "  # Remove \"statusLine\" from $SETTINGS_FILE"
