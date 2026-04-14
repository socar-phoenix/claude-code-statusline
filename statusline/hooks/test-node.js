// SessionStart 훅에서 node 실행 테스트
const fs = require("fs");
const os = require("os");
const path = require("path");

const marker = path.join(os.homedir(), ".claude", ".statusline-hook-test");
fs.writeFileSync(marker, `node hook executed at ${new Date().toISOString()}\nPLUGIN_ROOT=${process.env.CLAUDE_PLUGIN_ROOT || "undefined"}\n`);
