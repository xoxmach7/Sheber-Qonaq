# ship.ps1 - one command: branch -> commit -> push -> PR link
# Usage:  .\ship.ps1 "what changed"
#         .\ship.ps1 "fix expenses" -Prefix fix
# ASCII-only on purpose (PowerShell 5.1 mangles non-ASCII in scripts).

param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Message,
  [string]$Prefix = "work"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$repo = "https://github.com/xoxmach7/sheber-qonaq"

# 1. Remove stale git locks (left over from interrupted operations)
Remove-Item .git\index.lock, .git\HEAD.lock -Force -ErrorAction SilentlyContinue

# 2. Branch name: ASCII slug from message + timestamp for uniqueness
$slug = ($Message -replace '[^a-zA-Z0-9]+', '-').Trim('-').ToLower()
if ([string]::IsNullOrWhiteSpace($slug)) { $slug = "change" }
if ($slug.Length -gt 40) { $slug = $slug.Substring(0, 40).Trim('-') }
$stamp = Get-Date -Format "MMdd-HHmm"
$branch = "$Prefix/$slug-$stamp"

# 3. Branch
git checkout -b $branch

# 4. Stage + check there is something to commit
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "Nothing to commit - aborting." -ForegroundColor Yellow
  git checkout -
  git branch -D $branch
  exit 0
}

# 5. Commit + push
git commit -m $Message
git push -u origin $branch

# 6. PR link
Write-Host ""
Write-Host "Pushed branch: $branch" -ForegroundColor Green
Write-Host "Open PR:  $repo/pull/new/$branch" -ForegroundColor Cyan
