# NEON STRIKE Windows desktop one-click build script
# Usage: cd win; .\build-local.ps1
#
# Prereq: run ..\sync-assets.ps1 first to sync game assets into win\assets\www
#
# Toolchain lookup order:
#   1. dotnet on PATH (must have an SDK)
#   2. <repo root>\win\.venv-dotnet\  (local toolchain dir, gitignored)
$ErrorActionPreference = 'Stop'
$winDir = $PSScriptRoot

# ---- toolchain detection (prefer a dotnet that actually has an SDK) ----
$dotnet = $null
$cmd = Get-Command dotnet -ErrorAction SilentlyContinue
if ($cmd) {
    $sdks = & $cmd.Source --list-sdks 2>$null
    if ($LASTEXITCODE -eq 0 -and $sdks) { $dotnet = $cmd.Source }
}
if (-not $dotnet) {
    $local = Join-Path $winDir '.venv-dotnet'
    if (Test-Path (Join-Path $local 'dotnet.exe')) { $dotnet = Join-Path $local 'dotnet.exe' }
}
if (-not $dotnet) {
    throw "dotnet SDK not found. Set PATH, or run: .\dotnet-install.ps1 -Channel 8.0 -InstallDir .\.venv-dotnet -NoPath"
}
Write-Host "== dotnet: $dotnet" -ForegroundColor DarkGray

# ---- asset check ----
$www = Join-Path $winDir 'assets\www'
if (-not (Test-Path (Join-Path $www 'index.html'))) {
    throw "assets\www missing. Run ..\sync-assets.ps1 first."
}

$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'

# ---- read version from csproj ----
$csproj = Get-Content (Join-Path $winDir 'NeonStrike.csproj') -Raw
$m = [regex]::Match($csproj, '<Version>([^<]+)</Version>')
if (-not $m.Success) { throw "cannot read Version from NeonStrike.csproj" }
$version = $m.Groups[1].Value

# ---- publish (single-file self-contained, no .NET needed on target) ----
# Explicit --configfile restore avoids inheriting broken local NuGet sources
$outDir = "$winDir\publish"
& $dotnet restore (Join-Path $winDir 'NeonStrike.csproj') --configfile (Join-Path $winDir 'NuGet.config')
if ($LASTEXITCODE -ne 0) { throw "restore failed" }
& $dotnet publish (Join-Path $winDir 'NeonStrike.csproj') -c Release -r win-x64 --no-restore -o $outDir
if ($LASTEXITCODE -ne 0) { throw "publish failed" }

# ---- artifact ----
$dist = Join-Path $winDir 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null
$name = "neon-strike-$version-win64.exe"
Copy-Item (Join-Path $outDir 'NeonStrike.exe') (Join-Path $dist $name) -Force
Write-Host "== BUILD OK: $dist\$name" -ForegroundColor Green
