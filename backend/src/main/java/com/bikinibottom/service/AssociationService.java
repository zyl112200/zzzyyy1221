package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.bikinibottom.common.Result;
import com.bikinibottom.entity.User;
import com.bikinibottom.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 钓鱼协会业务：协会任务 / 100 人钓鱼比赛 / 1-9 星认证徽章。
 * <p>与前端离线引擎 localEngine.js 中的协会实现保持同一套规则与返回结构：</p>
 * <ul>
 *   <li>协会不定时发布任务，每波 10 条（≥1 山海 + ≥3 神话），完成后可领取贝壳 / 金石奖励；</li>
 *   <li>钓鱼比赛：真人在线报名 → 1 分钟匹配 → 不足 100 人由人机补齐 → 比赛 1 小时比累计钓获总重；
 *       凡参赛有保底奖励，前三名 1 亿 / 5000 万 / 1000 万贝壳；</li>
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
    /** 报名后匹配时长：1 分钟；正式比赛时长：1 个小时；每场 100 人 */
    private static final long COMP_MATCH_DURATION = 60 * 1000L;
    private static final long COMP_DURATION = 60 * 60 * 1000L;
    private static final int COMP_TOTAL = 100;
    /** 参与保底奖励（贝壳）——只要报名并进入比赛，即使名落孙山也有 */
    private static final long COMP_BASE_REWARD = 1_000_000L;
    /** 前三名奖励（贝壳）：1 亿 / 5000 万 / 1000 万 */
    private static final int[][] COMP_REWARDS = {
            {1, 100000000},
            {2, 50000000},
            {3, 10000000}
    };
    /** 人机名字池（真人报名不足 100 人时补齐用） */
    private static final String[] COMP_BOT_NAMES = {
            "海棉宝宝", "派大星", "章鱼哥", "蟹老板", "珊迪", "痞老板", "小蜗", "珍珍",
            "云中子", "清风道人", "明月真人", "剑无痕", "灵溪子", "玄霄上人", "青丘散人", "白泽居士",
            "赤霄客", "金刀客", "木叶真人", "水镜先生", "火云邪神", "土行孙", "天机子", "地藏客",
            "清虚道长", "紫霞仙子", "碧海潮生", "幽篁居士", "星河散人", "辰砂道人", "扶摇子", "沧溟客",
            "流光道人", "问天客", "忘机子", "惊鸿客", "照水真人", "横空道人", "青冥子", "白鹭上人",
            "赤练仙子", "金乌客", "木叶真人", "水月道人", "火德真君", "厚土道人", "天枢子", "地灵客",
            "玄真道人", "紫电青霜", "碧落散人", "幽谷客", "星辰子", "辰光道人"
    };
    private static final long TASK_LIFETIME_MIN = 20 * 60 * 1000L;
    private static final long TASK_LIFETIME_MAX = 40 * 60 * 1000L;
    private static final long TASK_GAP_MIN = 5 * 60 * 1000L;
    private static final long TASK_GAP_MAX = 15 * 60 * 1000L;
    /** 每波一次发布 10 条任务（≥1 山海 + ≥3 神话），最多保留 4 波 */
    private static final int ASSOC_TASKS_PER_BATCH = 10;
    private static final int ASSOC_TASK_KEEP = 40;

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

    /** 名次奖励：{ 名次, 贝壳, 称号 } */
    private static class Reward {
        final int rank;
        final long shells;
        final String title;
        Reward(int rank, long shells, String title) {
            this.rank = rank;
            this.shells = shells;
            this.title = title;
        }
    }

    /** 参赛者：真人（player=true）成绩由钓获累计；人机按计划总重随时间推进 */
    private static class CompEntry {
        final String name;
        final boolean player;
        double total;
        final double planned;
        Integer rank;        // 全场 100 人总重榜名次（含人机，仅展示用）
        Integer realRank;    // 真人榜名次（人机不占位，发奖依据）
        Reward reward;
        CompEntry(String name, boolean player, double planned) {
            this.name = name;
            this.player = player;
            this.planned = planned;
        }
    }

    private static class Competition {
        String phase;                        // MATCHING / RUNNING / FINALIZED
        long matchEndsAt;                    // 匹配截止（报名后 1 分钟）
        long startedAt;
        long endsAt;                         // 比赛截止（开赛后 1 小时）
        List<String> signups = new ArrayList<>();   // 本场在线报名的真人用户名
        List<CompEntry> entries = new ArrayList<>(); // 100 名参赛者
        int realPlayerCount;                        // 实际入场的真人玩家数
        boolean finalized;
    }

    private static class CompRecord {
        String username;
        int rank;
        double total;
        long at;
        CompRecord(String username, int rank, double total, long at) {
            this.username = username;
            this.rank = rank;
            this.total = total;
            this.at = at;
        }
    }

    private final List<AssocTask> tasks = new ArrayList<>();
    private final List<CompRecord> compRecords = new ArrayList<>();
    private Competition competition;
    private final List<String> nextSignups = new ArrayList<>(); // 比赛进行中的下一场预报名
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
        advanceComp(now);
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

    /** 报名钓鱼比赛：匹配中加入本场；比赛进行中登记下一场；空闲则开一场新匹配 */
    public synchronized Result<Map<String, Object>> compStart(String username) {
        User u = getUser(username);
        if (u == null) return Result.error("仙门名录上没有此人 🌫️");
        long now = System.currentTimeMillis();
        advanceComp(now);
        Competition c = competition;
        if (c != null && "MATCHING".equals(c.phase)) {
            if (c.signups.contains(u.getUsername())) {
                return Result.success("你已报名本场，等待匹配结束…", compSignupData(c));
            }
            c.signups.add(u.getUsername());
            return Result.success("⚔️ 报名成功！匹配中…已有 " + c.signups.size()
                    + " 名真人在线报名，1 分钟后开赛（不足 100 人由人机补齐）", compSignupData(c));
        }
        if (c != null && "RUNNING".equals(c.phase)) {
            if (!nextSignups.contains(u.getUsername())) nextSignups.add(u.getUsername());
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("phase", "RUNNING");
            data.put("endsAt", c.endsAt);
            data.put("remaining", Math.max(0, c.endsAt - now));
            return Result.success("比赛正在进行，已为你登记下一场：本场结束后自动进入 1 分钟匹配 🐟", data);
        }
        // 空闲 / 上一场已结束：开新匹配
        List<String> signups = new ArrayList<>(nextSignups);
        if (!signups.contains(u.getUsername())) signups.add(u.getUsername());
        int count = openMatch(now, signups);
        return Result.success("⚔️ 报名成功！1 分钟匹配中，已有 " + count
                + " 名真人在线报名；不足 100 人由人机补齐", compSignupData(competition));
    }

    private Map<String, Object> compSignupData(Competition c) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("phase", c.phase);
        data.put("matchEndsAt", c.matchEndsAt);
        data.put("signupCount", c.signups.size());
        data.put("duration", COMP_MATCH_DURATION);
        return data;
    }

    /** 查询比赛实时战况（到点自动结算并发放奖励） */
    public synchronized Result<Map<String, Object>> compState(String username) {
        User u = getUser(username);
        if (u == null) return Result.error("仙门名录上没有此人 🌫️");
        long now = System.currentTimeMillis();
        ensureTasks(now);
        advanceComp(now);
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

        // 2) 钓鱼比赛：进行中则累计本次钓获重量（只有报名入场的真人参赛者才计入）
        advanceComp(now);
        Competition c = competition;
        if (c != null && "RUNNING".equals(c.phase)) {
            for (CompEntry e : c.entries) {
                if (e.player && e.name.equals(uname)) {
                    e.total = round1(e.total + weight);
                    msgs.add("⚔️ 比赛中！你已累计 " + fmtWeight(e.total) + " 斤");
                    break;
                }
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
        // 每波一次发布 10 条：至少 1 条山海 + 3 条神话，其余按品级权重随机，最后打乱顺序
        List<String> tiers = new ArrayList<>(List.of("SHANHAI", "MYTHIC", "MYTHIC", "MYTHIC"));
        while (tiers.size() < ASSOC_TASKS_PER_BATCH) tiers.add(rollTaskTier());
        Collections.shuffle(tiers, random);
        for (String tier : tiers) {
            List<String> pool = POOLS.get(tier);
            String fish = pool.get(random.nextInt(pool.size()));
            double[] range = TIER_RANGE.get(tier);
            int rewardShells = (int) Math.round(range[2] * (120 + 2 * Math.pow(range[1], 0.6)) * 10);
            int rewardGold = Math.max(5, (int) Math.round(range[3] * Math.pow(range[1], 0.45) * 4));
            long lifetime = TASK_LIFETIME_MIN
                    + (long) (random.nextDouble() * (TASK_LIFETIME_MAX - TASK_LIFETIME_MIN));
            tasks.add(new AssocTask(nextTaskId.getAndIncrement(), fish, tier, (long) range[0],
                    rewardShells, rewardGold, now, now + lifetime));
        }
        while (tasks.size() > ASSOC_TASK_KEEP) tasks.remove(0);
        nextTaskAt = now + TASK_LIFETIME_MAX + TASK_GAP_MIN
                + (long) (random.nextDouble() * (TASK_GAP_MAX - TASK_GAP_MIN));
    }

    /** 任务品级权重：普通 60% / 稀有 22% / 传说 11% / 神话 5% / 山海 2% */
    private String rollTaskTier() {
        double roll = random.nextDouble();
        return roll < 0.6 ? "COMMON" : roll < 0.82 ? "RARE" : roll < 0.93 ? "LEGENDARY"
                : roll < 0.98 ? "MYTHIC" : "SHANHAI";
    }

    /** 协会比赛人机总重抽样：多数对手可以战胜，偶尔冒出钓鱼高手 */
    private double sampleNpcTotal() {
        double roll = random.nextDouble();
        if (roll < 0.6) return 30 + random.nextDouble() * 770;
        if (roll < 0.85) return 800 + random.nextDouble() * 7200;
        if (roll < 0.97) return 8000 + random.nextDouble() * 92000;
        return 100000 + random.nextDouble() * 700000;
    }

    /** 生成不重复的人机名字（真人报名不足 100 人时补齐） */
    private List<String> botNames(int count) {
        List<String> names = new ArrayList<>();
        Set<String> used = new HashSet<>();
        for (int i = 0; i < count; i++) {
            String name = COMP_BOT_NAMES[i % COMP_BOT_NAMES.length];
            if (i >= COMP_BOT_NAMES.length) name = name + (i / COMP_BOT_NAMES.length + 1);
            while (used.contains(name)) name = name + "·" + (i + 1);
            used.add(name);
            names.add(name);
        }
        return names;
    }

    /** 新建一场匹配（1 分钟），报名者来自「下一场预报名 + 当前报名人」 */
    private int openMatch(long now, List<String> signups) {
        nextSignups.clear();
        Competition c = new Competition();
        c.phase = "MATCHING";
        c.matchEndsAt = now + COMP_MATCH_DURATION;
        c.signups = new ArrayList<>(new LinkedHashSet<>(signups)); // 去重且保序
        competition = c;
        return c.signups.size();
    }

    /** 推进比赛状态：匹配到期 → 开赛；比赛到期 → 结算，并自动开启下一场匹配 */
    private void advanceComp(long now) {
        Competition c = competition;
        if (c == null) return;
        if ("MATCHING".equals(c.phase) && now >= c.matchEndsAt) {
            startCompRace(now);
        } else if ("RUNNING".equals(c.phase) && now >= c.endsAt) {
            finalizeComp(now);
            if (!nextSignups.isEmpty()) openMatch(now, nextSignups);
        }
    }

    /** 匹配结束正式开赛：已报名真人全部入场，不足 100 人用人机补齐 */
    private void startCompRace(long now) {
        Competition c = competition;
        if (c == null || !"MATCHING".equals(c.phase)) return;
        for (String name : c.signups) c.entries.add(new CompEntry(name, true, 0));
        int botCount = Math.max(0, COMP_TOTAL - c.entries.size());
        for (String name : botNames(botCount)) c.entries.add(new CompEntry(name, false, sampleNpcTotal()));
        c.phase = "RUNNING";
        c.startedAt = now;
        c.endsAt = now + COMP_DURATION;
    }

    /** 结算（双榜）：
     *  · 全场 100 人（真人 + 人机）按总重排「总重榜」rank，只用于榜单展示；
     *  · 高额奖励只在在线报名的真人玩家之间按真人榜 realRank 产生，人机不领奖也不占领奖名次；
     *  · 真人榜前三拿 1 亿 / 5000 万 / 1000 万，其余真人拿保底 100 万。
     */
    private void finalizeComp(long now) {
        Competition c = competition;
        if (c == null || c.finalized || "FINALIZED".equals(c.phase)) return;
        if ("MATCHING".equals(c.phase)) startCompRace(now);
        c.finalized = true;
        c.phase = "FINALIZED";
        for (CompEntry e : c.entries) if (!e.player) e.total = e.planned;
        // 1) 全场总重榜（含人机）
        List<CompEntry> sorted = new ArrayList<>(c.entries);
        sorted.sort((a, b) -> Double.compare(b.total, a.total));
        for (int i = 0; i < sorted.size(); i++) sorted.get(i).rank = i + 1;
        // 2) 真人榜：人机不占领奖名次（sorted 已按总重降序，真人子序列同样有序）
        int realRank = 0;
        for (CompEntry e : sorted) {
            if (!e.player) continue;
            realRank++;
            e.realRank = realRank;
            long shells = COMP_BASE_REWARD;
            String title = "参与奖";
            for (int[] rw : COMP_REWARDS) {
                if (rw[0] == realRank) {
                    shells = rw[1];
                    title = realRank == 1 ? "冠军" : realRank == 2 ? "亚军" : "季军";
                    break;
                }
            }
            e.reward = new Reward(realRank, shells, title);
            User u = getUser(e.name);
            if (u != null) {
                u.setShells((int) Math.min(Integer.MAX_VALUE, (long) shellOf(u) + shells));
                userMapper.updateById(u);
            }
            compRecords.add(0, new CompRecord(e.name, realRank, e.total, now));
        }
        c.realPlayerCount = realRank;
        while (compRecords.size() > 100) compRecords.remove(compRecords.size() - 1);
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
            boolean matching = "MATCHING".equals(c.phase);
            List<Map<String, Object>> entries = new ArrayList<>();
            if (matching) {
                // 匹配期：只展示在线报名的真人，逐一确认「真人报名才会被匹配」
                for (String name : c.signups) {
                    Map<String, Object> e = new LinkedHashMap<>();
                    e.put("name", name);
                    e.put("isPlayer", true);
                    e.put("isMe", name.equals(u.getUsername()));
                    e.put("total", 0);
                    e.put("rank", null);
                    e.put("realRank", null);
                    e.put("reward", null);
                    entries.add(e);
                }
            } else {
                long elapsed = Math.max(0, Math.min(COMP_DURATION, now - c.startedAt));
                for (CompEntry ce : c.entries) {
                    Map<String, Object> e = new LinkedHashMap<>();
                    e.put("name", ce.name);
                    e.put("isPlayer", ce.player);
                    e.put("isMe", ce.name.equals(u.getUsername()));
                    e.put("total", ce.player ? ce.total
                            : Math.min(ce.planned, Math.round(ce.planned * elapsed / (double) COMP_DURATION)));
                    if ("FINALIZED".equals(c.phase)) {
                        e.put("rank", ce.rank);          // 全场 100 人总重榜名次
                        e.put("realRank", ce.realRank);  // 真人榜名次（发奖依据）
                        if (ce.reward != null) {
                            Map<String, Object> rw = new LinkedHashMap<>();
                            rw.put("rank", ce.reward.rank);
                            rw.put("shells", ce.reward.shells);
                            rw.put("title", ce.reward.title);
                            e.put("reward", rw);
                        } else {
                            e.put("reward", null);
                        }
                    } else {
                        e.put("rank", null);
                        e.put("realRank", null);
                        e.put("reward", null);
                    }
                    entries.add(e);
                }
            }
            Map<String, Object> mine = null;
            for (Map<String, Object> e : entries) {
                if (Boolean.TRUE.equals(e.get("isMe"))) { mine = e; break; }
            }
            int humanCount = matching ? c.signups.size() : (int) c.entries.stream().filter(e -> e.player).count();
            int botCount = matching ? Math.max(0, COMP_TOTAL - c.signups.size())
                    : (int) c.entries.stream().filter(e -> !e.player).count();
            Map<String, Object> comp = new LinkedHashMap<>();
            comp.put("phase", c.phase);
            comp.put("matchEndsAt", c.matchEndsAt);
            comp.put("signupCount", humanCount);
            comp.put("botCount", botCount);
            comp.put("totalPlayers", COMP_TOTAL);
            comp.put("startedAt", c.startedAt);
            comp.put("endsAt", c.endsAt);
            comp.put("duration", COMP_DURATION);
            comp.put("finalized", "FINALIZED".equals(c.phase));
            comp.put("rank", mine == null ? null : mine.get("realRank"));   // 领奖名次：真人榜
            comp.put("overallRank", mine == null ? null : mine.get("rank")); // 全场 100 人总重榜名次
            comp.put("realPlayerCount", matching ? c.signups.size()
                    : (c.realPlayerCount > 0 ? c.realPlayerCount : humanCount));
            comp.put("reward", mine == null ? null : mine.get("reward"));
            comp.put("remaining", matching ? Math.max(0, c.matchEndsAt - now)
                    : "RUNNING".equals(c.phase) ? Math.max(0, c.endsAt - now) : 0);
            comp.put("total", mine == null ? 0 : mine.get("total"));
            if (!matching) {
                entries.sort(Comparator.comparingDouble(x -> -((Number) x.get("total")).doubleValue()));
            }
            comp.put("entries", entries);
            data.put("competition", comp);
        } else {
            data.put("competition", null);
        }

        // 参赛记录（只看当前用户的）
        List<Map<String, Object>> recList = new ArrayList<>();
        for (CompRecord r : compRecords) {
            if (r.username != null && !r.username.equals(u.getUsername())) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rank", r.rank);
            m.put("total", r.total);
            m.put("at", r.at);
            recList.add(m);
            if (recList.size() >= 10) break;
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
