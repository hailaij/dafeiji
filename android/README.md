# NEON STRIKE — Android 打包

WebView 壳工程，将本仓库根目录的 HTML5 游戏打包为标准 Android APK。

## 目录结构

```
dafeiji/
├── index.html / style.css / js/     # 游戏(H5 源,APK 内置离线运行)
├── tools/gen_icons.py               # PWA 图标生成脚本(需 Pillow,见根 requirements.txt)
├── icons/                           # 生成的 PWA 图标
├── android/                          # Android 打包工程
│   ├── settings.gradle.kts
│   ├── build.gradle.kts
│   ├── gradle.properties
│   ├── gradlew / gradlew.bat        # Gradle Wrapper(克隆即可构建,自动下载 Gradle 8.7)
│   ├── gradle/wrapper/              # wrapper 配置 + jar
│   └── app/
│       ├── build.gradle.kts         # 应用模块构建脚本
│       ├── proguard-rules.pro
│       └── src/main/
│           ├── AndroidManifest.xml   # 竖屏、无网络权限
│           ├── java/com/neonstrike/game/
│           │   └── MainActivity.java # WebView 壳(全屏、离线资产)
│           ├── assets/www/           # 游戏资产(js 与根目录同步)
│           └── res/                  # 图标/主题/字符串
└── dist/                             # APK 产物输出(gitignore,不入库)
```

## 准备工具链

需要 **JDK 17** 与 **Android SDK**(platforms;android-34、build-tools;34.0.0、platform-tools)。

- 已装 Android Studio 的话,SDK 在 `%LOCALAPPDATA%\Android\Sdk`,JDK 在 Studio 自带的 jbr 目录
- 命令行党可手动装 JDK 17 + cmdline-tools,然后:
  ```powershell
  sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"
  ```
- 本项目自带 `android\.venv-android\` 约定:把 jdk17 / android-sdk / gradle-8.7 放这里即可被
  脚本自动识别(该目录已 gitignore,不入库;Windows 上可用 junction 链接到既有安装)

## 构建命令

### 方式 A: 一键脚本(推荐)

```powershell
cd <仓库根>\android
.\build-local.ps1
```

脚本按以下优先级自动定位工具链,全部失败才报错:

1. 环境变量 `JAVA_HOME` / `ANDROID_HOME`(你已有的全局安装优先)
2. `<仓库根>\android\.venv-android\`(本项目约定的本地工具链目录,已 gitignore)

### 方式 B: 标准 Gradle

装好 JDK 17 + Android SDK 后,环境变量生效即可:

```powershell
cd <仓库根>\android
.\gradlew.bat assembleDebug
```

Wrapper 会自动下载 Gradle 8.7,`local.properties`(gitignore)由脚本生成或手动写 `sdk.dir=<SDK 路径>`。

产物: `android\dist\neon-strike-1.2.5.apk`(复制到任意安卓设备安装即可)。

## 同步游戏资产

游戏源码变更后重新打包前:

```powershell
cd <仓库根>
.\sync-assets.ps1
```

## 技术说明

- **离线运行**: 游戏全部资源内置 `assets/www`,无网络权限,隐私安全
- **竖屏锁定**: `screenOrientation="portrait"`,符合纵版射击玩法
- **返回键**: 最小化应用而非销毁 WebView,进度不丢
- **minSdk 24** (Android 7.0) / **targetSdk 34** (Android 14)
- 签名: debug 自动签名;release 需自备 keystore
