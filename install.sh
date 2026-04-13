#!/bin/bash
set -e

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

# Check if statusLine already configured
if grep -q '"statusLine"' "$SETTINGS_FILE" 2>/dev/null; then
  echo "  statusLine already configured in settings.json (skipped)"
  echo "  To update manually:"
  echo "    \"statusLine\": { \"type\": \"command\", \"command\": \"node $STATUSLINE_FILE\" }"
else
  # Add statusLine to settings.json using node (safe JSON manipulation)
  node -e "
    const fs = require('fs');
    const f = '$SETTINGS_FILE';
    const s = JSON.parse(fs.readFileSync(f, 'utf8'));
    s.statusLine = { type: 'command', command: 'node $STATUSLINE_FILE' };
    fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
  "
  echo "  Configured statusLine in settings.json"
fi

echo ""
echo "Done! Restart Claude Code to see the status line."
echo ""
echo "To uninstall:"
echo "  rm $STATUSLINE_FILE"
echo "  # Remove \"statusLine\" from $SETTINGS_FILE"
