using System;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace NeonStrike
{
    /// <summary>
    /// NEON STRIKE Windows 桌面壳：WebView2 全屏加载内嵌的游戏资产（assets/www）。
    /// 与 Android 壳同一思路：游戏本体零改动，壳只负责窗口与 WebView 托管。
    /// </summary>
    public class MainForm : Form
    {
        private readonly WebView2 _web;
        private readonly string _wwwDir;

        public MainForm()
        {
            Text = "NEON STRIKE · 霓虹突袭";
            ClientSize = new System.Drawing.Size(480, 800);   // 竖屏游戏窗口
            MinimumSize = new System.Drawing.Size(320, 480);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = System.Drawing.Color.FromArgb(8, 12, 26);

            _wwwDir = ExtractAssets();

            _web = new WebView2 { Dock = DockStyle.Fill };
            Controls.Add(_web);

            Load += OnLoad;
            FormClosing += (s, e) => _web?.Dispose();
        }

        private async void OnLoad(object sender, EventArgs e)
        {
            try
            {
                var userData = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "NeonStrike", "WebView2");
                var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
                await _web.EnsureCoreWebView2Async(env);

                _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _web.CoreWebView2.Navigate(new Uri(Path.Combine(_wwwDir, "index.html")).AbsoluteUri);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "WebView2 初始化失败：" + ex.Message,
                    "NEON STRIKE", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
            }
        }

        /// <summary>把嵌入 exe 的游戏资产解压到 %LOCALAPPDATA%\NeonStrike\&lt;版本&gt;\www。</summary>
        private static string ExtractAssets()
        {
            var ver = Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";
            var root = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "NeonStrike", ver);
            var www = Path.Combine(root, "www");

            if (!Directory.Exists(www))
            {
                Directory.CreateDirectory(www);
                var asm = Assembly.GetExecutingAssembly();
                foreach (var name in asm.GetManifestResourceNames())
                {
                    if (!name.StartsWith("www/", StringComparison.Ordinal)) continue;
                    var rel = name.Substring(4).Replace('\\', '/');
                    var target = Path.Combine(www, rel.Replace('/', Path.DirectorySeparatorChar));
                    var dir = Path.GetDirectoryName(target);
                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                    using (var s = asm.GetManifestResourceStream(name))
                    using (var f = File.Create(target))
                        s.CopyTo(f);
                }
            }
            return www;
        }
    }
}
