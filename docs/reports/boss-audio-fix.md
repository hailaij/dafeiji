# Boss 配乐恢复修复（v1.6.0）

2026-09-24，基于 v1.5.1 排查。

复现：浏览器正常启动 Boss 战时 AudioContext 为 running，音乐总线建立；暂停游戏并模拟浏览器/系统挂起 AudioContext 后，点击继续，游戏恢复 playing，但 AudioContext 仍为 suspended，Boss 配乐无法继续。旧版 resume() 没有在用户手势中恢复音频。

修复：继续游戏时调用音频初始化/恢复；键盘和 pointerdown 用户手势也能重新解锁音频。初始化兼容 suspended/interrupted 与已关闭上下文，处理 resume() 的 Promise 拒绝。音乐调度异常保留诊断状态并输出去重警告，避免吞掉所有错误。未修改音乐音量与谱曲。

验证：test/audio.ui.test.js 使用 Chrome 实际 AudioContext 与 AnalyserNode，在独立音乐总线上检测 11 首 Boss 配乐的非零浮点采样，排除射击音效干扰；验证暂停后音乐停止、挂起后点击继续恢复、指针手势恢复、静音和取消静音。原 792 组 Boss 模式/音乐调度、输入及战斗回归也通过。

边界：这是可复现的无声路径，不能证明用户当次无声仅由此引起。没有人工听音、没有设备扬声器或系统音量测试，也没有 Android/iOS 音频中断实机复测。普通敌人波次当前只设计音效，连续配乐在 Boss 战出现。修复随 v1.6.0 发布，测试结论不包含安装包实机复测。
