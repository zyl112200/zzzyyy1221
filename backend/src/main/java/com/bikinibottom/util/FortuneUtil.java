package com.bikinibottom.util;

import java.util.Random;

/**
 * 仙缘奇遇：抛竿瞬间约 22% 触发的一次性机缘（与前端 src/data/fortune.js 同构）。
 */
public final class FortuneUtil {

    private FortuneUtil() {}

    public record Fortune(String id, String name, int weight, double rareBoost,
                          double weightMul, double coinMul, double tensionMul, int bonusShells) {}

    private static final Fortune[] FORTUNES = {
            new Fortune("winding",        "风起云涌", 30, 0.03, 1.08, 1.05, 1.05, 20),
            new Fortune("spirit_rain",    "灵雨甘霖", 24, 0.06, 1.15, 1.12, 1.08, 60),
            new Fortune("moon_bless",     "月老牵缘", 18, 0.12, 1.22, 1.20, 1.10, 150),
            new Fortune("dragon_omen",    "龙吟震荡", 12, 0.16, 1.35, 1.30, 1.28, 400),
            new Fortune("immortal_cloud", "仙人指路", 9,  0.20, 1.40, 1.45, 1.15, 800),
            new Fortune("treasure",       "宝光乍现", 7,  0.08, 1.10, 1.80, 1.05, 1500)
    };

    private static final double TRIGGER_RATE = 0.22;

    /** 抽取本次奇遇，未触发返回 null */
    public static Fortune roll(Random random) {
        if (random.nextDouble() >= TRIGGER_RATE) return null;
        int total = 0;
        for (Fortune f : FORTUNES) total += f.weight();
        int r = random.nextInt(total);
        for (Fortune f : FORTUNES) {
            r -= f.weight();
            if (r < 0) return f;
        }
        return FORTUNES[FORTUNES.length - 1];
    }

    /** 奇遇额外金币 */
    public static int bonusShells(Fortune f) {
        return f == null ? 0 : f.bonusShells();
    }
}
