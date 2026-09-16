# NEON STRIKE · 霓虹突袭 — Windows 桌面版

游戏本体是零依赖的 HTML5 + Canvas 网页(仓库根目录),本目录是其 Windows 桌面壳:**WebView2(WinForms)加载内嵌的游戏资产**,与 `android/` 的 WebView 壳同一思路——游戏代码零改动,壳只负责窗口与托管。

## 特性

- 单文件自包含 exe(`win-x64`),目标机器**无需安装 .NET**,仅需系统自带的 WebView2 运行时(Win11 预装,Win10 多数预装)
- 游戏资产(js/css/html)内嵌进 exe,启动时自动解压到 `%LOCALAPPDATA%\NeonStrike\<版本>\www`,无需额外文件
- 竖屏游戏窗口(默认 480×800,可缩放,画布自适应)
- 键盘 / 鼠标 / 触屏输入全部沿用游戏本体,无需额外适配
- 无网络权限需求,完全离线运行;高分仍走 localStorage

## 构建

```powershell
# 1) 同步游戏资产(仓库根目录执行)
.\sync-assets.ps1

# 2) 一键构建
cd win
.\build-local.ps1
```

工具链定位(与 android 的 `.venv-android` 约定一致):

1. 环境变量 `PATH` 中的 dotnet(SDK 8+)
2. `<仓库根>\win\.venv-dotnet\`(本地工具链目录,已 gitignore;无 SDK 时用仓库内 `dotnet-install.ps1` 安装:`.\.venv-dotnet` 目录执行 `.\dotnet-install.ps1 -Channel 8.0 -InstallDir .\.venv-dotnet -NoPath`)

产物: `win\dist\neon-strike-<版本>-win64.exe`(复制到任意 Win10/11 x64 设备双击即可玩)。

## 同步游戏资产

`..\sync-assets.ps1` 会把根目录 `index.html / style.css / manifest.json / sw.js / icons/ / js/` 同步到 `win\assets\www`(同时也会同步 Android 壳),改游戏代码后记得重新同步再构建。

## 版本

版本号与全仓库同步(见根 README 更新日志);`NeonStrike.csproj` 的 `<Version>` 是 Windows 壳的版本权威来源。
