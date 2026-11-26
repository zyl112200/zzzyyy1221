package com.bikinibottom.util;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 天时灵汐：十二时辰 × 五天象（与前端 src/data/sky.js 同构）。
 * 天象由「日期 + 时辰」确定性推出，同一时刻结果恒定；
 * 抛竿锁定 weatherKey + shichenIndex，前端可据此还原画面，避免跨时辰错位。
 */
public final class SkyUtil {

    private SkyUtil() {}

    /** 五天象：key / 名称 / 基础倍率（稀有几率加成、鱼重、收益、张力、等待） */
    public record Weather(String key, String name, double rareBoost, double weightMul,
                          double coinMul, double tensionMul, double waitMul) {}

    private static final Weather[] WEATHERS = {
            new Weather("clear",  "晴",   0.00, 1.00, 1.00, 1.00, 1.00),
            new Weather("cloudy", "多云", 0.02, 1.05, 1.02, 0.98, 0.95),
            new Weather("wind",   "起风", 0.04, 1.10, 1.05, 1.12, 0.82),
            new Weather("rain",   "细雨", 0.08, 1.18, 1.12, 1.08, 0.90),
            new Weather("moon",   "月华", 0.14, 1.30, 1.25, 1.18, 0.78)
    };
    private static final int[] WEIGHTS = {34, 26, 18, 15, 7};

    /** 当前时辰 index（0~11）：子时跨 23:00–01:00 */
    public static int shichenIndex(LocalDateTime now) {
        return ((now.getHour() + 1) % 24) / 2;
    }

    /** 由日期 + 时辰确定性推出天象 key */
    public static String weatherKey(LocalDateTime now, int shichenIndex) {
        int seed = Math.abs(now.getYear() * 10000 + (now.getMonthValue()) * 100
                + now.getDayOfMonth());
        int total = 0;
        for (int w : WEIGHTS) total += w;
        int r = Math.abs(seed * 13 + shichenIndex * 97) % total;
        for (int i = 0; i < WEATHERS.length; i++) {
            r -= WEIGHTS[i];
            if (r < 0) return WEATHERS[i].key();
        }
        return WEATHERS[0].key();
    }

    private static Weather byKey(String key) {
        for (Weather w : WEATHERS) if (w.key().equals(key)) return w;
        return WEATHERS[0];
    }

    /** 天象 + 时辰合成的数值加成（与前端 skyEffects 同构） */
    public static Map<String, Double> effects(String weatherKey, int shichenIndex) {
        Weather w = byKey(weatherKey);
        int i = (shichenIndex % 12 + 12) % 12;
        double middayBoost = (i == 0 || i == 6) ? 0.04 : (i == 5 ? -0.03 : 0);
        double wave = middayBoost + (((i * 7) % 5) - 2) * 0.01;
        Map<String, Double> fx = new LinkedHashMap<>();
        fx.put("rareBoost", Math.max(0, w.rareBoost() + wave * 0.5));
        fx.put("weightMul", round3(w.weightMul() * (1 + wave)));
        fx.put("coinMul", round3(w.coinMul() * (1 + wave * 0.6)));
        fx.put("tensionMul", round3(w.tensionMul() * (1 + wave * 0.8)));
        fx.put("waitMul", round3(w.waitMul() * (1 - wave * 0.5)));
        return fx;
    }

    private static double round3(double v) {
        return Math.round(v * 1000) / 1000.0;
    }

    /** 当前天象快照（抛竿时用） */
    public record SkySnap(String weatherKey, int shichenIndex, Map<String, Double> effects) {}

    public static SkySnap now(LocalDateTime at) {
        int idx = shichenIndex(at);
        String key = weatherKey(at, idx);
        return new SkySnap(key, idx, effects(key, idx));
    }
}
