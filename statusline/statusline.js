#!/usr/bin/env node
// Claude Code 커스텀 Status Line - B안: 2줄 컴팩트, 카테고리 그룹핑

let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let d;
  try {
    d = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const E = { model:"🤖", folder:"📂", branch:"🌿", fire:"🔥", chart:"📊", cost:"💰", speed:"⚡️", input:"🔽", output:"🔼", brain:"🧠", clock:"⏱️", pencil:"✏️" };

  const R = "\x1b[0m";
  const CYAN = "\x1b[1;36m";
  const GREEN = "\x1b[1;32m";
  const YELLOW = "\x1b[1;33m";
  const BLUE = "\x1b[1;34m";
  const RED = "\x1b[1;31m";
  const WHITE = "\x1b[1;37m";
  const SEP_COLOR = "\x1b[38;5;117m"; // 하늘색
  const DOT = `${SEP_COLOR}  |  ${R}`;
  const BAR = ` ${SEP_COLOR}│${R} `;

  // ── 구간별 색상 ──
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
    if (n >= 100000000) return (n / 100000000).toFixed(1) + "억";
    if (n >= 10000) {
      const v = n / 10000;
      return (v >= 100 ? Math.round(v) : v.toFixed(1)) + "만";
    }
    if (n >= 1000) return (n / 1000).toFixed(1) + "천";
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
    const filled = Math.min(width, Math.round((pct / 100) * width));
    const empty = width - filled;
    return `${pctColor(pct)}${"▄".repeat(filled)}${"\x1b[38;5;240m"}${"▁".repeat(empty)}${R}`;
  }


  // ── 데이터 수집 ──
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
    if (added != null) parts.push(`${GREEN}+${added}줄${R}`);
    if (removed != null) parts.push(`${RED}-${removed}줄${R}`);
    linesStr = parts.join(`${WHITE}/${R}`);
  }

  // ── 유틸: 시각 폭 측정 & 패딩 ──
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
  function padL(str, w) {
    const gap = w - getVisWidth(str);
    return gap > 0 ? " ".repeat(gap) + str : str;
  }

  // ── 코딩 버디 ──
  // 이름: git user.name → 없으면 랜덤 친구 이름 (호스트 기반 고정)
  const buddyFriends = ["Pixel", "Coco", "Mochi", "Tofu", "Nori", "Boba", "Chip", "Pudding"];
  function strHash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  const companionName = gitUser || buddyFriends[strHash(require("os").hostname()) % buddyFriends.length];

  // 이모지: 이름 키워드 매칭 → 해시 기반 랜덤
  const emojiKeywords = [
    [/fire|cinder|flame|불/i, "🔥"], [/cat|neko|kitty|고양이/i, "🐱"],
    [/dog|puppy|강아지/i, "🐶"],     [/fox|여우/i, "🦊"],
    [/bear|곰/i, "🐻"],              [/panda|판다/i, "🐼"],
    [/frog|개구리/i, "🐸"],           [/owl|부엉이/i, "🦉"],
    [/penguin|펭귄/i, "🐧"],         [/flower|꽃|blossom|cherry/i, "🌸"],
  ];
  const defaultEmojis = ["🌵", "🐱", "🦊", "🐻", "🐸", "🦉", "🐧", "🌸", "🍀", "⭐"];
  function getBuddyEmoji(name) {
    for (const [re, emoji] of emojiKeywords) if (re.test(name)) return emoji;
    return defaultEmojis[strHash(name) % defaultEmojis.length];
  }
  const buddyEmoji = getBuddyEmoji(companionName);

  function getBuddyExpr() {
    if (!companionName) return "";
    const tokenPct = Math.max(
      d.rate_limits?.five_hour?.used_percentage || 0,
      d.rate_limits?.seven_day?.used_percentage || 0
    );

    if (tokenPct >= 100)  return "(X.X)";    // 초과
    if (tokenPct >= 90)   return "(>.<)";    // 거의 소진
    if (tokenPct >= 80)   return "(;_;)";    // 위험
    if (tokenPct >= 70)   return "(-_-)";    // 불안
    if (tokenPct >= 50)   return "(o.o)";    // 보통
    if (tokenPct >= 30)   return "(^.^)";    // 여유
    return "(n.n)";                           // 넉넉
  }

  // ── Line 1: 모델 / 버디 / 경로 ──
  const CINDER_COLOR = "\x1b[38;5;208m";
  const expr = getBuddyExpr();
  const companionLabel = companionName ? `  ${CINDER_COLOR}${buddyEmoji} ${companionName} ${GREEN}${expr}${R}` : "";
  const line1Left = `${E.model} ${CYAN}${d.model?.display_name || ""}${R}`;
  const COL_W = getVisWidth(line1Left);
  const SP = "  ";
  const line1 = line1Left + companionLabel + SP + `${E.folder} ${BLUE}${dir}${R}`;

  // ── Line 1.5: 깃 브랜치 (별도 줄) ──
  const lineGit = gitBranch ? `${E.branch} ${GREEN}${gitBranch}${R}` : "";

  // ── 오른쪽 서브 컬럼 폭 ──
  const RC1 = 18;
  const RC2 = 18;

  // ── Line 1b: 컨텍스트 (브랜치 아래) ──
  function weightEmoji(pct) {
    if (pct >= 80)  return "🏋️";  // 한계
    if (pct >= 60)  return "😤";  // 무거움
    if (pct >= 40)  return "💪";  // 좀 묵직
    if (pct >= 20)  return "🧳";  // 짐 있음
    return "🪶";                   // 가벼움
  }
  const L4a = ctx ? `${weightEmoji(ctxPct)} ${WHITE}컨텍스트${R} ${progressBar(ctxPct, 30)}` : "";
  const L4c1 = ctx ? `${pctColor(ctxPct)}${String(ctxPct).padStart(3)}%${R} ${pctColor(ctxPct)}${fmtTokens(usedTokens)}${WHITE}/${fmtTokens(ctx.context_window_size)}${R}` : "";
  const lineCtx = ctx ? padR(L4a, COL_W) + SP + padR(L4c1, RC1) : "";

  // ── Line 2: 현재토큰 (100% 초과 시 추가 비용 표시) ──
  const fiveHDisplay = Math.min(fiveHPct, 100);
  const L2a = `${E.fire} ${WHITE}현재토큰${R} ${progressBar(fiveHDisplay, 30)}`;
  const fiveHOver = fiveHPct > 100 ? ` ${RED}(초과)${R}` : "";
  const L2c1 = `${pctColor(fiveHPct)}${String(fiveHDisplay).padStart(3)}%${WHITE}${fiveHReset}${R}${fiveHOver}`;
  const line2 = padR(L2a, COL_W) + SP + padR(L2c1, RC1);

  // ── Line 2b: 주간토큰 ──
  const L3a = `${E.chart} ${WHITE}주간토큰${R} ${progressBar(sevenDPct, 30)}`;
  const L3c1 = `${pctColor(sevenDPct)}${String(sevenDPct).padStart(3)}%${WHITE}${sevenDReset}${R}`;
  const line2b = padR(L3a, COL_W) + SP + padR(L3c1, RC1);

  // ── Line 3: 비용 + 속도 + 입력 ──
  const L2c2 = `${E.cost} ${WHITE}세션비용 ${costColor(costVal)}$${costVal != null ? costVal.toFixed(2) : "0.00"}${R}`;
  const L2c3 = `${E.speed} ${WHITE}속도 ${speedColor(tpsVal)}${tpsVal != null ? tpsVal.toFixed(1) : "-"} t/s${R}`;
  const L3c2 = `${E.input} ${WHITE}입력 ${tokenColor(inTokens)}${fmtTokens(inTokens)}${R}${WHITE}/${R} ${E.output}${WHITE}출력 ${tokenColor(outTokens)}${fmtTokens(outTokens)}${R}`;
  const line3 = padR(L2c2, COL_W) + SP + padR(L2c3, RC1) + SP + padR(L3c2, COL_W);

  // ── Line 3b: 세션시작 + 코드변경 + 출력 + 캐시/비율 ──
  const hours = (duration || 0) / 3600000;
  function fatigueEmoji(h) {
    if (h >= 4)   return "🥵";  // 과로
    if (h >= 3)   return "😵";  // 지침
    if (h >= 2)   return "😫";  // 힘듦
    if (h >= 1.5) return "😓";  // 피곤
    if (h >= 1)   return "😐";  // 슬슬
    if (h >= 0.5) return "😊";  // 괜찮음
    return "😎";                 // 상쾌
  }
  const L4c2 = duration ? `${fatigueEmoji(hours)} ${WHITE}세션 ${durationColor(duration)}${fmtDuration(duration)}${R}` : "";
  const L4c3 = linesStr ? `${E.pencil} ${linesStr}` : "";
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheCreate = usage.cache_creation_input_tokens || 0;
  const totalIn = (usage.input_tokens || 0) + cacheRead + cacheCreate;
  const cacheHit = totalIn > 0 ? (cacheRead / totalIn * 100).toFixed(0) : "-";
  const oiRatio = inTokens && outTokens ? (outTokens / inTokens).toFixed(1) : "-";
  const cacheRatioStr = `🔄 ${WHITE}캐시${R} ${GREEN}${cacheHit}%${R} ${WHITE}/${R} ⚖️ ${WHITE}Ratio${R} ${CYAN}${oiRatio}${R}`;
  const line3b = padR(L4c2 || "", COL_W) + SP + padR(L4c3 || "", RC1) + SP + padR(cacheRatioStr, COL_W);

  // ── 출력 ──
  const ver = d.version || "";
  const lineGitVer = `⚙️ ${BLUE}v${ver}${R}` + (gitBranch ? `  ${E.branch} ${GREEN}${gitBranch}${R}` : "");
  const dataLines = [line1, lineGitVer, lineCtx, line2, line2b, line3, line3b].filter(Boolean);
  process.stdout.write(dataLines.join("\n") + "\n");
});
