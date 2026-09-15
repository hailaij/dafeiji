# 同步游戏资产到 Android 工程(H5 源 -> assets/www)
# 用法: 在仓库根目录执行 .\sync-assets.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$www = Join-Path $root 'android\app\src\main\assets\www'

New-Item -ItemType Directory -Force -Path (Join-Path $www 'js') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $www 'icons') | Out-Null
Copy-Item (Join-Path $root 'index.html') $www -Force
Copy-Item (Join-Path $root 'style.css') $www -Force
Copy-Item (Join-Path $root 'manifest.json') $www -Force
Copy-Item (Join-Path $root 'sw.js') $www -Force
Copy-Item (Join-Path $root 'icons\*.png') (Join-Path $www 'icons') -Force
Copy-Item (Join-Path $root 'js\*.js') (Join-Path $www 'js') -Force

Write-Host "synced assets -> $www"
Get-ChildItem $www -Recurse -File | ForEach-Object { $_.FullName.Replace("$www\", '') }
