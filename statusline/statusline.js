#!/usr/bin/env node
// Claude Code 커스텀 Status Line - B안: 2줄 컴팩트, 카테고리 그룹핑

// ── 자동 업데이트 (24h마다 최신 버전 백그라운드 다운로드) ──
(function checkUpdate() {
  const _fs = require("fs");
  const _path = require("path");
  const _os = require("os");
  const { spawn } = require("child_process");
  const SELF = __filename;
  const MARKER = _path.join(_os.homedir(), ".claude", ".statusline-last-update");
  const RAW_URL = "https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/statusline/statusline.js";
  try {
    const now = Date.now();
    let last = 0;
    try { last = Number(_fs.readFileSync(MARKER, "utf8")); } catch {}
    if (now - last < 86400000) return; // 24시간 이내 스킵
    _fs.writeFileSync(MARKER, String(now)); // 중복 체크 방지
    const child = spawn(process.execPath, ["-e", [
      `const h=require("https"),fs=require("fs");`,
      `h.get(${JSON.stringify(RAW_URL)},r=>{`,
      `if(r.statusCode!==200)return;`,
      `let d="";r.on("data",c=>d+=c);`,
      `r.on("end",()=>{try{`,
      `if(fs.readFileSync(${JSON.stringify(SELF)},"utf8")!==d)fs.writeFileSync(${JSON.stringify(SELF)},d);`,
      `}catch{}});}).on("error",()=>{});`,
    ].join("")], { detached: true, stdio: "ignore" });
    child.unref();
  } catch {}
})();

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
        ["model", "git_user", "path"],
        ["version", "branch"],
        ["context"],
        ["five_hour"],
        ["seven_day"],
        ["cost", "speed", "io_tokens"],
        ["session_time", "code_lines", "cache_ratio"]
      ]
    },
    focus: {
      lines: [
        ["model", "path"],
        ["branch"],
        ["context"],
        ["five_hour"],
        ["seven_day"],
        ["cost", "speed", "code_lines"]
      ]
    },
    compact: {
      lines: [
        ["model", "path", "branch"],
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
  const oiRatio = inTokens && outTokens ? (outTokens / inTokens).toFixed(1) : "-";

  // ── FIELDS 레지스트리 ──
  // 각 필드는 { type, render(data, opts) } 형태로 정의
  // type: "inline" | "bar" | "column"
  // render: 해당 필드의 ANSI 문자열 반환
  const FIELDS = {
    // ── inline 타입 (5개) ──

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
        return `⚙️ ${BLUE}v${v}${R}`;
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
    // render(data, opts): opts.maxLabelWidth로 라벨 정렬 후 progress bar 붙여 반환

    // 컨텍스트 윈도우 사용률
    context: {
      type: "bar",
      render: (_data, opts = {}) => {
        if (!ctx) return "";
        const label = `${weightEmoji(ctxPct)} ${WHITE}컨텍스트${R}`;
        const bar = progressBar(ctxPct, 30);
        const rightInfo = `${pctColor(ctxPct)}${String(ctxPct).padStart(3)}%${R} ${pctColor(ctxPct)}${fmtTokens(usedTokens)}${WHITE}/${fmtTokens(ctx.context_window_size)}${R}`;
        const labelPad = opts.maxLabelWidth ? padR(label, opts.maxLabelWidth) : label;
        return `${labelPad} ${bar} ${rightInfo}`;
      },
    },

    // 5시간 토큰 사용률
    five_hour: {
      type: "bar",
      render: (_data, opts = {}) => {
        const label = `${E.fire} ${WHITE}현재토큰${R}`;
        const bar = progressBar(fiveHDisplay, 30);
        const rightInfo = `${pctColor(fiveHPct)}${String(fiveHDisplay).padStart(3)}%${WHITE}${fiveHReset}${R}${fiveHOver}`;
        const labelPad = opts.maxLabelWidth ? padR(label, opts.maxLabelWidth) : label;
        return `${labelPad} ${bar} ${rightInfo}`;
      },
    },

    // 7일 토큰 사용률
    seven_day: {
      type: "bar",
      render: (_data, opts = {}) => {
        const label = `${E.chart} ${WHITE}주간토큰${R}`;
        const bar = progressBar(sevenDPct, 30);
        const rightInfo = `${pctColor(sevenDPct)}${String(sevenDPct).padStart(3)}%${WHITE}${sevenDReset}${R}`;
        const labelPad = opts.maxLabelWidth ? padR(label, opts.maxLabelWidth) : label;
        return `${labelPad} ${bar} ${rightInfo}`;
      },
    },

    // ── column 타입 (6개) ──
    // render(data, opts): opts.colWidth로 padR 정렬

    // 세션 비용 (USD)
    cost: {
      type: "column",
      render: (_data, opts = {}) => {
        const content = `${E.cost} ${WHITE}세션비용 ${costColor(costVal)}$${costVal != null ? costVal.toFixed(2) : "0.00"}${R}`;
        return opts.colWidth ? padR(content, opts.colWidth) : content;
      },
    },

    // 토큰 생성 속도 (t/s)
    speed: {
      type: "column",
      render: (_data, opts = {}) => {
        const content = `${E.speed} ${WHITE}속도 ${speedColor(tpsVal)}${tpsVal != null ? tpsVal.toFixed(1) : "-"} t/s${R}`;
        return opts.colWidth ? padR(content, opts.colWidth) : content;
      },
    },

    // 입력/출력 토큰 수
    io_tokens: {
      type: "column",
      render: (_data, opts = {}) => {
        const content = `${E.input} ${WHITE}입력 ${tokenColor(inTokens)}${fmtTokens(inTokens)}${R}${WHITE}/${R} ${E.output}${WHITE}출력 ${tokenColor(outTokens)}${fmtTokens(outTokens)}${R}`;
        return opts.colWidth ? padR(content, opts.colWidth) : content;
      },
    },

    // 세션 경과 시간 — duration 있을 때만 렌더
    session_time: {
      type: "column",
      render: (_data, opts = {}) => {
        if (!duration) return "";
        const content = `${fatigueEmoji(hours)} ${WHITE}세션 ${durationColor(duration)}${fmtDuration(duration)}${R}`;
        return opts.colWidth ? padR(content, opts.colWidth) : content;
      },
    },

    // 코드 변경 줄 수 — linesStr 있을 때만 렌더
    code_lines: {
      type: "column",
      render: (_data, opts = {}) => {
        if (!linesStr) return "";
        const content = `${E.pencil} ${linesStr}`;
        return opts.colWidth ? padR(content, opts.colWidth) : content;
      },
    },

    // 캐시 히트율 및 입출력 토큰 비율
    cache_ratio: {
      type: "column",
      render: (_data, opts = {}) => {
        const content = `🔄 ${WHITE}캐시${R} ${GREEN}${cacheHit}%${R} ${WHITE}/${R} ⚖️ ${WHITE}Ratio${R} ${CYAN}${oiRatio}${R}`;
        return opts.colWidth ? padR(content, opts.colWidth) : content;
      },
    },
  };

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

    // 각 줄 렌더링
    for (const line of lines) {
      // 줄 내 필드 타입 목록 (유효한 필드만)
      const validFields = line.filter(n => FIELDS[n]);
      if (validFields.length === 0) continue;

      // 첫 번째 유효 필드의 타입을 줄의 기본 타입으로 사용
      const primaryType = FIELDS[validFields[0]].type;

      // column 고정 폭 — 기존 RC1=18과 동일
      const colWidth = 18;
      let rendered;

      if (primaryType === "inline") {
        // inline: 공백 2칸으로 join, 빈 문자열 제외
        rendered = validFields
          .map(n => FIELDS[n].render(data, {}) ?? "")
          .filter(s => s !== "")
          .join("  ");

      } else if (primaryType === "bar") {
        // bar+column 혼합 줄 처리 (compact 프리셋의 ["context","cost"] 같은 경우)
        // bar 필드와 column 필드를 분리해 각각 렌더 후 이어붙임
        const barParts = validFields
          .filter(n => FIELDS[n].type === "bar")
          .map(n => FIELDS[n].render(data, { maxLabelWidth }) ?? "")
          .filter(s => s !== "");

        const colParts = validFields
          .filter(n => FIELDS[n].type === "column")
          .map(n => FIELDS[n].render(data, { colWidth }) ?? "")
          .filter(s => s !== "");

        rendered = [...barParts, ...colParts].join("  ");

      } else if (primaryType === "column") {
        // column: colWidth 고정 폭(기존 RC1=18 참고), 공백 2칸으로 join
        rendered = validFields
          .map(n => FIELDS[n].render(data, { colWidth }) ?? "")
          .filter(s => s !== "")
          .join("  ");

      } else {
        // 알 수 없는 타입 — 해당 줄 skip
        continue;
      }

      // 빈 줄은 추가하지 않음
      if (rendered) result.push(rendered);
    }

    return result;
  }

  // ~/.claude/statusline.config.json 을 읽어 설정 반환
  // 반환값: { lines: string[][], error: string|null }
  function loadConfig() {
    const configPath = require("os").homedir() + "/.claude/statusline.config.json";
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
    // 기본 구조만 반환 (유효성 검사는 T008/T010에서 추가)
    return { lines: cfg.lines || PRESETS.default.lines, error: null };
  }

  const { lines, error } = loadConfig();
  const errorBanner = error ? `⚠️  statusline config error: ${error} — using default` : null;
  process.stdout.write(renderLayout(lines, d, errorBanner).join("\n") + "\n");
});
