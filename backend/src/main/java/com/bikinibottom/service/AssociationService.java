package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.bikinibottom.common.Result;
import com.bikinibottom.entity.User;
import com.bikinibottom.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 钓鱼协会业务：协会任务 / 2 分钟钓鱼比赛 / 1-9 星认证徽章。
 * <p>与前端离线引擎 localEngine.js 中的协会实现保持同一套规则与返回结构：</p>
 * <ul>
 *   <li>协会不定时发布「钓起一条指定灵鱼」任务，完成后可领取贝壳 / 金石奖励；</li>
 *   <li>钓鱼比赛：报名后开赛 2 分钟，与其他玩家（协会成员，离线模拟）比累计钓获重量，前三名有奖；</li>
 *   <li>认证徽章：单独钓起一只 ≥ 门槛重量的灵鱼即授予对应星级（1~9 星）。</li>
 * </ul>
 * <p>任务与比赛状态保存在内存中（服务重启即重置，与 pending 遭遇一致）；
 * 徽章与历史最重单尾持久化在 user 表（max_caught_weight / assoc_badge）。</p>
 */
@Service
public class AssociationService {

    private final UserMapper userMapper;
    private final Random random = new Random();

    // ---------------- 常量（与 localEngine.js 保持一致） ----------------

    /** 徽章星级门槛（斤）：1~9 星对应单尾重量 */
    private static final long[] BADGE_THRESHOLDS = {
            1000, 5000, 20000, 100000, 500000, 1000000, 2000000, 5000000, 10000000
    };
    private static final long COMP_DURATION = 2 * 60 * 1000L;
    private static final int COMP_NPC_COUNT = 4;
    private static final String[] COMP_NPC_NAMES = {
            "海棉宝宝", "派大星", "章鱼哥", "蟹老板", "珊迪", "痞老板", "小蜗", "珍珍"
    };
    private static final int[][] COMP_REWARDS = {
            // { 名次, 贝壳, 金石 }
            {1, 2000, 200},
            {2, 1000, 100},
            {3, 500, 50}
    };
    private static final long TASK_LIFETIME_MIN = 20 * 60 * 1000L;
    private static final long TASK_LIFETIME_MAX = 40 * 60 * 1000L;
    private static final long TASK_GAP_MIN = 5 * 60 * 1000L;
    private static final long TASK_GAP_MAX = 15 * 60 * 1000L;

    /** 任务鱼池：品级 → 名称池（与 localEngine.js POOLS 一致） */
    private static final Map<String, List<String>> POOLS = new LinkedHashMap<>();
    static {
        POOLS.put("COMMON", List.of("小丑鱼", "热带鱼", "河豚", "沙丁鱼", "鲭鱼"));
        POOLS.put("RARE", List.of("章鱼", "鱿鱼", "帝王蟹", "巨型石斑", "电鳗"));
        POOLS.put("LEGENDARY", List.of("深海龙鱼", "独角鲸", "黄金海马", "大王乌贼", "幽灵鲨"));
        POOLS.put("MYTHIC", List.of("鲲", "烛龙", "九尾狐", "白泽", "凤凰", "麒麟"));
        POOLS.put("SHANHAI", List.of("鲲鹏", "饕餮", "穷奇", "相柳", "玄武", "应龙", "巴蛇", "陵鱼", "帝江", "狰"));
    }
    private static final Map<String, String> TIER_LABEL = Map.of(
            "COMMON", "普通", "RARE", "稀有", "LEGENDARY", "传说", "MYTHIC", "神话", "SHANHAI", "山海"
    );
    private static final Map<String, double[]> TIER_RANGE = Map.of(
            // { minW, maxW, shellMul, goldMul }
            "COMMON", new double[]{0.5, 8, 1.0, 0.6},
            "RARE", new double[]{15, 300, 2.5, 1.5},
            "LEGENDARY", new double[]{300, 8000, 6, 3.5},
            "MYTHIC", new double[]{5000, 120000, 15, 8},
            "SHANHAI", new double[]{20000, 1000000, 30, 15}
    );

    // ---------------- 内存状态 ----------------

    private static class AssocTask {
        final int id;
        final String fishName;
        final String tier;
        final long minWeight;
        final int rewardShells;
        final int rewardGold;
        final long publishedAt;
        final long expiresAt;
        final Map<String, Double> progress = new HashMap<>();   // username -> 已钓起该鱼最大重量
        final Map<String, Boolean> claimedBy = new HashMap<>(); // username -> 已领奖

        AssocTask(int id, String fishName, String tier, long minWeight,
                  int rewardShells, int rewardGold, long publishedAt, long expiresAt) {
            this.id = id;
            this.fishName = fishName;
            this.tier = tier;
            this.minWeight = minWeight;
            this.rewardShells = rewardShells;
            this.rewardGold = rewardGold;
            this.publishedAt = publishedAt;
            this.expiresAt = expiresAt;
        }
    }

    private static class NpcEntry {
        final String name;
        final double planned;
        NpcEntry(String name, double planned) { this.name = name; this.planned = planned; }
    }

    private static class Competition {
        String username;
        long startedAt;
        long endsAt;
        double total;                       // 玩家累计钓获重量
        List<NpcEntry> npcs = new ArrayList<>();
        boolean finalized;
        int rank;
        int[] reward;                       // { rank, shells, gold } 或 null
    }

    private static class CompRecord {
        int rank;
        double total;
        long at;
        CompRecord(int rank, double total, long at) { this.rank = rank; this.total = total; this.at = at; }
    }

    private final List<AssocTask> tasks = new ArrayList<>();
    private final List<CompRecord> compRecords = new ArrayList<>();
    private Competition competition;
    private long nextTaskAt = 0L;
    private final AtomicInteger nextTaskId = new AtomicInteger(1);

    public AssociationService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    // ==========================================================
    //  对外接口
    // ==========================================================

    /** 协会主页数据（任务 / 徽章 / 比赛战况） */
    public synchronized Result<Map<String, Object>> info(String username) {
        User u = getUser(username);
        if (u == null) return Result.error("仙门名录上没有此人 🌫️");
        long now = System.currentTimeMillis();
        ensureTasks(now);
        if (competition != null && !competition.finalized && now >= competition.endsAt) {
            finalizeComp(now);
        }
        return Result.success(buildInfo(u, now));
    }

    /** 领取协会任务奖励 */
    public synchronized Result<Map<String, Object>> claimTask(String username, Integer taskId) {
        User u = getUser(username);
        if (u == null) return Result.error("仙门名录上没有此人 🌫️");
        long now = System.currentTimeMillis();
        ensureTasks(now);
        AssocTask t = null;
        for (AssocTask x : tasks) if (x.id == (taskId == null ? -1 : taskId)) { t = x; break; }
        if (t == null) return Result.error("任务不存在或已下架 📋");
        if (now >= t.expiresAt) return Result.error("任务已过期，奖励无法领取");
        if (!t.progress.containsKey(u.getUsername())) {
            return Result.error("还没钓起「" + t.fishName + "」，先去灵湖完成它吧 🎣");
        }
        if (t.claimedBy.containsKey(u.getUsername())) return Result.error("奖励已经领过啦，下一次任务加油 🍃");
        t.claimedBy.put(u.getUsername(), true);
        u.setShells(shellOf(u) + t.rewardShells);
        u.setGoldStones(goldOf(u) + t.rewardGold);
        userMapper.updateById(u);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("shells", u.getShells());
        data.put("goldStones", u.getGoldStones());
        data.put("taskId", t.id);
        return Result.success("任务奖励到账：" + t.rewardShells + " 🐚 + " + t.rewardGold + " 金石 🪙", data);
    }

    /** 报名并开始一场 2 分钟钓鱼比赛 */
    public synchronized Result<Map<String, Object>> compStart(String username) {
        User u = getUser(username);
        if (u == null) return Result.error("仙门名录上没有此人 🌫️");
        long now = System.currentTimeMillis();
        if (competition != null && !competition.finalized) {
            if (now < competition.endsAt) return Result.error("你已在一场比赛中，2 分钟后再来 🐟");
            finalizeComp(now);
        }
        Competition c = new Competition();
        c.username = u.getUsername();
        c.startedAt = now;
        c.endsAt = now + COMP_DURATION;
        c.total = 0;
        List<String> names = new ArrayList<>(List.of(COMP_NPC_NAMES));
        for (int i = 0; i < COMP_NPC_COUNT; i++) {
            int idx = random.nextInt(names.size());
            c.npcs.add(new NpcEntry(names.remove(idx), sampleNpcTotal()));
        }
        c.finalized = false;
        competition = c;
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("endsAt", c.endsAt);
        data.put("duration", COMP_DURATION);
        return Result.success("⚔️ 比赛开始！2 分钟内钓的鱼越重越好，快回灵湖抛竿！", data);
    }

    /** 查询比赛实时战况（到点自动结算并发放奖励） */
    public synchronized Result<Map<String, Object>> compState(String username) {
        User u = getUser(username);
        if (u == null) return Result.error("仙门名录上没有此人 🌫️");
        long now = System.currentTimeMillis();
        ensureTasks(now);
        if (competition != null && !competition.finalized && now >= competition.endsAt) {
            finalizeComp(now);
        }
        return Result.success(buildInfo(u, now));
    }

    // ==========================================================
    //  钓获挂钩（GameService.settle 成功上岸时调用）
    // ==========================================================

    /** 任务进度 / 比赛成绩 / 徽章认证。返回需要前端播报的消息列表 */
    public synchronized List<String> onCatch(User u, String fishName, double weight) {
        long now = System.currentTimeMillis();
        ensureTasks(now);
        List<String> msgs = new ArrayList<>();
        String uname = u.getUsername();

        // 1) 协会任务进度
        for (AssocTask t : tasks) {
            if (!t.fishName.equals(fishName) || now >= t.expiresAt) continue;
            Double best = t.progress.get(uname);
            if (best == null || weight > best) {
                boolean firstDone = best == null;
                t.progress.put(uname, weight);
                if (firstDone) {
                    msgs.add("📋 协会任务达成：「钓起一条" + t.fishName + "」完成！记得去协会领奖");
                }
            }
        }

        // 2) 钓鱼比赛：进行中则累计本次钓获重量
        Competition c = competition;
        if (c != null && !c.finalized) {
            if (now >= c.endsAt) {
                finalizeComp(now);
            } else if (c.username.equals(uname)) {
                c.total = round1(c.total + weight);
                msgs.add("⚔️ 比赛中！你已累计 " + fmtWeight(c.total) + " 斤");
            }
        }

        // 3) 认证徽章：单独钓起一只 ≥ 门槛的灵鱼（持久化 user 表）
        int maxW = u.getMaxCaughtWeight() == null ? 0 : u.getMaxCaughtWeight();
        boolean changed = false;
        if ((long) weight > maxW) {
            maxW = (int) weight;
            u.setMaxCaughtWeight(maxW);
            changed = true;
        }
        int star = 0;
        for (int i = 0; i < BADGE_THRESHOLDS.length; i++) {
            if (weight >= BADGE_THRESHOLDS[i]) star = i + 1;
        }
        int curBadge = u.getAssocBadge() == null ? 0 : u.getAssocBadge();
        if (star > curBadge) {
            u.setAssocBadge(star);
            msgs.add("🏆 钓鱼协会认证：单尾 " + fmtWeight(weight) + " 斤，授予 " + star + " 星专属徽章！");
            changed = true;
        }
        if (changed) userMapper.updateById(u);
        return msgs;
    }

    // ==========================================================
    //  内部
    // ==========================================================

    private void ensureTasks(long now) {
        if (now < nextTaskAt) return;
        // 随机抽鱼：普通鱼 60% / 稀有 22% / 传说 11% / 神话 5% / 山海 2%
        double roll = random.nextDouble();
        String tier = roll < 0.6 ? "COMMON" : roll < 0.82 ? "RARE" : roll < 0.93 ? "LEGENDARY"
                : roll < 0.98 ? "MYTHIC" : "SHANHAI";
        List<String> pool = POOLS.get(tier);
        String fish = pool.get(random.nextInt(pool.size()));
        double[] range = TIER_RANGE.get(tier);
        int rewardShells = (int) Math.round(range[2] * (120 + 2 * Math.pow(range[1], 0.6)) * 10);
        int rewardGold = Math.max(5, (int) Math.round(range[3] * Math.pow(range[1], 0.45) * 4));
        long lifetime = TASK_LIFETIME_MIN + (long) (random.nextDouble() * (TASK_LIFETIME_MAX - TASK_LIFETIME_MIN));
        tasks.add(new AssocTask(nextTaskId.getAndIncrement(), fish, tier, (long) range[0],
                rewardShells, rewardGold, now, now + lifetime));
        while (tasks.size() > 8) tasks.remove(0);
        nextTaskAt = now + TASK_LIFETIME_MAX + TASK_GAP_MIN
                + (long) (random.nextDouble() * (TASK_GAP_MAX - TASK_GAP_MIN));
    }

    /** 协会比赛 NPC 总重抽样：多数对手可以战胜，偶尔冒出钓鱼高手 */
    private double sampleNpcTotal() {
        double roll = random.nextDouble();
        if (roll < 0.6) return 30 + random.nextDouble() * 770;
        if (roll < 0.85) return 800 + random.nextDouble() * 7200;
        if (roll < 0.97) return 8000 + random.nextDouble() * 92000;
        return 100000 + random.nextDouble() * 700000;
    }

    /** 比赛结算：按总重排名并给前三名发奖 */
    private void finalizeComp(long now) {
        Competition c = competition;
        if (c == null || c.finalized) return;
        c.finalized = true;
        double playerTotal = c.total;
        List<double[]> others = new ArrayList<>(); // [0]=planned
        for (NpcEntry n : c.npcs) others.add(new double[]{n.planned});
        others.sort((a, b) -> Double.compare(b[0], a[0]));
        // 排名（含玩家）
        int rank = 1;
        for (double[] o : others) if (o[0] > playerTotal) rank++;
        c.rank = rank;
        c.reward = null;
        for (int[] rw : COMP_REWARDS) {
            if (rw[0] == rank) {
                c.reward = new int[]{rw[0], rw[1], rw[2]};
                User u = getUser(c.username);
                if (u != null) {
                    u.setShells(shellOf(u) + rw[1]);
                    u.setGoldStones(goldOf(u) + rw[2]);
                    userMapper.updateById(u);
                }
                break;
            }
        }
        compRecords.add(0, new CompRecord(rank, playerTotal, now));
        while (compRecords.size() > 5) compRecords.remove(compRecords.size() - 1);
    }

    private Map<String, Object> buildInfo(User u, long now) {
        Map<String, Object> data = new LinkedHashMap<>();
        int badge = u.getAssocBadge() == null ? 0 : u.getAssocBadge();
        int maxW = u.getMaxCaughtWeight() == null ? 0 : u.getMaxCaughtWeight();

        // 任务列表（最新的在前）
        List<Map<String, Object>> taskList = new ArrayList<>();
        for (int i = tasks.size() - 1; i >= 0; i--) {
            AssocTask t = tasks.get(i);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.id);
            m.put("fishName", t.fishName);
            m.put("fishIcon", fishIcon(t.fishName, t.tier));
            m.put("tier", t.tier);
            m.put("tierName", TIER_LABEL.getOrDefault(t.tier, t.tier));
            m.put("minWeight", t.minWeight);
            m.put("rewardShells", t.rewardShells);
            m.put("rewardGold", t.rewardGold);
            m.put("publishedAt", t.publishedAt);
            m.put("expiresAt", t.expiresAt);
            m.put("expired", now >= t.expiresAt);
            Double mine = t.progress.get(u.getUsername());
            m.put("done", mine != null);
            m.put("claimed", t.claimedBy.containsKey(u.getUsername()));
            m.put("myWeight", mine == null ? 0 : mine);
            taskList.add(m);
        }
        data.put("tasks", taskList);
        data.put("nextTaskAt", nextTaskAt);

        // 徽章
        data.put("badgeStar", badge);
        data.put("maxCaughtWeight", maxW);
        List<Long> thresholds = new ArrayList<>();
        for (long v : BADGE_THRESHOLDS) thresholds.add(v);
        data.put("badgeThresholds", thresholds);
        data.put("nextBadgeTarget", badge < BADGE_THRESHOLDS.length ? BADGE_THRESHOLDS[badge] : null);

        // 比赛
        Competition c = competition;
        if (c != null) {
            long elapsed = Math.min(COMP_DURATION, now - c.startedAt);
            List<Map<String, Object>> entries = new ArrayList<>();
            // 玩家
            Map<String, Object> me = new LinkedHashMap<>();
            me.put("name", u.getUsername());
            me.put("isPlayer", true);
            me.put("total", c.total);
            entries.add(me);
            // NPC 成绩随时间推进逐步浮出（模拟对手同时在钓）
            for (NpcEntry n : c.npcs) {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("name", n.name);
                e.put("isPlayer", false);
                e.put("total", Math.min(n.planned, Math.round(n.planned * elapsed / (double) COMP_DURATION)));
                entries.add(e);
            }
            entries.sort(Comparator.comparingDouble(x -> -((Number) x.get("total")).doubleValue()));

            Map<String, Object> comp = new LinkedHashMap<>();
            comp.put("startedAt", c.startedAt);
            comp.put("endsAt", c.endsAt);
            comp.put("duration", COMP_DURATION);
            comp.put("finalized", c.finalized);
            comp.put("rank", c.rank);
            if (c.reward != null) {
                Map<String, Object> rw = new LinkedHashMap<>();
                rw.put("rank", c.reward[0]);
                rw.put("shells", c.reward[1]);
                rw.put("gold", c.reward[2]);
                rw.put("title", c.reward[0] == 1 ? "冠军" : c.reward[0] == 2 ? "亚军" : "季军");
                comp.put("reward", rw);
            } else {
                comp.put("reward", null);
            }
            comp.put("remaining", Math.max(0, c.endsAt - now));
            comp.put("entries", entries);
            data.put("competition", comp);
        } else {
            data.put("competition", null);
        }

        // 参赛记录
        List<Map<String, Object>> recList = new ArrayList<>();
        for (CompRecord r : compRecords) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rank", r.rank);
            m.put("total", r.total);
            m.put("at", r.at);
            recList.add(m);
        }
        data.put("compRecords", recList);
        return data;
    }

    private String fishIcon(String fishName, String tier) {
        // 与前端 POOLS 的 emoji 对应（离线引擎 / 后端保持一致的展示）
        return switch (fishName) {
            case "小丑鱼" -> "🐠";
            case "河豚" -> "🐡";
            case "章鱼" -> "🐙";
            case "鱿鱼", "大王乌贼" -> "🦑";
            case "帝王蟹" -> "🦀";
            case "电鳗" -> "⚡";
            case "深海龙鱼", "应龙" -> "🐉";
            case "烛龙" -> "🐲";
            case "独角鲸", "鲲" -> "🐋";
            case "黄金海马" -> "👑";
            case "幽灵鲨" -> "🦈";
            case "九尾狐" -> "🦊";
            case "白泽" -> "🦄";
            case "凤凰" -> "🔥";
            case "麒麟" -> "🦌";
            case "鲲鹏" -> "🦅";
            case "饕餮" -> "👹";
            case "穷奇" -> "🐯";
            case "相柳", "巴蛇" -> "🐍";
            case "玄武" -> "🐢";
            case "陵鱼" -> "🧜";
            case "帝江" -> "🦋";
            case "狰" -> "🐆";
            default -> "🐟";
        };
    }

    private User getUser(String username) {
        if (username == null || username.isBlank()) return null;
        return userMapper.selectOne(Wrappers.<User>lambdaQuery().eq(User::getUsername, username.trim()));
    }

    private int shellOf(User u) {
        return u.getShells() == null ? 0 : u.getShells();
    }

    private int goldOf(User u) {
        return u.getGoldStones() == null ? 0 : u.getGoldStones();
    }

    private double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private String fmtWeight(double w) {
        if (w >= 1e8) return round1(w / 1e8) + " 亿";
        if (w >= 1e4) return round1(w / 1e4) + " 万";
        return String.valueOf((long) w);
    }
}
