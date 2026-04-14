# Claude Code Status Line - Windows Installer
# 실행: irm https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/install.ps1 | iex

$ErrorActionPreference = "Stop"

$StatuslineDir = "$env:USERPROFILE\.claude"
$StatuslineFile = "$StatuslineDir\statusline.js"
$SettingsFile = "$StatuslineDir\settings.json"
$RawUrl = "https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/statusline/statusline.js"

Write-Host "Installing Claude Code Status Line..."

# 1. statusline.js 다운로드
New-Item -ItemType Directory -Force -Path $StatuslineDir | Out-Null
Invoke-WebRequest -Uri $RawUrl -OutFile $StatuslineFile -UseBasicParsing
Write-Host "  Downloaded statusline.js -> $StatuslineFile"

# 2. settings.json 설정
if (-not (Test-Path $SettingsFile)) {
  '{}' | Out-File -FilePath $SettingsFile -Encoding utf8NoBOM
}

# 현재 statusLine command 읽기
$SettingsFileEscaped = $SettingsFile -replace '\\', '\\'
$CurrentCmd = node -e @"
const fs = require('fs');
try {
  const s = JSON.parse(fs.readFileSync('$SettingsFileEscaped', 'utf8'));
  console.log((s.statusLine && s.statusLine.command) ? s.statusLine.command : '');
} catch { console.log(''); }
"@

$StatuslineFileEscaped = $StatuslineFile -replace '\\', '\\'

if ([string]::IsNullOrWhiteSpace($CurrentCmd)) {
  # statusLine 미설정 → 새로 추가
  node -e @"
const fs = require('fs');
const f = '$SettingsFileEscaped';
const s = JSON.parse(fs.readFileSync(f, 'utf8'));
s.statusLine = { type: 'command', command: 'node $StatuslineFileEscaped' };
fs.writeFileSync(f, JSON.stringify(s, null, 2) + '\n');
"@
  Write-Host "  Configured statusLine in settings.json"
} elseif ($CurrentCmd -like "*statusline-collector.js*") {
  # socar-board collector 감지 → original_statusline_cmd에 pass-through 등록
  $SocarBoardDir = "$env:USERPROFILE\.config\socar-board"
  New-Item -ItemType Directory -Force -Path $SocarBoardDir | Out-Null
  $OriginalCmdFile = "$SocarBoardDir\original_statusline_cmd"
  "node $StatuslineFile" | Out-File -FilePath $OriginalCmdFile -Encoding utf8NoBOM -NoNewline
  Write-Host "  socar-board collector 감지 -> pass-through 등록"
  Write-Host "    $OriginalCmdFile"
} elseif ($CurrentCmd -like "*statusline.js*") {
  Write-Host "  statusLine already configured (skipped)"
} else {
  Write-Host "  statusLine already configured with a different command (skipped)"
  Write-Host "  To update manually:"
  Write-Host "    `"statusLine`": { `"type`": `"command`", `"command`": `"node $StatuslineFile`" }"
}

# 3. 커맨드 파일 설치 (커스터마이징 도구)
$CommandsDir = "$StatuslineDir\commands"
$RawCmdsBase = "https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/.claude/commands"
New-Item -ItemType Directory -Force -Path $CommandsDir | Out-Null
foreach ($CmdFile in @("statusline_customize.md", "statusline_update.md")) {
  Invoke-WebRequest -Uri "$RawCmdsBase/$CmdFile" -OutFile "$CommandsDir\$CmdFile" -UseBasicParsing
  Write-Host "  Installed command: $CmdFile"
}

# 4. 업데이트 마커 초기화 (설치 직후 불필요한 업데이트 체크 방지)
[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() | Out-File -FilePath "$StatuslineDir\.statusline-last-update" -Encoding utf8NoBOM -NoNewline

Write-Host ""
Write-Host "Done! Status line is now active."
Write-Host ""
Write-Host "To uninstall:"
Write-Host "  Remove-Item '$StatuslineFile'"
Write-Host "  # Remove `"statusLine`" from $SettingsFile"
