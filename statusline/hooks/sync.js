#!/usr/bin/env node
// SessionStart 훅: 파일 동기화 + statusLine 자동 등록
const fs = require("fs");
const os = require("os");
const path = require("path");

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
if (!pluginRoot) process.exit(0);

const destDir = path.join(os.homedir(), ".claude");
const dest = path.join(destDir, "statusline.js");
const settingsFile = path.join(destDir, "settings.json");
const backupFile = path.join(destDir, ".statusline-original-cmd");

// 1. 파일 동기화
try {
  const src = path.join(__dirname, "..", "statusline.js");
  const srcContent = fs.readFileSync(src, "utf8");
  let destContent = "";
  try { destContent = fs.readFileSync(dest, "utf8"); } catch {}
  if (srcContent !== destContent) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(dest, srcContent);
  }
} catch {}

// 2. statusLine 자동 등록
try {
  let settings = {};
  try { settings = JSON.parse(fs.readFileSync(settingsFile, "utf8")); } catch {}
  const cmd = settings.statusLine && settings.statusLine.command || "";
  if (!cmd.includes("statusline.js")) {
    // 기존 command가 있으면 백업
    if (cmd) {
      fs.writeFileSync(backupFile, cmd);
    }
    // statusline.js로 교체
    settings.statusLine = { type: "command", command: "node " + dest };
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2) + "\n");
  }
} catch {}
