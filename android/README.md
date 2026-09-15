# NEON STRIKE — Android 打包

WebView 壳工程，将本仓库根目录的 HTML5 游戏打包为标准 Android APK。

## 目录结构

```
dafeiji/
├── index.html / style.css / js/     # 游戏(H5 源,APK 内置离线运行)
├── android/                          # Android 打包工程
│   ├── settings.gradle.kts
│   ├── build.gradle.kts
│   ├── gradle.properties
│   ├── gradlew / gradlew.bat
│   ├── gradle/wrapper/               # wrapper 配置
│   └── app/
│       ├── build.gradle.kts          # 应用模块构建脚本
│       ├── proguard-rules.pro
│       └── src/main/
│           ├── AndroidManifest.xml   # 竖屏、无网络权限
|           ├── java/com/neonstrike/game/
│           │   └── MainActivity.java # WebView 壳(全屏、离线资产)
│           ├── assets/www/           # 游戏资产(js 与根目录同步)
│           └── res/                  # 图标/主题/字符串
└── dist/                             # APK 产物输出
```

## 打包步骤

### 1. 本地工具链(可选,已有全局 JDK/SDK 可跳过)

工具链统一放在 `D:\ai\biancheng\.venv\`:

```
.venv\
├── jdk17\          # JDK 17
├── gradle-8.7\     # Gradle
├── android-sdk\    # Android SDK(cmdline-tools + platform + build-tools)
└── downloads\      # 安装包缓存
```

### 2. 构建命令

PowerShell(先跑 `android\build-local.ps1` 配置环境再构建):

```powershell
cd D:\ai\biancheng\worksplace\dafeiji\android
.\build-local.ps1
```

产物: `android\dist\neon-strike-1.0.0.apk`(复制到任意安卓设备安装即可)。

### 3. 同步游戏资产

游戏源码变更后重新打包前:

```powershell
cd D:\ai\biancheng\worksplace\dafeiji
.\sync-assets.ps1
```

## 技术说明

- **离线运行**: 游戏全部资源内置 `assets/www`,无网络权限,隐私安全
- **竖屏锁定**: `screenOrientation="portrait"` 符合纵版射击玩法
- **返回键**: 最小化应用而非销毁 WebView,进度不丢
- **minSdk 24** (Android 7.0) / **targetSdk 34** (Android 14)
- 签名: debug 自动签名;release 需自备 keystore
