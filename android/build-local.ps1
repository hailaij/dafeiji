# NEON STRIKE Android 一键构建脚本
# 前提: 工具链已安装在 D:\ai\biancheng\.venv (jdk17 / android-sdk)
# 用法: cd android; .\build-local.ps1
$ErrorActionPreference = 'Stop'

$venv = 'D:\ai\biancheng\.venv'
$env:JAVA_HOME = Join-Path $venv 'jdk17'
$env:ANDROID_HOME = Join-Path $venv 'android-sdk'
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

if (-not (Test-Path "$($env:JAVA_HOME)\bin\java.exe")) {
    throw "JDK not found at $($env:JAVA_HOME). Run the toolchain setup first."
}

Write-Host "== JAVA_HOME = $env:JAVA_HOME"
Write-Host "== ANDROID_HOME = $env:ANDROID_HOME"

# local.properties for Android Gradle Plugin
$sdkPath = $env:ANDROID_HOME.Replace('\', '\\')
Set-Content -Path (Join-Path $PSScriptRoot 'local.properties') -Value "sdk.dir=$sdkPath" -Encoding ASCII

# Use local gradle distribution if installed, else wrapper
$gradleBin = Join-Path $venv 'gradle-8.7\bin\gradle.bat'
$dist = Join-Path $PSScriptRoot 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null

if (Test-Path $gradleBin) {
    Write-Host "== using local gradle 8.7"
    & $gradleBin -p $PSScriptRoot assembleDebug --no-daemon
} else {
    Write-Host "== using gradle wrapper (may download gradle)"
    & (Join-Path $PSScriptRoot 'gradlew.bat') assembleDebug --no-daemon
}

if ($LASTEXITCODE -ne 0) { throw "gradle build failed: $LASTEXITCODE" }

# Collect APK
$apk = Get-ChildItem (Join-Path $PSScriptRoot 'app\build\outputs\apk\debug') -Filter '*.apk' | Select-Object -First 1
if (-not $apk) { throw 'APK not produced' }
Copy-Item $apk.FullName (Join-Path $dist $apk.Name) -Force
Write-Host ""
Write-Host "== BUILD OK: dist\$($apk.Name)" -ForegroundColor Green
