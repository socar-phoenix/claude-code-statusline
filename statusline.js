#!/usr/bin/env node
// Claude Code Custom Status Line — Dashboard style with color-coded metrics

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let d;
  try {
    d = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const R = "\x1b[0m";
  const CYAN = "\x1b[1;36m";
  const GREEN = "\x1b[1;32m";
  const YELLOW = "\x1b[1;33m";
  const BLUE = "\x1b[1;34m";
  const RED = "\x1b[1;31m";
  const WHITE = "\x1b[1;37m";
  const LOGO_COLOR = "\x1b[1;38;5;208m";

  // ── Color thresholds ──
  function pctColor(pct) {
    if (pct >= 80) return RED;
    if (pct >= 50) return YELLOW;
    return GREEN;
  }
  function tokenColor(n) {
    if (n == null) return WHITE;
    if (n >= 500000) return RED;
    if (n >= 100000) return YELLOW;
    return GREEN;
  }
  function costColor(usd) {
    if (usd == null) return WHITE;
    if (usd >= 50) return RED;
    if (usd >= 20) return YELLOW;
    return GREEN;
  }
  function speedColor(tps) {
    if (tps == null) return WHITE;
    if (tps >= 50) return GREEN;
    if (tps >= 20) return YELLOW;
    return RED;
  }
  function durationColor(ms) {
    if (ms == null) return WHITE;
    const hours = ms / 3600000;
    if (hours >= 3) return RED;
    if (hours >= 1) return YELLOW;
    return GREEN;
  }

  function fmtTokens(n) {
    if (n == null) return "-";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }
  function fmtDuration(ms) {
    if (!ms) return "-";
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h${m}m` : `${m}m`;
  }
  function progressBar(pct, width) {
    const filled = Math.round((pct / 100) * width);
    const empty = width - filled;
    return `${pctColor(pct)}${"█".repeat(filled)}${"\x1b[38;5;240m"}${"░".repeat(empty)}${R}`;
  }

  // ── Visual width & padding ──
  function getVisWidth(line) {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, "");
    let width = 0;
    for (const ch of stripped) {
      const cp = ch.codePointAt(0);
      if (cp === 0xFE0F) continue;
      if (cp > 0xFFFF || (cp >= 0xAC00 && cp <= 0xD7AF) || (cp >= 0x3000 && cp <= 0x303F) || (cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x2600 && cp <= 0x27BF) || (cp >= 0x2300 && cp <= 0x23FF)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }
  function padR(str, w) {
    const gap = w - getVisWidth(str);
    return gap > 0 ? str + " ".repeat(gap) : str;
  }

  // ── Data collection ──
  const ctx = d.context_window;
  const cwd = d.workspace?.current_dir || d.cwd || "";
  const home = process.env.HOME || "";
  const dir = home && cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd;

  const { execFileSync } = require("child_process");
  let gitBranch = "";
  try {
    gitBranch = execFileSync("git", ["-C", cwd || ".", "symbolic-ref", "--short", "HEAD"],
      { encoding: "utf8", timeout: 1000, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" }, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
  } catch {}
  let gitUser = "";
  try {
    gitUser = execFileSync("git", ["config", "--global", "user.name"],
      { encoding: "utf8", timeout: 1000, stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
  } catch {}

  const ctxPct = Math.round(ctx?.used_percentage || 0);
  const usage = ctx?.current_usage || {};
  const usedTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0)
    + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);

  const fiveH = d.rate_limits?.five_hour;
  const sevenD = d.rate_limits?.seven_day;
  const fiveHPct = fiveH ? Math.round(fiveH.used_percentage) : 0;
  const sevenDPct = sevenD ? Math.round(sevenD.used_percentage) : 0;

  function fmtReset(resets_at) {
    if (!resets_at) return "";
    const diff = resets_at * 1000 - Date.now();
    if (diff <= 0) return "";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return ` ↻${h}h${m}m`;
  }
  const fiveHReset = fmtReset(fiveH?.resets_at);
  const sevenDReset = fmtReset(sevenD?.resets_at);

  const costVal = d.cost?.total_cost_usd;
  const duration = d.cost?.total_duration_ms;
  const inTokens = ctx?.total_input_tokens;
  const outTokens = ctx?.total_output_tokens;
  const tpsVal = (outTokens && d.cost?.total_api_duration_ms)
    ? outTokens / (d.cost.total_api_duration_ms / 1000)
    : null;
  const added = d.cost?.total_lines_added;
  const removed = d.cost?.total_lines_removed;

  let linesStr = "";
  if (added != null || removed != null) {
    const parts = [];
    if (added != null) parts.push(`${GREEN}+${added}${R}`);
    if (removed != null) parts.push(`${RED}-${removed}${R}`);
    linesStr = parts.join(`${WHITE}/${R}`);
  }

  // ── Layout ──
  const SP = "  ";
  const line1Left = `🤖 ${CYAN}${d.model?.display_name || ""}${R}`;
  const COL_W = getVisWidth(line1Left);
  const RC1 = 18;
  const RC2 = 18;

  // Line 1: Model / Path
  const line1 = line1Left + SP + `📂 ${BLUE}${dir}${R}`;

  // Line 1.5: Git branch (only in git repos)
  const lineGit = gitBranch ? `🌿 ${GREEN}${gitBranch}${R}` : "";

  // Line 2: 5H + 7D Rate Limits + Cost + Speed + Input + Output
  const L2a = `🔥 ${WHITE}5H${R} ${progressBar(fiveHPct, 10)}`;
  const L2c1 = `${pctColor(fiveHPct)}${fiveHPct}%${WHITE}${fiveHReset}${R}`;
  const L3a = `📊 ${WHITE}7D${R} ${progressBar(sevenDPct, 10)}`;
  const L3c1 = `${pctColor(sevenDPct)}${sevenDPct}%${WHITE}${sevenDReset}${R}`;
  const L2c2 = `💰 ${WHITE}Cost ${costColor(costVal)}$${costVal != null ? costVal.toFixed(2) : "0.00"}${R}`;
  const L2c3 = `⚡️ ${WHITE}Speed ${speedColor(tpsVal)}${tpsVal != null ? tpsVal.toFixed(1) : "-"} t/s${R}`;
  const L3c2 = `📥 ${WHITE}In ${tokenColor(inTokens)}${fmtTokens(inTokens)}${R}`;
  const L3c3 = `📤 ${WHITE}Out ${tokenColor(outTokens)}${fmtTokens(outTokens)}${R}`;
  const line2 = padR(L2a, COL_W) + SP + padR(L2c1, RC1) + SP + padR(L3a, COL_W) + SP + padR(L3c1, RC1) + SP + padR(L2c2, RC2) + SP + padR(L2c3, RC2) + SP + padR(L3c2, RC2) + SP + L3c3;

  // Line 3: Context + Session + Lines + Claude version + Git user
  const L4a = `🧠 ${WHITE}Context${R} ${progressBar(ctxPct, 10)}`;
  const L4c1 = `${pctColor(ctxPct)}${ctxPct}%${R} ${pctColor(ctxPct)}${fmtTokens(usedTokens)}${WHITE}/${fmtTokens(ctx.context_window_size)}${R}`;
  const L4c2 = duration ? `⏱️ ${WHITE}Session ${durationColor(duration)}${fmtDuration(duration)}${R}` : "";
  const L4c3 = linesStr ? `✏️ ${linesStr}` : "";
  const ver = d.version || "";
  const L5b = `🤖 ${BLUE}Claude v${ver}${R}`;
  const userName = gitUser ? `~ ${gitUser.toUpperCase()} ~` : "";
  const L5a = gitUser ? `${LOGO_COLOR}🔥 ${userName} 🔥${R}` : "";
  const line3 = ctx ? padR(L4a, COL_W) + SP + padR(L4c1, RC1) + SP + padR(L4c2 || "", COL_W) + SP + padR(L4c3 || "", RC1) + SP + padR(L5b, RC2) + SP + L5a : "";

  process.stdout.write([line1, lineGit, line2, line3].filter(Boolean).join("\n") + "\n");
});
