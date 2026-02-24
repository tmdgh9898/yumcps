# Run once: persists UTF-8 defaults for PowerShell sessions.
# Safe to run multiple times; it only appends missing lines.

$profilePath = $PROFILE.CurrentUserAllHosts
$profileDir = Split-Path -Parent $profilePath
if (-not (Test-Path $profileDir)) {
  New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}
if (-not (Test-Path $profilePath)) {
  New-Item -ItemType File -Path $profilePath -Force | Out-Null
}

$lines = @(
  '# codex-utf8-start',
  '[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()',
  '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()',
  '$OutputEncoding = [System.Text.UTF8Encoding]::new()',
  'chcp 65001 > $null',
  '$PSDefaultParameterValues["Out-File:Encoding"] = "utf8"',
  '$PSDefaultParameterValues["Set-Content:Encoding"] = "utf8"',
  '$PSDefaultParameterValues["Add-Content:Encoding"] = "utf8"',
  '# codex-utf8-end'
)

$current = Get-Content -Path $profilePath -ErrorAction SilentlyContinue
if (-not ($current -contains '# codex-utf8-start')) {
  Add-Content -Path $profilePath -Value "`n$($lines -join "`n")`n" -Encoding utf8
  Write-Host "Updated profile: $profilePath"
} else {
  Write-Host "UTF-8 block already present: $profilePath"
}

Write-Host "Open a new PowerShell window to apply persistent settings."
