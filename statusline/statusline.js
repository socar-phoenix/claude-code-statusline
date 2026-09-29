#!/usr/bin/env node
// Claude Code 커스텀 Status Line - B안: 2줄 컴팩트, 카테고리 그룹핑

// ── Fable 주간 한도 캐시 경로 ──
// 상태줄 stdin JSON에는 five_hour/seven_day만 옴 (모델별 한도 없음).
// Fable 전용 주간 한도는 /usage 엔드포인트에만 있어 백그라운드로 받아 캐시한다.
const FABLE_CACHE = require("path").join(require("os").homedir(), ".claude", "usage-fable-cache.json");

// ── 갱신 모드: `node statusline.js --refresh-fable` 로 백그라운드 spawn됨 ──
// Keychain의 OAuth 토큰으로 /usage 조회 → Fable(weekly_scoped) 사용률만 캐시에 기록.
// stdin 렌더링 경로를 타지 않도록 여기서 종료(top-level return, CommonJS 모듈 스코프).
if (process.argv.includes("--refresh-fable")) {
  refreshFableCache();
  return;
}

// GET → JSON (https 모듈 사용 — Node fetch 버전 의존 회피)
function httpsGetJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = require("https").get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    req.setTimeout(10000, () => req.destroy(new Error("timeout")));
  });
}

// OAuth 액세스 토큰 조회 — Keychain 우선, 없으면 파일 기반 자격증명.
// 같은 서비스명("Claude Code-credentials")에 항목이 여러 개 존재할 수 있다.
// acct 없이 조회하면 MCP OAuth 전용 항목(acct="unknown")이 먼저 잡혀 토큰을 못 찾으므로
// 로그인 사용자명으로 먼저 지정 조회한 뒤, 못 찾으면 acct 없이 재시도한다.
function readOAuthToken() {
  const pick = (c) => c?.claudeAiOauth?.accessToken || c?.accessToken || null;
  const base = ["find-generic-password", "-s", "Claude Code-credentials"];
  let user = "";
  try { user = require("os").userInfo().username; } catch {}
  const attempts = [user ? [...base, "-a", user, "-w"] : null, [...base, "-w"]].filter(Boolean);
  for (const args of attempts) {
    try {
      const raw = require("child_process").execFileSync("security", args,
        { encoding: "utf8", timeout: 5000 }).trim();
      const t = pick(JSON.parse(raw));
      if (t) return t;
    } catch {}
  }
  try {
    const p = require("path").join(require("os").homedir(), ".claude", ".credentials.json");
    const t = pick(JSON.parse(require("fs").readFileSync(p, "utf8")));
    if (t) return t;
  } catch {}
  return null;
}

// 갱신 실패를 캐시에 기록 — fetched_at(마지막 성공 시각)은 건드리지 않아 stale 판정이 유지된다.
function recordFableError(reason) {
  try {
    const fs = require("fs");
    let prev = {};
    try { prev = JSON.parse(fs.readFileSync(FABLE_CACHE, "utf8")); } catch {}
    fs.writeFileSync(FABLE_CACHE, JSON.stringify({
      ...prev, error: reason, error_at: Math.floor(Date.now() / 1000),
    }));
  } catch {}
}

// 토큰으로 /usage 조회 → Fable 주간 사용률 캐시 기록. 실패해도 상태줄 렌더는 막지 않는다.
async function refreshFableCache() {
  let tok;
  try {
    tok = readOAuthToken();
  } catch (e) {
    return recordFableError("creds:" + (e.message || "unknown").slice(0, 40));
  }
  if (!tok) return recordFableError("no_token");
  try {
    const data = await httpsGetJson("https://api.anthropic.com/api/oauth/usage", {
      Authorization: "Bearer " + tok, "anthropic-beta": "oauth-2025-04-20",
    });
    if (data && data.error) {
      return recordFableError("api:" + String(data.error.type || data.error).slice(0, 40));
    }
    let fable = null;
    for (const l of (data.limits || [])) {
      if (l.kind === "weekly_scoped" &&
          (l.scope?.model?.display_name || "").toLowerCase() === "fable") {
        fable = { percent: l.percent, resets_at: Math.floor(new Date(l.resets_at).getTime() / 1000) };
      }
    }
    // 한도 목록에 Fable이 없으면 이전 값을 신선한 것처럼 남기지 않고 지운다
    if (!fable) return recordFableError("no_fable_limit");
    require("fs").writeFileSync(
      FABLE_CACHE,
      JSON.stringify({ ...fable, fetched_at: Math.floor(Date.now() / 1000), error: null })
    );
  } catch (e) {
    recordFableError("fetch:" + (e.message || "unknown").slice(0, 40));
  }
}

// 캐시가 없거나 stale(>5분)일 때 백그라운드 갱신 spawn (렌더는 블록하지 않음)
function triggerFableRefresh() {
  try {
    const child = require("child_process").spawn(
      process.execPath, [__filename, "--refresh-fable"],
      { detached: true, stdio: "ignore" }
    );
    child.unref();
  } catch {}
}

// ── 기존 파이프 모드 ──
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  let d;
  try {
    d = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  // ── 레이아웃 프리셋 정의 ──
  const PRESETS = {
    default: {
      lines: [
        ["model", "effort", "git_user"],
        ["version", "branch", "session"],
        ["path"],
        ["cost", "speed", "io_tokens"],
        ["session_time", "code_lines", "cache_ratio"],
        ["context", "fable"],
        ["five_hour", "seven_day"]
      ]
    },
    focus: {
      lines: [
        ["session", "model", "path"],
        ["branch"],
        ["context"],
        ["five_hour"],
        ["seven_day"],
        ["cost", "speed", "code_lines"]
      ]
    },
    compact: {
      lines: [
        ["session", "model", "path", "branch"],
        ["context", "cost"],
        ["five_hour", "speed"]
      ]
    },
    minimal: {
      lines: [
        ["model", "path", "branch"],
        ["context"],
        ["five_hour"]
      ]
    }
  };

  // ── 폭 설정 (터미널 약 150칸 기준) ──
  const BAR_WIDTH = 15;        // 기본 진행 막대 칸 수 — 기준 세그먼트 정렬이 없을 때 (있으면 renderLayout 이 윗줄에 맞춰 좌우 길이 결정)
  const BAR_PAIR_WIDTH = 27;   // 기준 세그먼트 정렬 시 좌우 막대 칸 수 — 윗줄 글자가 슬롯보다 길면 그만큼 늘림
  const BAR_PAIR_GAP = 3;      // 같은 줄 막대 사이 간격
  const LAYOUT_WIDTH = 90;     // inline 줄을 이 폭까지 열 간격을 벌려 배치
  // 오른쪽 막대 슬롯(📖 페블주간·📊 주간토큰)과 시작 열을 맞출 column 세그먼트 — session_time(🥵 세션)
  const BAR_SLOT_ANCHOR = { field: "session_time", seg: 0 };

  const E = { model:"🤖", folder:"📂", branch:"🌿", fire:"🔥", chart:"📊", cost:"💰", speed:"⚡️", input:"🔽", output:"🔼", brain:"🧠", clock:"⏱️", pencil:"✏️" };

  const R = "\x1b[0m";
  const CYAN = "\x1b[1;36m";
  const GREEN = "\x1b[1;32m";
  const YELLOW = "\x1b[1;33m";
  const BLUE = "\x1b[1;34m";
  const RED = "\x1b[1;31m";
  const WHITE = "\x1b[1;37m";
  const SEP_COLOR = "\x1b[38;5;117m"; // 하늘색
  const DIM = "\x1b[38;5;244m";       // 회색 — 오래된 값 표시용
  const SESSION_COLOR = "\x1b[1;35m"; // 자홍 — 세션 식별용

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
  // 경과 초 → 사람이 읽는 짧은 표기 (캐시 나이 표시용)
  function fmtAge(sec) {
    if (sec == null) return "?";
    if (sec >= 86400) return Math.floor(sec / 86400) + "일";
    if (sec >= 3600) return Math.floor(sec / 3600) + "시간";
    if (sec >= 60) return Math.floor(sec / 60) + "분";
    return sec + "초";
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
  // 오래된 값용 — 채움 구간도 회색이라 한눈에 "지금 값 아님"이 보인다
  function progressBarDim(pct, width) {
    const filled = Math.min(width, Math.round((pct / 100) * width));
    const empty = width - filled;
    return `${DIM}${"▄".repeat(filled)}${"\x1b[38;5;240m"}${"▁".repeat(empty)}${R}`;
  }


  // ── 데이터 수집 ──
  const ctx = d.context_window;
  const cwd = d.workspace?.current_dir || d.cwd || "";
  const home = require("os").homedir() || "";
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

  // ── Fable 주간 한도: 캐시 읽기 + stale(>5분) 시 백그라운드 갱신 ──
  // 갱신이 계속 실패하면 오래된 값이 남는다. 신선한 값처럼 보이지 않도록 경과시간을 함께 들고 간다.
  const FABLE_STALE_SEC = 1800; // 30분 — 갱신 주기(5분)의 6배까지는 정상으로 본다
  let fablePct = null, fableResetsAt = null, fableAge = null;
  try {
    const c = JSON.parse(require("fs").readFileSync(FABLE_CACHE, "utf8"));
    if (typeof c.percent === "number") { fablePct = c.percent; fableResetsAt = c.resets_at; }
    fableAge = Math.floor(Date.now() / 1000) - (c.fetched_at || 0);
    if (fableAge > 300) triggerFableRefresh();
  } catch {
    triggerFableRefresh(); // 캐시 없음 → 최초 갱신
  }
  const fableStale = fablePct != null && (fableAge == null || fableAge > FABLE_STALE_SEC);
  // stale이면 resets_at도 믿을 수 없다 — 잔여시간 대신 마지막 갱신 경과를 보여준다
  const fableReset = fableStale ? ` ⚠${fmtAge(fableAge)} 전` : fmtReset(fableResetsAt);

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
    const tokenPct = d.rate_limits?.five_hour?.used_percentage || 0;

    if (tokenPct >= 100)  return "(X.X)";    // 초과
    if (tokenPct >= 90)   return "(>.<)";    // 거의 소진
    if (tokenPct >= 80)   return "(;_;)";    // 위험
    if (tokenPct >= 70)   return "(-_-)";    // 불안
    if (tokenPct >= 50)   return "(o.o)";    // 보통
    if (tokenPct >= 30)   return "(^.^)";    // 여유
    return "(n.n)";                           // 넉넉
  }

  const CINDER_COLOR = "\x1b[38;5;208m";
  const expr = getBuddyExpr();

  // ── Line 1b: 컨텍스트 (브랜치 아래) ──
  function weightEmoji(pct) {
    if (pct >= 80)  return "🏋️";  // 한계
    if (pct >= 60)  return "😤";  // 무거움
    if (pct >= 40)  return "💪";  // 좀 묵직
    if (pct >= 20)  return "🧳";  // 짐 있음
    return "🪶";                   // 가벼움
  }
  // ── five_hour 관련 계산값 ──
  const fiveHDisplay = Math.min(fiveHPct, 100);
  const fiveHOver = fiveHPct > 100 ? ` ${RED}(초과)${R}` : "";

  // ── session_time 관련 계산값 ──
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
  // ── cache_ratio 관련 계산값 ──
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheCreate = usage.cache_creation_input_tokens || 0;
  const totalIn = (usage.input_tokens || 0) + cacheRead + cacheCreate;
  const cacheHit = totalIn > 0 ? (cacheRead / totalIn * 100).toFixed(0) : "-";

  // ── FIELDS 레지스트리 ──
  // 각 필드는 { type, render(data, opts) } 형태로 정의
  // type: "inline" | "bar" | "column"
  // render: 해당 필드의 ANSI 문자열 반환
  const FIELDS = {
    // ── inline 타입 (6개) ──

    // 세션 지목용 식별자 — 다른 세션에 메시지를 보낼 때 ListAgents 목록에서 어느 세션인지 가리는 값.
    //   ListAgents 이름은 `<디렉터리명>-<접미사>` 구조다(예: my-project-d0 · my-project-05).
    //   디렉터리명은 아래 path 줄에 이미 나오고, 접미사는 stdin·~/.claude 어디에도 없어 재현 불가(2026-09-11 실측
    //   + 공식 문서에 "two-character suffix" 언급만 있고 생성 규칙 없음). 그래서 여기서는 session_id 앞 8자리만 쓴다 —
    //   같은 디렉터리에 세션이 여럿일 때 각 세션 화면을 보고 가리는 용도.
    //   stdin 의 session_name 은 자동 생성 제목이라("my-project-task-executor 모델") 지목에 쓰지 않는다.
    session: {
      type: "inline",
      render: (data) => {
        const sid = data.session_id?.slice(0, 8);
        return sid ? `🔖 ${SESSION_COLOR}${sid}${R}` : "";
      },
    },

    // 모델명 표시
    model: {
      type: "inline",
      render: (data) => `${E.model} ${CYAN}${data.model?.display_name || ""}${R}`,
    },

    // 코딩 버디 (git user) 표시 — 이름이 있을 때만 렌더
    git_user: {
      type: "inline",
      render: () => {
        if (!companionName) return "";
        return `${CINDER_COLOR}${buddyEmoji} ${companionName} ${GREEN}${expr}${R}`;
      },
    },

    // 현재 작업 디렉터리 경로
    path: {
      type: "inline",
      render: () => `${E.folder} ${BLUE}${dir}${R}`,
    },

    // Claude Code 버전
    version: {
      type: "inline",
      render: (data) => {
        const v = data.version || "";
        return `🔧 ${BLUE}v${v}${R}`;
      },
    },

    // effort 레벨 (stdin의 effort.level — 없으면 렌더 안 함, 레벨별 색상)
    effort: {
      type: "inline",
      render: (data) => {
        const lv = data.effort?.level;
        if (!lv) return "";
        const c = { low: "\x1b[38;5;244m", medium: GREEN, high: CYAN, xhigh: YELLOW, max: RED }[lv] || WHITE;
        return `🔆 ${c}${lv}${R}`;
      },
    },

    // 현재 git 브랜치 — 브랜치가 있을 때만 렌더
    branch: {
      type: "inline",
      render: () => {
        if (!gitBranch) return "";
        return `${E.branch} ${GREEN}${gitBranch}${R}`;
      },
    },

    // ── bar 타입 (3개) ──
    // render(data, opts): opts.maxLabelWidth로 라벨 정렬 후 [라벨+막대, 수치] 쌍 반환

    // 컨텍스트 윈도우 사용률
    context: {
      type: "bar",
      render: (_data, opts = {}) => {
        if (!ctx) return "";
        const label = `${weightEmoji(ctxPct)} ${WHITE}컨텍스트${R}`;
        const bar = progressBar(ctxPct, opts.barWidth ?? BAR_WIDTH);
        const rightInfo = `${pctColor(ctxPct)}${String(ctxPct).padStart(3)}%${R} ${pctColor(ctxPct)}${fmtTokens(usedTokens)}${WHITE}/${fmtTokens(ctx.context_window_size)}${R}`;
        const labelPad = opts.maxLabelWidth ? padR(label, opts.maxLabelWidth) : label;
        return [`${labelPad}  ${bar}`, rightInfo];
      },
    },

    // 5시간 토큰 사용률
    five_hour: {
      type: "bar",
      render: (_data, opts = {}) => {
        const label = `${E.fire} ${WHITE}현재토큰${R}`;
        const bar = progressBar(fiveHDisplay, opts.barWidth ?? BAR_WIDTH);
        const rightInfo = `${pctColor(fiveHPct)}${String(fiveHDisplay).padStart(3)}%${WHITE}${fiveHReset}${R}${fiveHOver}`;
        const labelPad = opts.maxLabelWidth ? padR(label, opts.maxLabelWidth) : label;
        return [`${labelPad}  ${bar}`, rightInfo];
      },
    },

    // 7일 토큰 사용률
    seven_day: {
      type: "bar",
      render: (_data, opts = {}) => {
        const label = `${E.chart} ${WHITE}주간토큰${R}`;
        const bar = progressBar(sevenDPct, opts.barWidth ?? BAR_WIDTH);
        const rightInfo = `${pctColor(sevenDPct)}${String(sevenDPct).padStart(3)}%${WHITE}${sevenDReset}${R}`;
        const labelPad = opts.maxLabelWidth ? padR(label, opts.maxLabelWidth) : label;
        return [`${labelPad}  ${bar}`, rightInfo];
      },
    },

    // Fable 주간 토큰 사용률 (모델별 별도 한도 — 캐시에서, 캐시 없으면 렌더 안 함)
    fable: {
      type: "bar",
      render: (_data, opts = {}) => {
        if (fablePct == null) return "";
        const label = `📖 ${WHITE}페블주간${R}`;
        const disp = Math.min(fablePct, 100);
        // stale이면 회색으로 — 지금 값이 아니라는 걸 색으로 먼저 알린다
        const bar = fableStale ? progressBarDim(disp, opts.barWidth ?? BAR_WIDTH) : progressBar(disp, opts.barWidth ?? BAR_WIDTH);
        const valColor = fableStale ? DIM : pctColor(fablePct);
        const rightInfo = `${valColor}${String(disp).padStart(3)}%${fableStale ? DIM : WHITE}${fableReset}${R}`;
        const labelPad = opts.maxLabelWidth ? padR(label, opts.maxLabelWidth) : label;
        return [`${labelPad}  ${bar}`, rightInfo];
      },
    },

    // ── column 타입 (6개) ──
    // render(data): 세그먼트 배열 반환 — 세그먼트 하나가 정렬 단위(열) 하나에 대응.
    // 폭 맞춤은 renderLayout이 줄 전체를 모아 열별 최대 폭으로 처리한다.

    // 세션 비용 (USD)
    cost: {
      type: "column",
      render: () => [`${E.cost} ${WHITE}세션비용 ${costColor(costVal)}$${costVal != null ? costVal.toFixed(2) : "0.00"}${R}`],
    },

    // 토큰 생성 속도 (t/s)
    speed: {
      type: "column",
      render: () => [`${E.speed} ${WHITE}속도 ${speedColor(tpsVal)}${tpsVal != null ? tpsVal.toFixed(1) : "-"} t/s${R}`],
    },

    // 입력/출력 토큰 수 — 각각 별도 열로 정렬
    io_tokens: {
      type: "column",
      render: () => [
        `${E.input} ${WHITE}입력 ${tokenColor(inTokens)}${fmtTokens(inTokens)}${R}`,
        `${E.output} ${WHITE}출력 ${tokenColor(outTokens)}${fmtTokens(outTokens)}${R}`,
      ],
    },

    // 세션 경과 시간 — duration 있을 때만 렌더
    session_time: {
      type: "column",
      render: () => {
        if (!duration) return [];
        return [`${fatigueEmoji(hours)} ${WHITE}세션 ${durationColor(duration)}${fmtDuration(duration)}${R}`];
      },
    },

    // 코드 변경 줄 수 — linesStr 있을 때만 렌더
    code_lines: {
      type: "column",
      render: () => {
        if (!linesStr) return [];
        return [`${E.pencil} ${linesStr}`];
      },
    },

    // 캐시 히트율
    cache_ratio: {
      type: "column",
      render: () => [
        `🔄 ${WHITE}캐시 ${GREEN}${cacheHit}%${R}`,
      ],
    },
  };

  // column 필드 렌더 결과를 세그먼트 배열로 정규화 (문자열 반환도 허용)
  function toSegments(v) {
    if (v == null) return [];
    return (Array.isArray(v) ? v : [v]).filter((s) => s !== "");
  }

  // ── renderLayout: 레이아웃 정의(lines)를 FIELDS를 통해 렌더링 ──
  // @param {string[][]} lines  - 각 줄을 필드명 배열로 표현 (예: [["model","git_user"], ["context"]])
  // @param {object}     data   - 렌더링에 사용할 데이터 객체
  // @param {string}     [errorBanner] - 오류 배너 문자열 (있으면 첫 줄에 prepend)
  // @returns {string[]} 렌더링된 줄 배열 (빈 줄 제외)
  function renderLayout(lines, data, errorBanner) {
    const result = [];

    // 오류 배너가 있으면 첫 줄에 추가
    if (errorBanner) result.push(errorBanner);

    // bar 필드 라벨 기준 문자열 (ANSI 포함 — getVisWidth가 ANSI 제거 후 폭 계산)
    // weightEmoji는 비율에 따라 달라지지만 모두 2폭 이모지이므로 대표값 사용
    const BAR_LABEL_SAMPLES = {
      context:   `🪶 ${WHITE}컨텍스트${R}`,
      five_hour: `${E.fire} ${WHITE}현재토큰${R}`,
      fable:     `📖 ${WHITE}페블주간${R}`,
      seven_day: `${E.chart} ${WHITE}주간토큰${R}`,
    };

    // lines 전체를 순회해 bar 필드 라벨 최대 폭 계산
    let maxLabelWidth = 0;
    for (const line of lines) {
      for (const fieldName of line) {
        const f = FIELDS[fieldName];
        if (f && f.type === "bar" && BAR_LABEL_SAMPLES[fieldName]) {
          const w = getVisWidth(BAR_LABEL_SAMPLES[fieldName]);
          if (w > maxLabelWidth) maxLabelWidth = w;
        }
      }
    }

    // 1차 패스: 줄별 렌더.
    // column 줄은 아직 이어붙이지 않고 세그먼트 배열로 보관한다 —
    // 여러 column 줄의 같은 열끼리 폭을 맞추려면 전체를 본 뒤에야 폭이 정해지기 때문.
    const pending = [];
    for (const line of lines) {
      // 줄 내 필드 타입 목록 (유효한 필드만)
      const validFields = line.filter(n => FIELDS[n]);
      if (validFields.length === 0) continue;

      // 첫 번째 유효 필드의 타입을 줄의 기본 타입으로 사용
      // 경로가 든 줄은 필드 순서와 무관하게 inline 처리 (예: ["cost","path"] 가 column 열 정렬에 섞이지 않게)
      const primaryType = validFields.includes("path") ? "inline" : FIELDS[validFields[0]].type;

      if (primaryType === "inline") {
        // inline: 항목이 2개 이상이면 inline 줄끼리 열 정렬, 1개거나 경로가 든 줄이면 2칸 간격으로 그대로 — 긴 경로가 열 폭을 키우지 않게
        // column 필드(예: ["path","cost"])도 섞일 수 있어 세그먼트 배열로 정규화
        const segs = validFields.flatMap(n => toSegments(FIELDS[n].render(data, {})));
        // 경로가 맨 끝인 줄은 세그먼트도 보관 — 기준 세그먼트 정렬 때 columns 격자에 합류 (아래 anchored 처리 참고)
        const pathLast = validFields[validFields.length - 1] === "path";
        if (segs.length > 1 && !validFields.includes("path")) pending.push({ kind: "inline", segs });
        else if (segs.length) pending.push({ kind: "text", value: segs.join("  "), segs: segs.length > 1 && pathLast ? segs : null });

      } else if (primaryType === "bar") {
        // bar+column 혼합 줄 처리 (compact 프리셋의 ["context","cost"] 같은 경우)
        // bar 필드와 column 필드를 분리해 각각 렌더 후 이어붙임
        // bar render 는 [라벨+막대, 수치] 쌍을 반환 — 데이터 없으면 "" (렌더 생략)
        const barEntries = validFields
          .filter(n => FIELDS[n].type === "bar")
          .map(n => ({ name: n, v: FIELDS[n].render(data, { maxLabelWidth }) }))
          .filter(e => Array.isArray(e.v));
        const bars = barEntries.map(e => e.v);

        const colParts = validFields
          .filter(n => FIELDS[n].type === "column")
          .flatMap(n => toSegments(FIELDS[n].render(data, {})));

        if (colParts.length === 0) {
          // bar 만 있는 줄: 한 줄에 여러 개 — 2차 패스에서 슬롯 정렬 (막대 길이가 정해진 뒤 names 로 다시 렌더)
          if (bars.length) pending.push({ kind: "bars", bars, names: barEntries.map(e => e.name) });
        } else {
          const rendered = [...bars.map(b => b.join("  ")), ...colParts].join("  ");
          if (rendered) pending.push({ kind: "text", value: rendered });
        }

      } else if (primaryType === "column") {
        // anchor: BAR_SLOT_ANCHOR 세그먼트의 줄 내 인덱스 (없으면 -1)
        const segs = [];
        let anchor = -1;
        for (const n of validFields) {
          const fieldSegs = toSegments(FIELDS[n].render(data, {}));
          if (n === BAR_SLOT_ANCHOR.field && fieldSegs.length > BAR_SLOT_ANCHOR.seg) anchor = segs.length + BAR_SLOT_ANCHOR.seg;
          segs.push(...fieldSegs);
        }
        if (segs.length) pending.push({ kind: "columns", segs, anchor });
      }
      // 알 수 없는 타입 — 해당 줄 skip
    }

    // bar 줄 기준 위치: 첫 막대의 수치 시작 열 (라벨+2칸+막대+2칸)
    const hasBars = pending.some(p => p.kind === "bars");
    const barInfoCol = maxLabelWidth + 2 + BAR_WIDTH + 2;

    // bars 줄: 왼쪽/오른쪽 슬롯 수치 폭을 줄 간 최대값으로 맞춰 오른쪽 막대 시작 열을 고정
    let leftInfoWidth = 0;
    let rightInfoWidth = 0;
    for (const p of pending) {
      if (p.kind === "bars" && p.bars.length > 1) {
        leftInfoWidth = Math.max(leftInfoWidth, getVisWidth(p.bars[0][1]));
        rightInfoWidth = Math.max(rightInfoWidth, getVisWidth(p.bars[p.bars.length - 1][1]));
      }
    }
    const hasBarPair = leftInfoWidth > 0;
    // 슬롯 고정 폭 = 라벨 + 2칸 + (막대) + 2칸
    const slotHead = maxLabelWidth + 4;
    // 막대 2개 줄의 좌우 막대 길이 — 기본 BAR_WIDTH, 기준 세그먼트가 있으면 아래에서 윗줄에 맞춰 결정
    let leftBarWidth = BAR_WIDTH;
    let rightBarWidth = BAR_WIDTH;
    // 오른쪽 막대 슬롯 시작 열 — 기본은 왼쪽 슬롯 끝 + BAR_PAIR_GAP
    let barSlotCol = barInfoCol + leftInfoWidth + BAR_PAIR_GAP;

    // 기준 세그먼트 정렬(막대 2개 줄 + 기준 세그먼트가 든 columns 줄)이면 inline 줄·경로가 맨 끝인 줄도 columns 격자에 합류 —
    //   윗줄 항목이 아래 columns·막대 줄과 같은 열에서 시작한다.
    //   합류한 줄의 마지막 세그먼트는 뒤에 이을 열이 없으므로 폭 계산에서 뺀다 (긴 경로가 열 폭을 키우지 않게)
    const anchored = hasBarPair && pending.some(p => p.kind === "columns" && p.anchor > 0);
    if (anchored) {
      for (const p of pending) {
        if (p.kind === "inline" || (p.kind === "text" && p.segs)) {
          p.kind = "columns";
          p.freeLast = true;
        }
      }
    }

    // 그룹(inline / columns)별 열 최대 폭 + 열 사이 간격 계산 (줄 간 세로 정렬 기준)
    //   columns + 막대 2개 줄 + 기준 세그먼트 있음: 좌우 막대를 BAR_PAIR_WIDTH 로 같게 두고 윗줄 간격을 맞춤
    //     앞 묶음 → 기준 세그먼트가 오른쪽 슬롯 시작 열에 오도록, 뒤 묶음 → 윗줄 끝이 막대 줄 끝에 닿도록 균등 분배
    //     윗줄 글자가 슬롯에 안 들어가면(간격 2칸 미만) 좌우 막대를 같이 늘린다
    //   columns + bar 줄 있음: 마지막 열 시작이 막대 수치 시작 열과 같도록 간격 분배
    //   그 외: 줄 끝이 LAYOUT_WIDTH 에 닿도록 균등 분배 — 최소 2칸
    const grids = {};
    for (const kind of ["inline", "columns"]) {
      const widths = [];
      for (const p of pending) {
        if (p.kind !== kind) continue;
        p.segs.forEach((s, i) => {
          if (p.freeLast && i === p.segs.length - 1) return;
          const w = getVisWidth(s);
          if (w > (widths[i] || 0)) widths[i] = w;
        });
      }
      const n = widths.length - 1; // 간격 개수
      let gaps = [];
      const anchorIdx = kind === "columns" && hasBarPair
        ? (pending.find(p => p.kind === "columns" && p.anchor > 0)?.anchor ?? -1)
        : -1;
      if (anchorIdx > 0) {
        const before = widths.slice(0, anchorIdx).reduce((a, b) => a + b, 0);
        const after = widths.slice(anchorIdx).reduce((a, b) => a + b, 0);
        const afterCount = n - anchorIdx;
        // 간격 2칸을 지키는 데 필요한 막대 길이 — 좌우 중 큰 쪽에 맞춰 같은 길이로
        const leftNeed = before + 2 * anchorIdx - BAR_PAIR_GAP - leftInfoWidth - slotHead;
        const rightNeed = after + 2 * afterCount - slotHead - rightInfoWidth;
        leftBarWidth = rightBarWidth = Math.max(BAR_PAIR_WIDTH, leftNeed, rightNeed);
        barSlotCol = slotHead + leftBarWidth + leftInfoWidth + BAR_PAIR_GAP;
        const lineEnd = barSlotCol + slotHead + rightBarWidth + rightInfoWidth;
        // 나머지는 앞쪽 간격부터 1칸씩
        const spread = (total, count) => Array.from({ length: count }, (_, i) =>
          Math.floor(total / count) + (i < total % count ? 1 : 0));
        gaps = [...spread(barSlotCol - before, anchorIdx), ...spread(lineEnd - barSlotCol - after, afterCount)];
      } else if (n > 0) {
        // 수치는 padStart(3) 이라 두 자리 수(" 12%")는 1칸 뒤에서 시작 — 흔한 두 자리 기준으로 +1
        const total = kind === "columns" && hasBars
          ? barInfoCol + 1 - widths.slice(0, -1).reduce((a, b) => a + b, 0)
          : LAYOUT_WIDTH - widths.reduce((a, b) => a + b, 0);
        // 나머지는 앞쪽 간격부터 1칸씩 — 마지막 열 시작 위치를 정확히 맞춘다
        gaps = Array.from({ length: n }, (_, i) =>
          Math.max(2, Math.floor(total / n) + (i < total % n ? 1 : 0)));
      }
      grids[kind] = { widths, gaps };
    }

    // 2차 패스: 열 폭에 맞춰 padR 후 이어붙임 (마지막 열은 뒤 공백 불필요)
    for (const p of pending) {
      if (p.kind === "text") {
        result.push(p.value);
        continue;
      }
      if (p.kind === "bars") {
        // 슬롯별 막대 길이로 다시 렌더 — 2개 이상이면 첫 슬롯 leftBarWidth, 마지막 슬롯 rightBarWidth
        const last = p.names.length - 1;
        const slots = p.names.map((name, i) => {
          const barWidth = last === 0 ? BAR_WIDTH : i === 0 ? leftBarWidth : i === last ? rightBarWidth : BAR_WIDTH;
          const [head, info] = FIELDS[name].render(data, { maxLabelWidth, barWidth });
          return `${head}  ${i === last ? info : padR(info, leftInfoWidth)}`;
        });
        result.push(slots.join(" ".repeat(barSlotCol - (slotHead + leftBarWidth + leftInfoWidth))));
        continue;
      }
      const { widths, gaps } = grids[p.kind];
      const cells = p.segs.map((s, i) =>
        // 합류한 줄이 columns 줄보다 세그먼트가 많으면 해당 간격이 없음 — 최소 2칸
        i === p.segs.length - 1 ? s : padR(s, widths[i]) + " ".repeat(gaps[i] ?? 2)
      );
      result.push(cells.join(""));
    }

    return result;
  }

  // ~/.claude/statusline.config.json 을 읽어 설정 반환
  // 반환값: { lines: string[][], error: string|null }
  function loadConfig() {
    const configPath = require("path").join(require("os").homedir(), ".claude", "statusline.config.json");
    let raw;
    try {
      raw = require("fs").readFileSync(configPath, "utf8");
    } catch (e) {
      // 파일 없음(ENOENT) 또는 기타 읽기 실패 → 조용히 default 반환
      return { lines: PRESETS.default.lines, error: null };
    }
    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      // JSON 파싱 실패 → error 표시, default lines 반환
      return { lines: PRESETS.default.lines, error: "invalid JSON" };
    }
    // [V1] preset + lines 동시 지정 금지
    if (cfg.preset !== undefined && cfg.lines !== undefined) {
      return { lines: PRESETS.default.lines, error: `use either "preset" or "lines", not both` };
    }

    // [V2] preset/lines 모두 없음 (빈 config {})
    if (cfg.preset === undefined && cfg.lines === undefined) {
      return { lines: PRESETS.default.lines, error: `must specify "preset" or "lines"` };
    }

    // [V3] preset 경로 처리 (알 수 없는 preset 포함)
    if (cfg.preset !== undefined) {
      const preset = PRESETS[cfg.preset];
      if (!preset) {
        return { lines: PRESETS.default.lines, error: `unknown preset "${cfg.preset}"` };
      }
      return { lines: preset.lines, error: null };
    }

    // 이하 cfg.lines 경로

    // [V4] 빈 lines 배열
    if (!Array.isArray(cfg.lines) || cfg.lines.length === 0) {
      return { lines: PRESETS.default.lines, error: `"lines" must not be empty` };
    }

    // [V4b] 각 줄 배열이 비어있으면 안 됨
    for (let i = 0; i < cfg.lines.length; i++) {
      if (!Array.isArray(cfg.lines[i]) || cfg.lines[i].length === 0) {
        return { lines: PRESETS.default.lines, error: `line ${i + 1}: must not be empty` };
      }
    }

    // [V5] 알 수 없는 필드명
    for (const line of cfg.lines) {
      for (const fieldName of line) {
        if (!FIELDS[fieldName]) {
          return { lines: PRESETS.default.lines, error: `unknown field "${fieldName}"` };
        }
      }
    }

    // [V6] 중복 필드 (줄을 넘어 전체 lines에서 검사)
    const seen = new Set();
    for (const line of cfg.lines) {
      for (const fieldName of line) {
        if (seen.has(fieldName)) {
          return { lines: PRESETS.default.lines, error: `duplicate field "${fieldName}"` };
        }
        seen.add(fieldName);
      }
    }

    // [V7] 타입 혼합 (bar + inline 또는 bar + column 혼합 불가)
    for (let i = 0; i < cfg.lines.length; i++) {
      const line = cfg.lines[i];
      const types = new Set(line.map((fieldName) => FIELDS[fieldName].type));
      if (types.has("bar") && (types.has("inline") || types.has("column"))) {
        return {
          lines: PRESETS.default.lines,
          error: `line ${i + 1}: cannot mix bar with inline/column fields`,
        };
      }
    }

    // 모든 유효성 검사 통과
    return { lines: cfg.lines, error: null };
  }

  const { lines, error } = loadConfig();
  const errorBanner = error ? `⚠️  statusline config error: ${error} — using default` : null;
  process.stdout.write(renderLayout(lines, d, errorBanner).join("\n") + "\n");

  // 기존 statusLine command가 백업되어 있으면 pass-through
  try {
    const _backupFile = require("path").join(require("os").homedir(), ".claude", ".statusline-original-cmd");
    const _origCmd = require("fs").readFileSync(_backupFile, "utf8").trim();
    if (_origCmd) {
      const { spawn } = require("child_process");
      const _shell = process.platform === "win32" ? "cmd" : "sh";
      const _shellArg = process.platform === "win32" ? "/c" : "-c";
      const _child = spawn(_shell, [_shellArg, _origCmd], {
        stdio: ["pipe", "ignore", "ignore"],
      });
      _child.stdin.write(input);
      _child.stdin.end();
    }
  } catch {}
});
