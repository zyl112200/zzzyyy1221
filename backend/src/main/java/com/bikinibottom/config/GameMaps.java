package com.bikinibottom.config;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * 钓场地图目录（与前端 src/data/maps.js 一一对应）。
 * 后端用它提供地图列表、校验 set-map、以及 cast 时计算专属鱼概率与重量。
 *
 * 注意：场景图 / 主题（scene、theme）只存在于前端本地配置中，后端目录只给数值，
 * 前端视觉始终取本地 MAP_MAP，避免后端返回图片 URL 造成跨域或失效。
 */
public final class GameMaps {

    private GameMaps() {}

    public static final String DEFAULT_MAP = "linghu";

    private static final Random RANDOM = new Random();

    private static final List<Map<String, Object>> MAPS = new ArrayList<>();
    private static final Map<String, Map<String, Object>> MAP_BY_ID = new LinkedHashMap<>();

    static {
        add("linghu",   "灵湖",     "map_linghu",   "仙门脚下的一汪灵泉，鱼群寻常，适合初窥门径。",     0.00, 0,      1.0, 1.0);
        add("beiyuan",  "北原",     "map_beiyuan",  "北境荒原的寒潭，灵气稀薄却时有异鱼出没。",       0.30, 300,    1.2, 4.0);
        add("jibei",    "极北之地", "map_jibei",    "天地尽头的不冻冰海，传说深处的专属鱼重逾万斤。", 0.55, 2000,   3.0, 15.0);
        add("shenyuan", "深渊",     "map_shenyuan", "海沟最深处，光无法抵达，巨物横行，专属鱼成群。", 0.75, 20000,  8.0, 40.0);
        add("penglai",  "蓬莱",     "map_penglai",  "海外仙岛，灵气氤氲，专属鱼遍池，凡钓皆珍。",     0.85, 100000, 20.0, 120.0);
    }

    private static void add(String id, String name, String icon, String desc,
                            double exclusiveRate, int recommendPower, double exMin, double exMax) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("icon", icon);
        m.put("desc", desc);
        m.put("exclusiveRate", exclusiveRate);
        m.put("recommendPower", recommendPower);
        m.put("exMin", exMin);
        m.put("exMax", exMax);
        MAPS.add(m);
        MAP_BY_ID.put(id, m);
    }

    /** 全部地图（返回副本列表，防止外部修改内部数据） */
    public static List<Map<String, Object>> maps() {
        List<Map<String, Object>> copy = new ArrayList<>();
        for (Map<String, Object> m : MAPS) copy.add(new LinkedHashMap<>(m));
        return copy;
    }

    /** 按 id 查地图（返回副本） */
    public static Map<String, Object> get(String id) {
        Map<String, Object> m = id == null ? null : MAP_BY_ID.get(id);
        return m == null ? null : new LinkedHashMap<>(m);
    }

    /** 默认地图（灵湖） */
    public static Map<String, Object> defaultMap() {
        return get(DEFAULT_MAP);
    }

    /** 专属鱼目录（与前端 maps.js EXCLUSIVE_FISH 一致） */
    private record ExFish(String name, String icon, String lore) {}

    private static final List<ExFish> EXCLUSIVE_FISH = List.of(
            new ExFish("冰原王鲑", "冰原王鲑", "北原寒潭的霸主，鳞片如霜。"),
            new ExFish("玄冰巨鲲", "玄冰巨鲲", "极北冰海下的庞然阴影。"),
            new ExFish("雪峰飞鲤", "雪峰飞鲤", "跃过极北冰瀑的灵鲤。"),
            new ExFish("幽冥龙王", "幽冥龙王", "统御一方寒域的龙王。"),
            new ExFish("九幽冥鲛", "九幽冥鲛", "深渊血海中的猎手。"),
            new ExFish("蓬莱金鳌", "蓬莱金鳌", "仙岛神龟，背负星辰。"),
            new ExFish("寒渊烛龙", "寒渊烛龙", "海沟尽头一点幽光，传说是龙的幼崽。"),
            new ExFish("冰魄银鳗", "冰魄银鳗", "通体剔透，似一条冻住的闪电。"),
            new ExFish("霜甲巨蟹", "霜甲巨蟹", "甲壳凝结万年寒霜，钳力惊人。"),
            new ExFish("极光锦鲤", "极光锦鲤", "只在极光最盛时现身的祥瑞。")
    );

    /** 随机一条专属鱼（name/icon/lore） */
    public static Map<String, String> randomExclusiveFish() {
        ExFish f = EXCLUSIVE_FISH.get(RANDOM.nextInt(EXCLUSIVE_FISH.size()));
        Map<String, String> m = new LinkedHashMap<>();
        m.put("name", f.name());
        m.put("icon", f.icon());
        m.put("lore", f.lore());
        return m;
    }
}
