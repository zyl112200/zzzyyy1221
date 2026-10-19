package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.bikinibottom.common.Result;
import com.bikinibottom.dto.CastResult;
import com.bikinibottom.dto.GameProfile;
import com.bikinibottom.dto.OwnedItemDto;
import com.bikinibottom.dto.SettleRequest;
import com.bikinibottom.dto.SettleResult;
import com.bikinibottom.dto.TrainResult;
import com.bikinibottom.entity.Item;
import com.bikinibottom.entity.User;
import com.bikinibottom.entity.UserItem;
import com.bikinibottom.mapper.ItemMapper;
import com.bikinibottom.mapper.UserItemMapper;
import com.bikinibottom.mapper.UserMapper;
import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 比奇堡钓鱼小游戏业务：贝壳经济 + 金石 + 力量 + 第一人称搏鱼。
 * <p>抛竿由 {@link #cast(String)} 生成一次「咬钩遭遇」并暂存在内存里，
 * 前端完成拉扯后由 {@link #settle(SettleRequest)} 结算奖励或断线断竿。</p>
 */
@Service
public class GameService {

    private final UserMapper userMapper;
    private final ItemMapper itemMapper;
    private final UserItemMapper userItemMapper;
    private final Random random = new Random();

    /** 待结算的咬钩遭遇（encounterId -> encounter） */
    private final Map<String, PendingEncounter> pending = new LinkedHashMap<>();

    private static final long ENCOUNTER_TTL_MS = 10 * 60 * 1000L;

    public GameService(UserMapper userMapper, ItemMapper itemMapper, UserItemMapper userItemMapper) {
        this.userMapper = userMapper;
        this.itemMapper = itemMapper;
        this.userItemMapper = userItemMapper;
    }

    // ==========================================================
    //  基础
    // ==========================================================

    private User getUser(String username) {
        return userMapper.selectOne(Wrappers.<User>lambdaQuery().eq(User::getUsername, username));
    }

    private int strengthOf(User u) {
        return u.getStrength() == null ? 10 : u.getStrength();
    }

    private int goldOf(User u) {
        return u.getGoldStones() == null ? 0 : u.getGoldStones();
    }

    /** 玩家档案（含钓竿兜底，保证新手永远有一把可用的竿） */
    public Result<GameProfile> me(String username) {
        User u = getUser(username);
        if (u == null) {
            return Result.error("比奇堡查无此人 🐙");
        }
        ensureStarterRod(u.getId());
        return Result.success(buildProfile(u));
    }

    /**
     * 钓竿兜底：一把竿都没有（被巨物拽断且没备用的）时补 1 把初级钓竿并装备，避免玩家彻底卡死。
     * 若存在同款旧记录则复用，绝不新增重复行（历史 bug：重复行导致 selectOne 抛 TooManyResults）。
     */
    private void ensureStarterRod(Long userId) {
        List<UserItem> owned = userItemMapper.selectList(
                Wrappers.<UserItem>lambdaQuery().eq(UserItem::getUserId, userId));
        for (UserItem ui : owned) {
            Item it = itemMapper.selectById(ui.getItemId());
            int q = ui.getQuantity() == null ? 0 : ui.getQuantity();
            if (it != null && "ROD".equals(it.getType()) && q > 0) {
                return;   // 还有能用的竿
            }
        }
        UserItem rod = findFirst(userId, 1L);
        if (rod != null) {
            rod.setQuantity(1);
            rod.setEquipped(1);
            userItemMapper.updateById(rod);
        } else {
            rod = new UserItem();
            rod.setUserId(userId);
            rod.setItemId(1L);
            rod.setQuantity(1);
            rod.setEquipped(1);
            userItemMapper.insert(rod);
        }
    }

    /** 救济饵：弹尽粮绝（没饵且贝壳不够 10）时补 3 个普通饵，防止新手彻底卡死 */
    private void claimReliefBait(Long userId) {
        UserItem bait = findFirst(userId, 5L);
        if (bait != null) {
            bait.setQuantity(3);
            userItemMapper.updateById(bait);
        } else {
            bait = new UserItem();
            bait.setUserId(userId);
            bait.setItemId(5L);
            bait.setQuantity(3);
            bait.setEquipped(0);
            userItemMapper.insert(bait);
        }
    }

    /** 取某道具的第一条背包记录（容忍历史重复行，避免 selectOne 抛 TooManyResults） */
    private UserItem findFirst(Long userId, Long itemId) {
        List<UserItem> list = userItemMapper.selectList(
                Wrappers.<UserItem>lambdaQuery()
                        .eq(UserItem::getUserId, userId)
                        .eq(UserItem::getItemId, itemId));
        return list.isEmpty() ? null : list.get(0);
    }

    private GameProfile buildProfile(User u) {
        GameProfile p = new GameProfile();
        p.setUsername(u.getUsername());
        p.setShells(u.getShells() == null ? 0 : u.getShells());
        p.setStrength(strengthOf(u));
        p.setGoldStones(goldOf(u));

        Map<Long, Item> itemMap = itemMapper.selectList(null).stream()
                .collect(Collectors.toMap(Item::getId, i -> i));

        List<UserItem> owned = userItemMapper.selectList(
                Wrappers.<UserItem>lambdaQuery().eq(UserItem::getUserId, u.getId()));

        int totalBait = 0;
        boolean luckOwned = false;
        Item equippedRod = null;
        Item equippedLine = null;

        List<OwnedItemDto> inventory = new ArrayList<>();
        for (UserItem ui : owned) {
            Item it = itemMap.get(ui.getItemId());
            if (it == null) {
                continue;
            }
            if ("BAIT".equals(it.getType())) {
                totalBait += ui.getQuantity();
            }
            if ("LUCK".equals(it.getType()) && ui.getQuantity() > 0) {
                luckOwned = true;
            }
            boolean equipped = ui.getEquipped() != null && ui.getEquipped() == 1;
            if ("ROD".equals(it.getType()) && equipped) {
                equippedRod = it;
            }
            if ("LINE".equals(it.getType()) && equipped) {
                equippedLine = it;
            }
            OwnedItemDto dto = new OwnedItemDto();
            dto.setUserItemId(ui.getId());
            dto.setItemId(it.getId());
            dto.setName(it.getName());
            dto.setType(it.getType());
            dto.setIcon(it.getIcon());
            dto.setPrice(it.getPrice());
            dto.setPower(it.getPower());
            dto.setLineStrength(it.getLineStrength());
            dto.setMaxCatchWeight(it.getMaxCatchWeight());
            dto.setDescription(it.getDescription());
            dto.setQuantity(ui.getQuantity());
            dto.setEquipped(ui.getEquipped());
            inventory.add(dto);
        }

        // 没有显式装备的竿 / 线时，自动选用最强的那一件
        if (equippedRod == null) {
            equippedRod = inventory.stream()
                    .filter(d -> "ROD".equals(d.getType()))
                    .max(Comparator.comparingInt(d -> d.getPower() == null ? 0 : d.getPower()))
                    .map(d -> itemMap.get(d.getItemId()))
                    .orElse(null);
        }
        if (equippedLine == null) {
            equippedLine = inventory.stream()
                    .filter(d -> "LINE".equals(d.getType()))
                    .max(Comparator.comparingInt(d -> d.getLineStrength() == null ? 0 : d.getLineStrength()))
                    .map(d -> itemMap.get(d.getItemId()))
                    .orElse(null);
        }

        int rodLine = equippedRod == null || equippedRod.getLineStrength() == null ? 0 : equippedRod.getLineStrength();
        int lineLine = equippedLine == null || equippedLine.getLineStrength() == null ? 0 : equippedLine.getLineStrength();
        int rodMax = equippedRod == null || equippedRod.getMaxCatchWeight() == null ? 0 : equippedRod.getMaxCatchWeight();
        int lineMax = equippedLine == null || equippedLine.getMaxCatchWeight() == null ? 0 : equippedLine.getMaxCatchWeight();

        p.setEquippedRodName(equippedRod != null ? equippedRod.getName() : "无");
        p.setEquippedRodPower(equippedRod != null && equippedRod.getPower() != null ? equippedRod.getPower() : 0);
        p.setEquippedLineName(equippedLine != null ? equippedLine.getName() : "无");
        p.setLineStrength(Math.max(rodLine, lineLine));
        p.setMaxCatchWeight(Math.max(rodMax, lineMax) == 0 ? 800 : Math.max(rodMax, lineMax));
        p.setTotalBait(totalBait);
        p.setLuckOwned(luckOwned);
        p.setInventory(inventory);
        return p;
    }

    /** 商店目录 */
    public Result<List<Item>> shopItems() {
        List<Item> items = itemMapper.selectList(
                Wrappers.<Item>lambdaQuery().orderByAsc(Item::getSort));
        return Result.success(items);
    }

    /** 购买：扣贝壳 + 入库（首把竿 / 首条线自动装备） */
    public Result<GameProfile> buy(String username, Long itemId, Integer quantity) {
        if (quantity == null || quantity < 1) {
            quantity = 1;
        }
        User u = getUser(username);
        if (u == null) {
            return Result.error("比奇堡查无此人 🐙");
        }
        Item item = itemMapper.selectById(itemId);
        if (item == null) {
            return Result.error("商店里没有这件商品");
        }
        int cost = item.getPrice() * quantity;
        if ((u.getShells() == null ? 0 : u.getShells()) < cost) {
            return Result.error("贝壳不够啦，先去钓鱼赚点 🐚");
        }

        u.setShells(u.getShells() - cost);
        userMapper.updateById(u);

        boolean hasEquippedOfType = userItemMapper.selectCount(
                Wrappers.<UserItem>lambdaQuery().eq(UserItem::getUserId, u.getId()).eq(UserItem::getEquipped, 1)) > 0;

        UserItem existing = findFirst(u.getId(), itemId);
        if (existing != null) {
            existing.setQuantity(existing.getQuantity() + quantity);
            userItemMapper.updateById(existing);
        } else {
            UserItem ui = new UserItem();
            ui.setUserId(u.getId());
            ui.setItemId(itemId);
            ui.setQuantity(quantity);
            boolean autoEquip = ("ROD".equals(item.getType()) || "LINE".equals(item.getType())) && !hasEquippedOfType;
            ui.setEquipped(autoEquip ? 1 : 0);
            userItemMapper.insert(ui);
        }
        return Result.success("购买成功 🎉", buildProfile(u));
    }

    /** 装备钓竿 / 鱼线工具 */
    public Result<GameProfile> equip(String username, Long userItemId) {
        User u = getUser(username);
        if (u == null) {
            return Result.error("比奇堡查无此人 🐙");
        }
        UserItem target = userItemMapper.selectById(userItemId);
        if (target == null || !target.getUserId().equals(u.getId())) {
            return Result.error("背包里没有这件道具");
        }
        Item it = itemMapper.selectById(target.getItemId());
        if (it == null || (!"ROD".equals(it.getType()) && !"LINE".equals(it.getType()))) {
            return Result.error("只有钓竿或鱼线工具才能装备");
        }
        // 同类型的装备全部卸下，再装备这一件
        List<UserItem> mine = userItemMapper.selectList(
                Wrappers.<UserItem>lambdaQuery().eq(UserItem::getUserId, u.getId()));
        for (UserItem ui : mine) {
            if (ui.getEquipped() != null && ui.getEquipped() == 1) {
                Item other = itemMapper.selectById(ui.getItemId());
                if (other != null && it.getType().equals(other.getType())) {
                    ui.setEquipped(0);
                    userItemMapper.updateById(ui);
                }
            }
        }
        target.setEquipped(1);
        userItemMapper.updateById(target);
        return Result.success("已装备 " + it.getName(), buildProfile(u));
    }

    // ==========================================================
    //  抛竿：生成咬钩遭遇
    // ==========================================================

    /** 抛竿钓鱼：消耗 1 鱼饵，生成一条咬钩的鱼交给前端搏斗 */
    public Result<CastResult> cast(String username) {
        User u = getUser(username);
        if (u == null) {
            return Result.error("比奇堡查无此人 🐙");
        }
        // 钓竿是刚需兜底（断了就补一把，避免卡死）；鱼饵不白送，只在“没饵且买不起饵”时救济 3 个
        ensureStarterRod(u.getId());

        GameProfile profile = buildProfile(u);
        if (profile.getEquippedRodPower() == 0) {
            return Result.error("你还没有钓竿，先去商店看看 🎣");
        }
        if (profile.getTotalBait() <= 0) {
            int shells = u.getShells() == null ? 0 : u.getShells();
            if (shells < 10) {
                // 弹尽粮绝救济：给 3 个普通饵，防止新手彻底卡死
                claimReliefBait(u.getId());
                profile = buildProfile(getUser(username));
            }
            if (profile.getTotalBait() <= 0) {
                return Result.error("没有鱼饵了，去商店买点 🪱");
            }
        }

        boolean premiumBait = consumeBait(u.getId());
        int rodPower = profile.getEquippedRodPower();
        boolean luck = Boolean.TRUE.equals(profile.getLuckOwned());
        int maxCatch = profile.getMaxCatchWeight() == null ? 800 : profile.getMaxCatchWeight();
        int lineStrength = profile.getLineStrength() == null ? 300 : profile.getLineStrength();
        int strength = profile.getStrength() == null ? 10 : profile.getStrength();

        // 选品级 → 抽重量 → 算奖励
        String tier = pickTier(maxCatch, rodPower, luck, premiumBait);
        double weight = sampleWeight(tier, maxCatch);
        TierDef td = TIERS.get(tier);
        int rewardShells = (int) Math.round(td.shellMul() * (10 + 3 * Math.pow(weight, 0.75)));
        int rewardGold = (int) Math.max(1, Math.round(td.goldMul() * Math.pow(weight, 0.45)));

        double powerScore = 1500 + strength * 600.0 + rodPower * 2500.0;
        double difficulty = clamp(weight / powerScore, 0.12, 5.0);
        double breakRisk = weight <= lineStrength
                ? 0.01 + 0.05 * weight / Math.max(1, lineStrength)
                : Math.min(0.95, 0.10 + 0.65 * (weight - lineStrength) / Math.max(1, lineStrength));
        double berserkChance = Math.min(0.95, td.berserkBase() + Math.min(1.0, weight / Math.max(1, maxCatch)) * 0.15);

        FishDef def = pickFish(tier);

        // 暂存遭遇
        cleanupPending();
        PendingEncounter pe = new PendingEncounter();
        pe.setEncounterId(UUID.randomUUID().toString());
        pe.setUsername(username);
        pe.setFishName(def.name());
        pe.setFishIcon(def.icon());
        pe.setTier(tier);
        pe.setTierName(td.label());
        pe.setWeight(weight);
        pe.setRewardShells(rewardShells);
        pe.setRewardGold(rewardGold);
        pe.setLore(def.lore());
        pe.setCreatedAt(System.currentTimeMillis());
        pending.put(pe.getEncounterId(), pe);

        CastResult r = new CastResult();
        r.setEncounterId(pe.getEncounterId());
        r.setFishName(def.name());
        r.setFishIcon(def.icon());
        r.setTier(tier);
        r.setTierName(td.label());
        r.setWeight(weight);
        r.setRewardShells(rewardShells);
        r.setRewardGold(rewardGold);
        r.setLore(def.lore());
        r.setRodPower(rodPower);
        r.setLineStrength(lineStrength);
        r.setMaxCatchWeight(maxCatch);
        r.setStrength(strength);
        r.setDifficulty(round2(difficulty));
        r.setBreakRisk(round2(breakRisk));
        r.setBerserkChance(round2(berserkChance));
        r.setTotalBait(profile.getTotalBait() - 1);
        r.setShells(profile.getShells());
        r.setGoldStones(profile.getGoldStones());
        r.setMessage("有东西咬钩了！握紧鱼竿，开始收线！");
        return Result.success(r);
    }

    // ==========================================================
    //  结算：成功入账 / 断线断竿
    // ==========================================================

    public Result<SettleResult> settle(SettleRequest req) {
        if (req == null || req.getUsername() == null || req.getEncounterId() == null) {
            return Result.error("结算参数不完整");
        }
        User u = getUser(req.getUsername());
        if (u == null) {
            return Result.error("比奇堡查无此人 🐙");
        }
        PendingEncounter pe = pending.get(req.getEncounterId());
        if (pe == null || !pe.getUsername().equals(req.getUsername())) {
            return Result.error("这次咬钩已经跑掉了 🐟");
        }
        if (pe.isSettled()) {
            return Result.error("这条鱼已经结算过了");
        }
        pe.setSettled(true);
        pending.remove(pe.getEncounterId());

        boolean landed = Boolean.TRUE.equals(req.getLanded());
        String breakType = req.getBreakType() == null ? "NONE" : req.getBreakType();

        SettleResult r = new SettleResult();
        r.setFishName(pe.getFishName());
        r.setFishIcon(pe.getFishIcon());
        r.setTier(pe.getTier());
        r.setTierName(pe.getTierName());
        r.setWeight(pe.getWeight());
        r.setBreakType(breakType);

        if (landed) {
            u.setShells((u.getShells() == null ? 0 : u.getShells()) + pe.getRewardShells());
            u.setGoldStones(goldOf(u) + pe.getRewardGold());
            userMapper.updateById(u);
            r.setLanded(true);
            r.setRodBroken(false);
            r.setRewardShells(pe.getRewardShells());
            r.setRewardGold(pe.getRewardGold());
            r.setMessage("钓起来了！" + pe.getFishName() + " " + pe.getWeight() + " 斤，"
                    + "获得 " + pe.getRewardShells() + " 🐚 与 " + pe.getRewardGold() + " 金石 🪙");
        } else {
            r.setLanded(false);
            r.setRewardShells(0);
            r.setRewardGold(0);
            boolean rodBroken = false;
            String message;
            switch (breakType) {
                case "ROD" -> {
                    breakEquippedRod(u);
                    rodBroken = true;
                    message = "啪！鱼竿被暴走的巨物生生拽断，鱼跑了…快去背包换一根 🎣";
                }
                case "LINE" -> message = "啪！鱼线被 " + pe.getWeight() + " 斤的力道挣断，鱼跑了…换更结实的线吧 🧵";
                case "ESCAPE" -> message = "提竿太慢，鱼儿脱钩溜走了 🐟";
                case "TIMEOUT" -> message = "收线太久，鱼儿沉底逃走了…";
                default -> message = "这条鱼还是跑掉了…";
            }
            r.setRodBroken(rodBroken);
            r.setMessage(message);
        }

        r.setShells(u.getShells() == null ? 0 : u.getShells());
        r.setGoldStones(goldOf(u));
        r.setStrength(strengthOf(u));
        return Result.success(r);
    }

    private void breakEquippedRod(User u) {
        // 同时装备了钓竿与鱼线时会有多条 equipped=1，必须按 ROD 类型筛出钓竿
        List<UserItem> equipped = userItemMapper.selectList(
                Wrappers.<UserItem>lambdaQuery().eq(UserItem::getUserId, u.getId()).eq(UserItem::getEquipped, 1));
        UserItem rod = null;
        for (UserItem ui : equipped) {
            Item it = itemMapper.selectById(ui.getItemId());
            if (it != null && "ROD".equals(it.getType())) {
                rod = ui;
                break;
            }
        }
        if (rod == null) {
            return;
        }
        int q = rod.getQuantity() == null ? 1 : rod.getQuantity();
        if (q <= 1) {
            userItemMapper.deleteById(rod.getId());
        } else {
            rod.setQuantity(q - 1);
            rod.setEquipped(0);
            userItemMapper.updateById(rod);
        }
    }

    // ==========================================================
    //  力量：用金石升级
    // ==========================================================

    public Result<TrainResult> train(String username) {
        User u = getUser(username);
        if (u == null) {
            return Result.error("比奇堡查无此人 🐙");
        }
        int strength = strengthOf(u);
        int gold = goldOf(u);
        int cost = 20 + strength * 2;
        if (gold < cost) {
            return Result.error("金石不足，升级需要 " + cost + " 金石 🪙（多钓稀有巨物能拿到更多）");
        }
        int gained = 5;
        u.setGoldStones(gold - cost);
        u.setStrength(strength + gained);
        userMapper.updateById(u);

        TrainResult r = new TrainResult();
        r.setStrength(u.getStrength());
        r.setCost(cost);
        r.setGoldStones(u.getGoldStones());
        r.setGained(gained);
        r.setMessage("💪 力量 +" + gained + "！现在能更稳地拉起巨物了");
        return Result.success(r);
    }

    // ==========================================================
    //  鱼饵
    // ==========================================================

    /** 消耗 1 个鱼饵（优先普通鱼饵，其次任意鱼饵），返回是否使用了高级饵 */
    private boolean consumeBait(Long userId) {
        UserItem bait = findFirst(userId, 5L);
        boolean premium = false;
        if (bait == null || bait.getQuantity() <= 0) {
            List<UserItem> baits = userItemMapper.selectList(
                    Wrappers.<UserItem>lambdaQuery().eq(UserItem::getUserId, userId));
            for (UserItem ui : baits) {
                Item it = itemMapper.selectById(ui.getItemId());
                if (it != null && "BAIT".equals(it.getType()) && ui.getQuantity() > 0) {
                    bait = ui;
                    premium = it.getPower() != null && it.getPower() > 0;
                    break;
                }
            }
        }
        if (bait != null) {
            bait.setQuantity(bait.getQuantity() - 1);
            userItemMapper.updateById(bait);
        }
        return premium;
    }

    // ==========================================================
    //  鱼池与数值
    // ==========================================================

    private record TierDef(String code, String label, double minW, double maxW,
                           double shellMul, double goldMul, double berserkBase, double baseWeight) {
    }

    private record FishDef(String name, String icon, String lore) {
    }

    private static final Map<String, TierDef> TIERS = new LinkedHashMap<>();

    static {
        TIERS.put("COMMON", new TierDef("COMMON", "普通", 0.5, 8, 1.0, 0.6, 0.05, 60));
        TIERS.put("RARE", new TierDef("RARE", "稀有", 15, 300, 2.5, 1.5, 0.22, 24));
        TIERS.put("LEGENDARY", new TierDef("LEGENDARY", "传说", 300, 8000, 6, 3.5, 0.42, 10));
        TIERS.put("MYTHIC", new TierDef("MYTHIC", "神话", 5000, 120000, 15, 8, 0.65, 4));
        TIERS.put("SHANHAI", new TierDef("SHANHAI", "山海", 20000, 1000000, 30, 15, 0.85, 1));
    }

    private static final Map<String, List<FishDef>> POOLS = new LinkedHashMap<>();

    static {
        POOLS.put("COMMON", List.of(
                new FishDef("小丑鱼", "🐠", "比奇堡最常见的邻居，颜色鲜艳。"),
                new FishDef("热带鱼", "🐟", "礁石间穿梭的小精灵。"),
                new FishDef("河豚", "🐡", "一生气就鼓成一颗刺球。"),
                new FishDef("沙丁鱼", "🐟", "成群结队地游过码头。"),
                new FishDef("鲭鱼", "🐟", "速度极快的洄游鱼。")
        ));
        POOLS.put("RARE", List.of(
                new FishDef("章鱼", "🐙", "八条腕足力大无穷，吸盘能拽住礁石。"),
                new FishDef("鱿鱼", "🦑", "深海中的敏捷猎手，喷墨而逃。"),
                new FishDef("帝王蟹", "🦀", "甲壳厚如铠甲，钳力惊人。"),
                new FishDef("巨型石斑", "🐟", "礁石缝里的伏击者，体重惊人。"),
                new FishDef("电鳗", "⚡", "一尾十万伏特，靠近就发麻。")
        ));
        POOLS.put("LEGENDARY", List.of(
                new FishDef("深海龙鱼", "🐉", "深渊尽头的一点幽光，传说是龙的幼崽。"),
                new FishDef("独角鲸", "🐋", "额前长角，传说能破开冰层。"),
                new FishDef("黄金海马", "👑", "蟹老板做梦都想收藏的稀世珍宝。"),
                new FishDef("大王乌贼", "🦑", "能与巨鲸搏斗的深海巨兽。"),
                new FishDef("幽灵鲨", "🦈", "只在月圆之夜浮出水面。")
        ));
        POOLS.put("MYTHIC", List.of(
                new FishDef("鲲", "🐋", "《庄子·逍遥游》：北冥有鱼，其名为鲲，鲲之大，不知其几千里也。"),
                new FishDef("烛龙", "🐲", "《山海经》：钟山之神，视为昼，瞑为夜，吹为冬，呼为夏。"),
                new FishDef("九尾狐", "🦊", "《山海经》：青丘之山，有兽焉，其状如狐而九尾。"),
                new FishDef("白泽", "🦄", "通晓万物之情的神兽，知天下鬼神之名。"),
                new FishDef("凤凰", "🔥", "浴火重生的百鸟之王，见则天下安宁。"),
                new FishDef("麒麟", "🦌", "祥瑞之兽，踏云而行，不履生虫。")
        ));
        POOLS.put("SHANHAI", List.of(
                new FishDef("鲲鹏", "🦅", "《逍遥游》：化而为鸟，其名为鹏，其翼若垂天之云。"),
                new FishDef("饕餮", "👹", "《山海经》：羊身人面，虎齿人爪，贪食无厌。"),
                new FishDef("穷奇", "🐯", "《山海经》：状如虎而有翼，音如嗥狗。"),
                new FishDef("相柳", "🐍", "《山海经》：九首蛇身，所到之处化为沼泽。"),
                new FishDef("玄武", "🐢", "龟蛇合体，镇守北方之神。"),
                new FishDef("应龙", "🐉", "有翼之龙，助黄帝斩蚩尤，蓄水为雨。"),
                new FishDef("巴蛇", "🐍", "《山海经》：巴蛇食象，三年而出其骨。"),
                new FishDef("陵鱼", "🧜", "《山海经》：人面鱼身，居于海中。"),
                new FishDef("帝江", "🦋", "《山海经》：状如黄囊，赤如丹火，六足四翼。"),
                new FishDef("狰", "🐆", "《山海经》：五尾一角，音如击石。")
        ));
    }

    /** 按装备上限过滤品级，再按钓力 / 幸运 / 高级饵加权抽取 */
    private String pickTier(int maxCatch, int rodPower, boolean luck, boolean premium) {
        double luckFactor = 1 + rodPower * 0.12 + (luck ? 0.5 : 0) + (premium ? 0.35 : 0);
        Map<String, Double> weights = new LinkedHashMap<>();
        double total = 0;
        for (TierDef t : TIERS.values()) {
            if (t.minW() > maxCatch) {
                continue; // 装备承重根本够不到这个品级
            }
            double base = t.baseWeight();
            if (!"COMMON".equals(t.code())) {
                base *= luckFactor;
            }
            weights.put(t.code(), base);
            total += base;
        }
        double roll = random.nextDouble() * total;
        for (Map.Entry<String, Double> e : weights.entrySet()) {
            roll -= e.getValue();
            if (roll <= 0) {
                return e.getKey();
            }
        }
        return "COMMON";
    }

    private double sampleWeight(String tier, int maxCatch) {
        TierDef t = TIERS.get(tier);
        double cap = Math.min(t.maxW(), maxCatch);
        double low = Math.min(t.minW(), cap);
        double w = low + random.nextDouble() * (cap - low);
        if (w < 0.5) {
            w = 0.5;
        }
        return Math.round(w * 10) / 10.0;
    }

    private FishDef pickFish(String tier) {
        List<FishDef> pool = POOLS.getOrDefault(tier, POOLS.get("COMMON"));
        return pool.get(random.nextInt(pool.size()));
    }

    private void cleanupPending() {
        long now = System.currentTimeMillis();
        pending.values().removeIf(e -> now - e.getCreatedAt() > ENCOUNTER_TTL_MS);
    }

    private static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static double round2(double v) {
        return Math.round(v * 100) / 100.0;
    }

    // ===== 待结算遭遇 =====
    @Data
    private static class PendingEncounter {
        private String encounterId;
        private String username;
        private String fishName;
        private String fishIcon;
        private String tier;
        private String tierName;
        private double weight;
        private int rewardShells;
        private int rewardGold;
        private String lore;
        private long createdAt;
        private boolean settled;
    }
}
