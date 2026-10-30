# -*- coding: utf-8 -*-
"""把整排鱼类素材图切成单只 PNG：白底透明化 + 递归间隙分割 + 碎片清理"""
import os, collections
from PIL import Image, ImageDraw

RAW = r"D:\workSpace\zzzyyy1221\src\assets\fish\raw"
OUT = r"D:\workSpace\zzzyyy1221\src\assets\fish"

SHEETS = {
    "sheet_common.png":   ["xiaochouyu", "redaiyu", "hetun", "shadingyu", "qingyu"],
    "sheet_rare.png":     ["zhangyu", "youyu", "diwangxie", "juxingshiban", "dianman"],
    "sheet_legendary2.png":["shenhailongyu", "dujiaojing", "huangjinhaima", "dawangwuzei", "youlingsha"],
    "sheet_mythic.png":   ["kun", "zhulong", "jiuweihu", "baize", "fenghuang", "qilin"],
    "sheet_shanhai.png":  ["kunpeng", "taotie", "qiongqi", "xiangliu", "xuanwu",
                           "yinglong", "bashe", "lingyu", "dijiang", "zheng"],
}

BG_MIN = 205     # 背景亮度阈值
GAP_MIN = 8      # 认定为间隙的最少连续空列
MAX_DIM = 460
MIN_SPLIT_DIST = 55   # 相邻切分点最小间距（px），保证每只生物完整
MIN_SEG_MASS = 2500   # 每段最少不透明像素（防止把 C 形个体切成细条）
SMOOTH = 5            # 列质量平滑窗口

# 生成器水印所在区域（原图坐标），切分前先抹除
PRE_CLEAN = {
    "sheet_rare.png": [(1380, 900, 1536, 1024)],
    "sheet_legendary2.png": [(1370, 920, 1536, 1024)],
}

# 手调切分区间（x 边界，按网格图读数）：个体粘连/白色个体被误吃的表用
MANUAL_X = {
    "sheet_rare.png":      [25, 285, 470, 895, 1255, 1510],
    "sheet_legendary2.png": [20, 275, 630, 785, 1225, 1515],
}

# 按颜色距离抠底的表（阈值）：底色与所有生物颜色都拉开
COLOR_KEY = {
    "sheet_legendary2.png": 20,
}



def key_by_color(img, thr):
    """按与左上角背景色的距离抠底（底色均匀且与生物颜色拉开时使用）。"""
    img = img.convert("RGBA")
    br, bg_, bb, _ = img.getpixel((2, 2))
    px = img.load()
    w, h = img.size
    thr2 = thr * thr
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            dr, dg, db = r - br, g - bg_, b - bb
            if dr * dr + dg * dg + db * db <= thr2:
                px[x, y] = (r, g, b, 0)
    return img

def key_out_bg(img, bg_min=None):
    """从边框 BFS，把与边缘连通的亮底（含浅灰水印）置透明。"""
    thr = bg_min if bg_min is not None else BG_MIN
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    seen = bytearray(w * h)
    dq = collections.deque()
    def is_bg(x, y):
        r, g, b, a = px[x, y]
        return r >= thr and g >= thr and b >= thr
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
        for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and is_bg(nx, ny):
                seen[ny * w + nx] = 1; dq.append((nx, ny))
    for y in range(h):
        base = y * w
        for x in range(w):
            if seen[base + x]:
                r, g, b, a = px[x, y]
                px[x, y] = (r, g, b, 0)
    return img

def remove_grain(img):
    """清掉底噪：面积 <200px 且平均亮度 >=195 的零散小组件（AI 底噪颗粒）置透明。
    保留主体、暗色部件与电花等彩色装饰（亮度或面积不达标）。"""
    w, h = img.size
    px = img.load()
    amap = img.getchannel("A").load()
    seen = bytearray(w * h)
    drops = []
    for y0 in range(h):
        for x0 in range(w):
            if amap[x0, y0] > 12 and not seen[y0 * w + x0]:
                dq = collections.deque([(x0, y0)])
                seen[y0 * w + x0] = 1
                coords = []
                lum = 0.0
                while dq:
                    x, y = dq.popleft()
                    coords.append((x, y))
                    r, g, b, a = px[x, y]
                    lum += 0.3 * r + 0.6 * g + 0.1 * b
                    for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx] and amap[nx, ny] > 12:
                            seen[ny*w+nx] = 1; dq.append((nx, ny))
                if coords and len(coords) < 200 and lum / len(coords) >= 195:
                    drops.extend(coords)
    for x, y in drops:
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
    if drops:
        print(f"    底噪清理 {len(drops)}px")
    return img

def group_components(img, n):
    """整图连通域按 x 排序，DP 划分成连续的 n 组，使各组横向跨度总和最小。
    每只生物（含分离部件如电花、发光球）天然聚成一组。"""
    w, h = img.size
    amap = img.getchannel("A").load()
    seen = bytearray(w * h)
    comps = []
    for y0 in range(h):
        for x0 in range(w):
            if amap[x0, y0] > 12 and not seen[y0 * w + x0]:
                dq = collections.deque([(x0, y0)])
                seen[y0 * w + x0] = 1
                minx = maxx = x0; miny = maxy = y0; cnt = 0
                while dq:
                    x, y = dq.popleft()
                    cnt += 1
                    if x < minx: minx = x
                    if x > maxx: maxx = x
                    if y < miny: miny = y
                    if y > maxy: maxy = y
                    for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx] and amap[nx, ny] > 12:
                            seen[ny*w+nx] = 1; dq.append((nx, ny))
                if cnt >= 40:  # 过滤底噪小点
                    comps.append((minx, miny, maxx + 1, maxy + 1))
    comps.sort(key=lambda b: (b[0] + b[2]) / 2)
    m = len(comps)
    if m < n:
        return None
    xs_left = [b[0] for b in comps]
    xs_right = [b[2] for b in comps]
    INF = float("inf")
    # dp[j][k]: 前 j 个组件分成 k 组的最小总跨度
    dp = [[INF] * (n + 1) for _ in range(m + 1)]
    par = [[None] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = 0
    for j in range(1, m + 1):
        for k in range(1, n + 1):
            for i in range(k - 1, j):
                if dp[i][k - 1] == INF:
                    continue
                span = xs_right[j - 1] - xs_left[i]
                if dp[i][k - 1] + span < dp[j][k]:
                    dp[j][k] = dp[i][k - 1] + span
                    par[j][k] = i
    if dp[m][n] == INF:
        return None
    groups, j, k = [], m, n
    while k > 0:
        i = par[j][k]
        grp = comps[i:j]
        groups.append((min(b[0] for b in grp), min(b[1] for b in grp),
                       max(b[2] for b in grp), max(b[3] for b in grp)))
        j, k = i, k - 1
    groups.reverse()
    return groups

def mass_splits(img, n):
    """列质量 DP 切分：在生物之间的质量低谷处下刀，对'个体相连'和'底噪'都鲁棒。
    f[j][k] = 前 j 个候选列中选 k 个切分点（相邻间距 >= MIN_SPLIT_DIST）的最小列质量和。"""
    w, h = img.size
    amap = img.getchannel("A").load()
    mass = [0] * w
    for x in range(w):
        c = 0
        for y in range(h):
            if amap[x, y] > 12:
                c += 1
        mass[x] = c
    r = SMOOTH // 2
    sm = [0.0] * w
    for x in range(w):
        lo2, hi2 = max(0, x - r), min(w, x + r + 1)
        sm[x] = sum(mass[lo2:hi2]) / (hi2 - lo2)
    pre = [0] * (w + 1)
    for x in range(w):
        pre[x + 1] = pre[x] + mass[x]
    bbox = img.getchannel("A").getbbox()
    lo, hi = bbox[0] + 15, bbox[2] - 15
    cols = list(range(lo, hi))
    J = len(cols)
    need = n - 1
    if J <= need * MIN_SPLIT_DIST:
        return None
    INF = float("inf")
    f = [[INF] * (need + 1) for _ in range(J + 1)]
    pm = [[INF] * (need + 1) for _ in range(J + 1)]
    pa = [[-1] * (need + 1) for _ in range(J + 1)]
    dec = [[""] * (need + 1) for _ in range(J + 1)]
    f[0][0] = 0.0
    for j in range(J + 1):
        if j > 0:
            for k in range(need + 1):
                best, d = f[j - 1][k], "N"
                pj = j - MIN_SPLIT_DIST
                if pj >= 0 and k > 0 and pm[pj][k - 1] != INF:
                    # 段 (pj..j-1] 的不透明像素总量必须达标，防止切出细条碎片
                    if pre[cols[j - 1] + 1] - pre[cols[pj]] >= MIN_SEG_MASS:
                        v = pm[pj][k - 1] + sm[cols[j - 1]]
                        if v < best:
                            best, d = v, "C"
                f[j][k] = best
                dec[j][k] = d
        for k in range(need + 1):
            if j == 0 or f[j][k] < pm[j - 1][k]:
                pm[j][k] = f[j][k]; pa[j][k] = j
            else:
                pm[j][k] = pm[j - 1][k]; pa[j][k] = pa[j - 1][k]
    if f[J][need] == INF:
        return None
    splits, j, k = [], J, need
    while k > 0 and j > 0:
        if dec[j][k] == "C":
            splits.append(cols[j - 1])
            j = pa[j - MIN_SPLIT_DIST][k - 1]
            k -= 1
        else:
            j -= 1
    splits.reverse()
    if len(splits) != need:
        return None
    # 首尾段也要够分量
    if pre[splits[0]] - pre[bbox[0]] < MIN_SEG_MASS or pre[bbox[2]] - pre[splits[-1]] < MIN_SEG_MASS:
        return None
    bounds = [bbox[0]] + splits + [bbox[2]]
    return [(bounds[i], 0, bounds[i + 1], h) for i in range(n)]

def split_range(proj, lo, hi, n):
    """把列区间 [lo,hi) 递归切成 n 段：优先在中点附近找空列间隙，否则找质量最弱点。"""
    if n <= 1 or hi - lo < 20:
        return [(lo, hi)]
    mid = (lo + hi) // 2
    best_gap, run_start = None, None
    for x in range(lo, hi):
        if proj[x] == 0:
            if run_start is None:
                run_start = x
        else:
            if run_start is not None and x - run_start >= GAP_MIN:
                gx = (run_start + x) // 2
                if best_gap is None or abs(gx - mid) < abs(best_gap - mid):
                    best_gap = gx
            run_start = None
    if run_start is not None and hi - run_start >= GAP_MIN:
        gx = (run_start + hi) // 2
        if best_gap is None or abs(gx - mid) < abs(best_gap - mid):
            best_gap = gx
    if best_gap is None:
        cands = range(lo + (hi - lo) // 3, hi - (hi - lo) // 3)
        best_gap = min(cands, key=lambda x: proj[x])
    left_n = round(n * (best_gap - lo) / (hi - lo))
    left_n = max(1, min(n - 1, left_n))
    return split_range(proj, lo, best_gap, left_n) + split_range(proj, best_gap, hi, n - left_n)

def clean_fragments(cell):
    """丢掉与主体相距甚远的小碎片（水印残字等），保留贴近主体的零散部件（电花）。"""
    w, h = cell.size
    am = cell.getchannel("A")
    amap = am.load()
    seen = bytearray(w * h)
    comps = []
    for y0 in range(h):
        for x0 in range(w):
            if amap[x0, y0] > 12 and not seen[y0 * w + x0]:
                dq = collections.deque([(x0, y0)])
                seen[y0 * w + x0] = 1
                n = 0; minx = maxx = x0; miny = maxy = y0
                while dq:
                    x, y = dq.popleft()
                    n += 1
                    if x < minx: minx = x
                    if x > maxx: maxx = x
                    if y < miny: miny = y
                    if y > maxy: maxy = y
                    for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny*w+nx] and amap[nx, ny] > 12:
                            seen[ny*w+nx] = 1; dq.append((nx, ny))
                comps.append({"n": n, "bbox": (minx, miny, maxx, maxy)})
    if len(comps) <= 1:
        return cell
    main = max(comps, key=lambda c: c["n"])
    mb = main["bbox"]
    def near_main(cb):
        dx = max(mb[0] - cb[2], cb[0] - mb[2], 0)
        dy = max(mb[1] - cb[3], cb[1] - mb[3], 0)
        return (dx * dx + dy * dy) ** 0.5
    px = cell.load()
    dropped = 0
    for c in comps:
        if c is main:
            continue
        if c["n"] < main["n"] * 0.03 and near_main(c["bbox"]) > 30:
            x1, y1, x2, y2 = c["bbox"]
            for yy in range(y1, y2 + 1):
                for xx in range(x1, x2 + 1):
                    r, g, b, a = px[xx, yy]
                    if a > 0:
                        px[xx, yy] = (r, g, b, 0)
            dropped += 1
    if dropped:
        print(f"    清理碎片 x{dropped}")
    return cell

def main():
    os.makedirs(OUT, exist_ok=True)
    for sheet, names in SHEETS.items():
        path = os.path.join(RAW, sheet)
        img = Image.open(path).convert("RGBA")
        if sheet in PRE_CLEAN:
            dr = ImageDraw.Draw(img)
            for rect in PRE_CLEAN.get(sheet, []):
                dr.rectangle(rect, fill=(0, 0, 0, 0))
        if sheet in COLOR_KEY:
            img = key_by_color(img, COLOR_KEY[sheet])
        else:
            img = key_out_bg(img)
        img = remove_grain(img)
        if sheet in MANUAL_X:
            xs = MANUAL_X[sheet]
            groups = [(xs[i], 0, xs[i + 1], img.size[1]) for i in range(len(xs) - 1)]
            print(f"{sheet}: 使用手调区间切出 {len(groups)} 组")
        else:
            groups = mass_splits(img, len(names))
            if groups is None:
                print(f"{sheet}: 质量 DP 失败，回退连通域聚类")
                groups = group_components(img, len(names))
            if groups is None:
                print(f"{sheet}: 聚类失败，回退列投影切分")
                mask = img.getchannel("A").point(lambda a: 255 if a > 12 else 0)
                bbox = mask.getbbox()
                proj_x, _ = mask.getprojection()
                segs = split_range(proj_x, bbox[0], bbox[2], len(names))
                groups = [(x1, 0, x2, img.size[1]) for x1, x2 in segs]
            else:
                print(f"{sheet}: 质量 DP 切出 {len(groups)} 组")
        for g, name in zip(groups, names):
            cell = img.crop(g)
            cell = clean_fragments(cell)
            bb = cell.getchannel("A").getbbox()
            if not bb:
                print(f"  !! {name} 为空"); continue
            pad = 6
            bb = (max(0, bb[0]-pad), max(0, bb[1]-pad),
                  min(cell.size[0], bb[2]+pad), min(cell.size[1], bb[3]+pad))
            cell = cell.crop(bb)
            if max(cell.size) > MAX_DIM:
                k = MAX_DIM / max(cell.size)
                cell = cell.resize((max(1, int(cell.size[0]*k)), max(1, int(cell.size[1]*k))), Image.LANCZOS)
            cell.save(os.path.join(OUT, name + ".png"))
            print(f"  {name}.png {cell.size}")

if __name__ == "__main__":
    main()
