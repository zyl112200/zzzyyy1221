package com.bikinibottom.dto;

import lombok.Data;

import java.util.List;

/**
 * 玩家游戏档案（前端主页 / 背包展示用）
 */
@Data
public class GameProfile {

    /** 用户名 */
    private String username;

    /** 金币余额 */
    private Integer shells;

    /** 金币余额（兼容字段，恒为 0）（淬炼根骨的材料） */
    private Integer goldStones;

    /** 根骨值（影响收线速度与可抗衡的鱼重） */
    private Integer strength;

    /** 总力量（前端主页展示用）= 基础力量 × (1 + 修为%)，参与全部计算 */
    private Integer power;

    /** 基础力量（不含修为加成） */
    private Integer basePower;

    /** 修为百分比（无上限，单独作用于基础力量） */
    private Integer cultivation;

    /** 钓道境界（修仙式层级，1 起步，最高 999） */
    private Integer powerRealm;

    /** 突破到下一重天所需金币（已达 999 则为 null） */
    private Long nextRealmCost;

    /** 已修炼的钓鱼功法 id 列表（如 ["jingxin","xieli"]） */
    private List<String> skills;

    /** 钓道境界带来的钓鱼收益加成百分比（每级 +5%） */
    private Integer realmBonusPct;

    /** 已装备钓竿商品 id（前端按此加载对应写实立绘） */
    private Integer equippedRodId;

    /** 已装备钓竿名称 */
    private String equippedRodName;

    /** 已装备钓竿钓力 */
    private Integer equippedRodPower;

    /** 已装备鱼线 / 工具名称 */
    private String equippedLineName;

    /** 当前有效鱼线承重（斤），取钓竿与鱼线工具的最大值 */
    private Integer lineStrength;

    /** 当前最大可钓重量（斤），取钓竿与鱼线工具的最大值 */
    private Integer maxCatchWeight;

    /** 鱼饵总数 */
    private Integer totalBait;

    /** 是否拥有幸运物 */
    private Boolean luckOwned;

    /** 当前所在钓场地图 id（选图面板高亮「当前所在」用） */
    private String currentMap;

    /** 已解锁图鉴的鱼名列表（钓到对应鱼后解锁） */
    private List<String> codex;

    /** 背包明细 */
    private List<OwnedItemDto> inventory;
}
