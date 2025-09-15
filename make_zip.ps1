param(
  [string]$Version = "v0.0.0",
  [switch]$IncludeDist
)

$ErrorActionPreference = 'Stop'

# Workspace root = location of this script's parent directory
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root

# Timestamped filename
$ts = Get-Date -Format 'yyyyMMdd-HHmm'
$name = "fcr-web-calculator-$ts-clean.zip"

$releases = Join-Path $root 'releases'
if (-not (Test-Path $releases)) { New-Item -ItemType Directory -Path $releases | Out-Null }
$zipPath = Join-Path $releases $name

# Collect files, excluding .git and css/_archive (clean zip)
$allFiles = Get-ChildItem -Recurse -File | Where-Object { 
  $_.FullName -notmatch "\\\.git\\" -and 
  $_.FullName -notmatch "css\\\\_archive\\" 
}

if (-not $IncludeDist) {
  # keep dist/ by default; this flag would change behavior in the future
}

$paths = $allFiles | ForEach-Object { $_.FullName }

if ($paths.Count -eq 0) {
  Write-Error "No files found to archive."
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $paths -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Created: $zipPath"

# Print the send template stub with today’s date
$today = Get-Date -Format 'yyyy-MM-dd'
$template = @"
SYNC: New Codex update ready
Version/tag: $Version ($today)

Please review:
- Focus areas (e.g., forms + density)
- Any risks to check (e.g., .post-actions layout)

Decisions needed:
- (list 1–3 questions)

Artifacts:
- ZIP attached: $zipPath
- RELEASE_NOTES.md updated (see Changes/Files touched/Tests)
"@

Write-Host "`n$template"

