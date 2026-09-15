# NEON STRIKE Android 一键构建脚本
# 用法: cd android; .\build-local.ps1
#
# 工具链定位优先级:
#   1. 环境变量 JAVA_HOME / ANDROID_HOME(已有全局安装优先)
#   2. <仓库根>\android\.venv-android\  (本地工具链目录, gitignore)
#   3. D:\ai\biancheng\.venv\           (作者机器兜底, 其他环境可删除此分支)
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
    # 3) 作者机器兜底(可按需删除)
    $authorFallback = 'D:\ai\biancheng\.venv'
    if (Test-Path (Join-Path $authorFallback 'jdk17\bin\java.exe')) {
        Write-Host "== using author fallback toolchain: $authorFallback" -ForegroundColor DarkGray
        return @{ java = (Join-Path $authorFallback 'jdk17') }
    }
    throw "JDK 17 not found. Set JAVA_HOME, or place jdk17/ under android\.venv-android\."
}

$tc = Resolve-Toolchain
$env:JAVA_HOME = $tc.java

# ANDROID_HOME 同样三级定位
if (-not ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME))) {
    $candidates = @(
        (Join-Path $androidDir '.venv-android\android-sdk'),
        'D:\ai\biancheng\.venv\android-sdk'
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

Write-Host "== gradlew assembleDebug"
& (Join-Path $androidDir 'gradlew.bat') assembleDebug --no-daemon
if ($LASTEXITCODE -ne 0) { throw "gradle build failed: $LASTEXITCODE" }

# 收集 APK
$apk = Get-ChildItem (Join-Path $androidDir 'app\build\outputs\apk\debug') -Filter '*.apk' | Select-Object -First 1
if (-not $apk) { throw 'APK not produced' }
Copy-Item $apk.FullName (Join-Path $dist $apk.Name) -Force
Write-Host ""
Write-Host "== BUILD OK: dist\$($apk.Name)" -ForegroundColor Green
