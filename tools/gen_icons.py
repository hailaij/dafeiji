# -*- coding: utf-8 -*-
"""NEON STRIKE PWA 图标 — 忠实复刻 android 自适应图标矢量设计
来源: android/app/src/main/res/mipmap-anydpi-v26/
  - 前景 #00f0ff 青色战机 + #dffbff 高光
  - 背景矢量 #ff00e5 品红舰影(衬底)
  - 底色 #05060e
输出: icons/icon-512.png / icon-maskable-512.png / apple-touch-icon.png
"""
from PIL import Image, ImageDraw, ImageFilter
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons")
os.makedirs(OUT, exist_ok=True)

# 与 Android 矢量完全一致的路径(108x108 viewport)
CYAN_SHIP = [(54, 26), (60, 44), (74, 66), (60, 60), (54, 68), (48, 60), (34, 66), (48, 44)]
MAGENTA_SHIP = [(54, 30), (59, 44), (70, 60), (59, 56), (54, 62), (49, 56), (38, 60), (49, 44)]
HIGHLIGHT = [(52.5, 42), (55.5, 42), (54, 52)]

BG = (5, 6, 14)          # #05060e
CYAN = (0, 240, 255)     # #00f0ff
MAGENTA = (255, 0, 229)  # #ff00e5
WHITEISH = (223, 251, 255)  # #dffbff


def render(size, rounded):
    """按 Android 108x108 viewport 等比绘制"""
    s = size / 108.0
    sc = lambda pts: [(x * s, y * s) for x, y in pts]

    img = Image.new("RGBA", (size, size), BG + (255,))
    d = ImageDraw.Draw(img)

    # 柔光晕层(轻微,保持接近原设计的扁平感)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.polygon(sc(MAGENTA_SHIP), fill=MAGENTA + (70,))
    gd.polygon(sc(CYAN_SHIP), fill=CYAN + (60,))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.03))
    img.alpha_composite(glow)

    # 主体:品红舰影在下,青色战机在上,白色高光最后
    d.polygon(sc(MAGENTA_SHIP), fill=MAGENTA + (255,))
    d.polygon(sc(CYAN_SHIP), fill=CYAN + (255,))
    d.polygon(sc(HIGHLIGHT), fill=WHITEISH + (255,))

    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255)
        img.putalpha(mask)
    return img


def save(img, size, name):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), "PNG")
    print("saved %s (%dx%d)" % (name, size, size))


# 与旧文件同名覆盖,manifest/sw/index.html 引用不变
save(render(512, rounded=True), 512, "icon-512.png")            # PWA any
save(render(512, rounded=False), 512, "icon-maskable-512.png")  # maskable 需全幅
save(render(180, rounded=False), 180, "apple-touch-icon.png")   # iOS 自行圆角
print("done")
