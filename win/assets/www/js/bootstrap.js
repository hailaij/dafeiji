(function () {
  'use strict';
  var hosted = /^(apps\.gamesvibe\.app|vibeapps\.lumigrav\.space)$/.test(location.hostname);
  async function boot() {
    var loader = null;
    if (hosted) {
      var loaded = await window.__neonWorkshopLoader;
      if (!loaded || !window.VibeHubWorkshop) throw new Error('工坊加载失败，请检查网络后刷新；不会跳过已启用的 Mod。');
      loader = window.VibeHubWorkshop;
    }
    if (loader) await loader.beforeStart;
    window.DFJ.start();
    if (loader) {
      loader.markGameReady();
      await loader.afterStart;
    }
  }
  window.__neonBoot = boot().catch(function (error) {
    console.error(error);
    var message = document.createElement('p');
    message.textContent = error.message;
    message.setAttribute('role', 'alert');
    message.style.cssText = 'position:fixed;inset:20px;z-index:9999;background:#111;color:#fff;padding:20px';
    document.body.appendChild(message);
  });
})();
