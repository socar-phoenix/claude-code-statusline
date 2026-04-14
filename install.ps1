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

# 2. settings.json 설정 (순수 PowerShell — Node.js 불필요)
if (-not (Test-Path $SettingsFile)) {
  '{}' | Out-File -FilePath $SettingsFile -Encoding utf8NoBOM
}

$settings = Get-Content $SettingsFile -Raw | ConvertFrom-Json
$currentCmd = ""
if ($settings.statusLine -and $settings.statusLine.command) {
  $currentCmd = $settings.statusLine.command
}

if ([string]::IsNullOrWhiteSpace($currentCmd)) {
  # statusLine 미설정 → 새로 추가
  $settings | Add-Member -NotePropertyName "statusLine" -NotePropertyValue @{
    type = "command"
    command = "node $StatuslineFile"
  } -Force
  $settings | ConvertTo-Json -Depth 10 | Out-File -FilePath $SettingsFile -Encoding utf8NoBOM
  Write-Host "  Configured statusLine in settings.json"
} elseif ($currentCmd -like "*statusline.js*") {
  Write-Host "  statusLine already configured (skipped)"
} else {
  Write-Host "  statusLine already configured with a different command (skipped)"
  Write-Host "  To update manually:"
  Write-Host "    `"statusLine`": { `"type`": `"command`", `"command`": `"node $StatuslineFile`" }"
}

# 3. 커맨드 파일 설치
$CommandsDir = "$StatuslineDir\commands"
$RawCmdsBase = "https://raw.githubusercontent.com/socar-phoenix/claude-code-statusline/main/.claude/commands"
New-Item -ItemType Directory -Force -Path $CommandsDir | Out-Null
foreach ($CmdFile in @("statusline_customize.md", "statusline_update.md")) {
  Invoke-WebRequest -Uri "$RawCmdsBase/$CmdFile" -OutFile "$CommandsDir\$CmdFile" -UseBasicParsing
  Write-Host "  Installed command: $CmdFile"
}

# 4. 업데이트 마커 초기화
[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() | Out-File -FilePath "$StatuslineDir\.statusline-last-update" -Encoding utf8NoBOM -NoNewline

Write-Host ""
Write-Host "Done! Status line is now active."
Write-Host ""
Write-Host "To uninstall: see README.md"
Write-Host "  https://github.com/socar-phoenix/claude-code-statusline#삭제"
