# Claude Code Status Line

A custom status line for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that displays real-time session metrics in your terminal.

![screenshot](screenshot.png)

## Features

- **Rate Limits** — 5-hour and 7-day token usage with progress bars
- **Cost & Speed** — Session cost and output speed (tokens/sec)
- **Token I/O** — Cumulative input/output tokens
- **Context Window** — Usage percentage with color-coded thresholds
- **Session Duration** — Time since session start
- **Lines Changed** — Lines added/removed in current session
- **Git Branch** — Current branch (shown only in git repos)
- **Git User** — Your git username displayed as a badge (optional)
- **Color-coded thresholds** — Green/Yellow/Red based on usage levels

## Quick Install

```bash
curl -sL https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/install.sh | bash
```

## Manual Install

1. Copy `statusline.js` to `~/.claude/`:

```bash
curl -sL https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/statusline.js -o ~/.claude/statusline.js
```

2. Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/statusline.js"
  }
}
```

3. Restart Claude Code.

## Color Thresholds

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Rate Limits | < 50% | 50-80% | 80%+ |
| Cost | < $20 | $20-50 | $50+ |
| Speed | 50+ t/s | 20-50 | < 20 |
| Tokens | < 100K | 100-500K | 500K+ |
| Context | < 50% | 50-80% | 80%+ |
| Session | < 1h | 1-3h | 3h+ |

## Uninstall

```bash
rm ~/.claude/statusline.js
```

Then remove the `"statusLine"` entry from `~/.claude/settings.json`.

## Requirements

- Claude Code CLI
- Node.js (bundled with Claude Code)

## License

MIT
