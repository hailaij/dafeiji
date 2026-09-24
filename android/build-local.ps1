# NEON STRIKE Android 一键构建脚本
# 用法: cd android; .\build-local.ps1
#
# 工具链定位优先级:
#   1. 环境变量 JAVA_HOME / ANDROID_HOME(已有全局安装优先)
#   2. <仓库根>\android\.venv-android\  (本地工具链目录, gitignore)
$ErrorActionPreference = 'Stop'
$androidDir = $PSScriptRoot
$repoRoot = Split-Path -Parent $androidDir

# ---- 工具链定位 ----
function Resolve-Toolchain {
    # 1) 环境变量(仅当路径真实存在)
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
        Write-Host "== using JAVA_HOME from environment" -ForegroundColor DarkGray
        return @{ java = $env:JAVA_HOME }
    }
    # 2) android/.venv-android
    $local = Join-Path $androidDir '.venv-android'
    if (Test-Path (Join-Path $local 'jdk17\bin\java.exe')) {
        Write-Host "== using toolchain: android\.venv-android" -ForegroundColor DarkGray
        return @{ java = (Join-Path $local 'jdk17') }
    }
    throw "JDK 17 not found. Set JAVA_HOME, or place jdk17/ under android\.venv-android\."
}

$tc = Resolve-Toolchain
$env:JAVA_HOME = $tc.java

# ANDROID_HOME 同样二级定位
if (-not ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME))) {
    $candidates = @(
        (Join-Path $androidDir '.venv-android\android-sdk')
    )
    $found = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($found) { $env:ANDROID_HOME = $found }
    else { throw "Android SDK not found. Set ANDROID_HOME, or place android-sdk/ under android\.venv-android\." }
}
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

Write-Host "== JAVA_HOME    = $env:JAVA_HOME"
Write-Host "== ANDROID_HOME = $env:ANDROID_HOME"

# local.properties(指向当前 SDK)
$sdkPath = $env:ANDROID_HOME.Replace('\', '\\')
Set-Content -Path (Join-Path $androidDir 'local.properties') -Value "sdk.dir=$sdkPath" -Encoding ASCII

# 优先 gradlew(wrapper 自动下载 Gradle, 环境无关), 无 JAVA 之外的依赖
$dist = Join-Path $androidDir 'dist'
New-Item -ItemType Directory -Force -Path $dist | Out-Null

# JDK 17 uses Unix-domain sockets for its internal NIO pipe on Windows.
# Some Windows TEMP locations reject connect() although bind() succeeds.
# Use a project-local socket directory for both the launcher and daemon JVMs.
$socketDir = Join-Path $androidDir '.gradle\socket-temp'
New-Item -ItemType Directory -Force -Path $socketDir | Out-Null
$previousJavaToolOptions = $env:JAVA_TOOL_OPTIONS
try {
    $socketOption = '"-Djdk.net.unixdomain.tmpdir=' + $socketDir + '"'
    $env:JAVA_TOOL_OPTIONS = ($previousJavaToolOptions + ' ' + $socketOption).Trim()
    Write-Host "== gradlew assembleDebug"
    & (Join-Path $androidDir 'gradlew.bat') -p $androidDir assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "gradle build failed: $LASTEXITCODE" }
} finally {
    $env:JAVA_TOOL_OPTIONS = $previousJavaToolOptions
}

# Collect the exact debug output under a versioned, reproducible filename.
$apk = Join-Path $androidDir 'app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path -LiteralPath $apk)) { throw 'APK not produced' }
$gradleConfig = Get-Content (Join-Path $androidDir 'app\build.gradle.kts') -Raw
$versionMatch = [regex]::Match($gradleConfig, 'versionName\s*=\s*"([^"]+)"')
if (-not $versionMatch.Success) { throw 'Cannot read Android versionName' }
$artifactName = 'neon-strike-v' + $versionMatch.Groups[1].Value + '.apk'
Copy-Item -LiteralPath $apk -Destination (Join-Path $dist $artifactName) -Force
Write-Host "== BUILD OK: dist\$artifactName" -ForegroundColor Green
