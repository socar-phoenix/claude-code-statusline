#!/usr/bin/env node
// SessionStart 훅: 플러그인 캐시의 statusline.js를 고정 경로로 동기화
const fs = require("fs");
const os = require("os");
const path = require("path");

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
if (!pluginRoot) process.exit(0);

const src = path.join(pluginRoot, "statusline.js");
const destDir = path.join(os.homedir(), ".claude");
const dest = path.join(destDir, "statusline.js");

try {
  const srcContent = fs.readFileSync(src, "utf8");
  let destContent = "";
  try { destContent = fs.readFileSync(dest, "utf8"); } catch {}
  if (srcContent !== destContent) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.writeFileSync(dest, srcContent);
  }
} catch {}
