# -*- coding: utf-8 -*-
"""把批量生成的写实拼图切成单张透明 PNG，并裁掉背景图右下角水印。"""
import os
from PIL import Image

RAW2 = os.path.join(os.path.dirname(__file__), "raw2")
RAW = os.path.join(os.path.dirname(__file__), "raw")
FISH_OUT = os.path.join(os.path.dirname(__file__), "fish")
ICON_OUT = os.path.join(os.path.dirname(__file__), "icons")
MAP_OUT = os.path.join(os.path.dirname(__file__), "maps")

# 文件 -> (列数, 行数, 名称列表，按从左到右/从上到下)
SHEETS = {
    "Hyper_realistic_wildlife_photo_2026-11-23T02-40-08.png": (5, 1, [
        "xiaochouyu", "redaiyu", "hetun", "shadingyu", "qingyu"]),
    "Hyper_realistic_wildlife_photo_2026-11-23T02-40-38.png": (5, 1, [
        "zhangyu", "youyu", "diwangxie", "juxingshiban", "dianman"]),
    "Hyper_realistic_wildlife_photo_2026-11-23T02-40-59.png": (5, 1, [
        "shenhailongyu", "dujiaojing", "huangjinhaima", "dawangwuzei", "youlingsha"]),
    "Photorealistic_fantasy_creatur_2026-11-23T02-41-22.png": (6, 1, [
        "kun", "zhulong", "jiuweihu", "baize", "fenghuang", "qilin"]),
    "Photorealistic_fantasy_creatur_2026-11-23T02-41-46.png": (5, 2, [
        "kunpeng", "taotie", "qiongqi", "xiangliu", "xuanwu",
        "yinglong", "bashe", "lingyu", "dijiang", "zheng"]),

    "A_neat_grid_of_8_separate_real_2026-11-23T02-42-33.png": (4, 2, [
        "coin", "gem", "power", "shell", "hook", "line", "trophy", "clover"]),
    "A_neat_grid_of_8_separate_real_2026-11-23T02-42-53.png": (4, 2, [
        "bait_worm", "bait_shrimp", "potion", "mountain", "book", "cart", "backpack", "tools"]),
    "A_neat_grid_of_8_separate_real_2026-11-23T02-43-17.png": (4, 2, [
        "map", "chart", "medals", "key", "gift", "clock", "swords", "scroll"]),
    "A_neat_grid_of_8_separate_real_2026-11-23T02-43-40.png": (4, 2, [
        "signpost", "gong", "vibrate", "lotus", "leaf", "taiji", "star", "moon"]),
    "A_neat_grid_of_8_separate_real_2026-11-23T02-44-07.png": (4, 2, [
        "user", "search", "plus", "edit", "warning", "save", "lock", "target"]),
    "A_neat_grid_of_5_separate_real_2026-11-23T02-44-31.png": (5, 1, [
        "map_linghu", "map_beiyuan", "map_jibei", "map_shenyuan", "map_penglai"]),
}

# 带灰渐变的拼图需要 flood 抠底 + 手动列边界
FLOOD_SHEETS = {
    "Photorealistic_fantasy_creatur_2026-11-23T02-41-22.png":
        [10, 258, 512, 768, 1024, 1284, 1536],
    "Photorealistic_fantasy_creatur_2026-11-23T02-41-46.png": None,  # 用下方自定义边界
}

# 山海组：每行 5 只，按主体间隙自动测得的切分点
SHANHAI_X = [
    [0, 393, 632, 961, 1238, 1536],  # 上排
    [0, 399, 673, 947, 1221, 1536],  # 下排
]

FISH_NAMES = set(["xiaochouyu", "redaiyu", "hetun", "shadingyu", "qingyu",
    "zhangyu", "youyu", "diwangxie", "juxingshiban", "dianman",
    "shenhailongyu", "dujiaojing", "huangjinhaima", "dawangwuzei", "youlingsha",
    "kun", "zhulong", "jiuweihu", "baize", "fenghuang", "qilin",
    "kunpeng", "taotie", "qiongqi", "xiangliu", "xuanwu",
    "yinglong", "bashe", "lingyu", "dijiang", "zheng"])


def whiten_to_alpha(img, thr_lo=228, thr_hi=250, flood=False):
    """近白背景 -> 透明。flood=True 时从边缘连通抠底（适合带灰渐变的背景）。"""
    from collections import deque
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size

    def is_bg(x, y):
        r, g, b, _ = px[x, y]
        mn, mx = min(r, g, b), max(r, g, b)
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        return lum >= thr_lo and mx - mn <= 30

    if flood:
        seen = bytearray(w * h)
        dq = deque()
        for x in range(w):
            for y in (0, h - 1):
                if is_bg(x, y) and not seen[y * w + x]:
                    seen[y * w + x] = 1; dq.append((x, y))
        for y in range(h):
            for x in (0, w - 1):
                if is_bg(x, y) and not seen[y * w + x]:
                    seen[y * w + x] = 1; dq.append((x, y))
        while dq:
            x, y = dq.popleft()
            px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
            for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_bg(nx, ny):
                    seen[ny * w + nx] = 1; dq.append((nx, ny))
        # 二次清理：与透明区相邻、仍偏亮低饱和的边缘像素做柔和过渡
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                mn, mx = min(r, g, b), max(r, g, b)
                lum = 0.299 * r + 0.587 * g + 0.114 * b
                if lum >= 205 and mx - mn <= 26:
                    alpha = max(0, min(255, int(255 * (232 - lum) / 27)))
                    px[x, y] = (r, g, b, min(a, alpha))
        return img

    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            mn, mx = min(r, g, b), max(r, g, b)
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum >= thr_hi and mx - mn <= 18:
                px[x, y] = (r, g, b, 0)
            elif lum >= thr_lo and mx - mn <= 18:
                alpha = int(255 * (thr_hi - lum) / (thr_hi - thr_lo))
                px[x, y] = (r, g, b, min(a, alpha))
    return img


def clean_fragments(cell):
    """清掉与主体不相连的小碎片（相邻生物边角、水印残片）。"""
    from collections import deque
    w, h = cell.size
    amap = cell.getchannel("A").load()
    seen = bytearray(w * h)
    comps = []
    for y0 in range(h):
        for x0 in range(w):
            if amap[x0, y0] > 12 and not seen[y0 * w + x0]:
                dq = deque([(x0, y0)]); seen[y0 * w + x0] = 1
                n = 0; minx = maxx = x0; miny = maxy = y0
                while dq:
                    x, y = dq.popleft(); n += 1
                    minx, maxx = min(minx, x), max(maxx, x)
                    miny, maxy = min(miny, y), max(maxy, y)
                    for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx] and amap[nx, ny] > 12:
                            seen[ny*w+nx] = 1; dq.append((nx, ny))
                comps.append((n, (minx, miny, maxx, maxy)))
    if len(comps) <= 1:
        return cell
    main = max(comps, key=lambda c: c[0])
    mb = main[1]
    px = cell.load()
    for n, b in comps:
        if b == mb:
            continue
        dx = max(mb[0] - b[2], b[0] - mb[2], 0)
        dy = max(mb[1] - b[3], b[1] - mb[3], 0)
        if n < main[0] * 0.08 and (dx * dx + dy * dy) ** 0.5 > 20:
            for yy in range(b[1], b[3] + 1):
                for xx in range(b[0], b[2] + 1):
                    r, g, bb, a = px[xx, yy]
                    px[xx, yy] = (r, g, bb, 0)
    return cell


def trim(img, pad=8, max_dim=512):
    bb = img.getchannel("A").getbbox()
    if not bb:
        return img
    x0, y0, x1, y1 = bb
    pad = min(pad, 12)
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(img.size[0], x1 + pad), min(img.size[1], y1 + pad)
    img = img.crop((x0, y0, x1, y1))
    if max(img.size) > max_dim:
        k = max_dim / max(img.size)
        img = img.resize((max(1, int(img.size[0] * k)), max(1, int(img.size[1] * k))), Image.LANCZOS)
    return img


def main():
    for d in (FISH_OUT, ICON_OUT, MAP_OUT):
        os.makedirs(d, exist_ok=True)

    for sheet, (cols, rows, names) in SHEETS.items():
        path = os.path.join(RAW2, sheet)
        img = Image.open(path).convert("RGBA")
        w, h = img.size
        cw, ch = w // cols, h // rows
        manual = FLOOD_SHEETS.get(sheet)
        flood = sheet in FLOOD_SHEETS
        print(sheet, img.size, "->", cols, "x", rows)
        for i, name in enumerate(names):
            r, c = divmod(i, cols)
            if sheet == "Photorealistic_fantasy_creatur_2026-11-23T02-41-46.png":
                xs = SHANHAI_X[r]
                cell = img.crop((xs[c], r * ch, xs[c + 1], (r + 1) * ch))
            elif manual:
                cell = img.crop((manual[c], r * ch, manual[c + 1], (r + 1) * ch))
            else:
                cell = img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            cell = whiten_to_alpha(cell, flood=flood)
            cell = clean_fragments(cell)
            cell = trim(cell, pad=10 if name in FISH_NAMES else 14,
                        max_dim=512 if name in FISH_NAMES else 320)
            if name in FISH_NAMES:
                out = os.path.join(FISH_OUT, name + ".png")
            elif name.startswith("map_"):
                out = os.path.join(MAP_OUT, name + ".png")
            else:
                out = os.path.join(ICON_OUT, name + ".png")
            cell.save(out)
            print("  ", name, cell.size)

    # 背景：裁掉右下角平台水印（底部约 60px），保持 16:10 构图
    bg_jobs = [
        ("Photorealistic_cinematic_CG_ma_2026-11-23T02-39-04.png", "scene_bg.png"),
        ("Photorealistic_underwater_phot_2026-11-23T02-39-22.png", "ocean_bg.png"),
    ]
    for src, dst in bg_jobs:
        img = Image.open(os.path.join(RAW, src)).convert("RGB")
        w, h = img.size
        img = img.crop((0, 0, w, h - 58))
        # 补回到原比例（轻微纵向拉伸不影响构图）
        img = img.resize((w, h), Image.LANCZOS)
        img.save(os.path.join(os.path.dirname(__file__), dst), quality=92)
        print("bg", dst, img.size)


if __name__ == "__main__":
    main()
