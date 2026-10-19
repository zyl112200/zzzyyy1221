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

    /** 贝壳余额 */
    private Integer shells;

    /** 金石余额（升级力量的材料） */
    private Integer goldStones;

    /** 力量值（影响收线速度与可抗衡的鱼重） */
    private Integer strength;

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

    /** 背包明细 */
    private List<OwnedItemDto> inventory;
}
