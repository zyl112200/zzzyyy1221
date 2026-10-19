package com.bikinibottom.dto;

import lombok.Data;

/**
 * 抛竿后的「咬钩遭遇」：把这条鱼的全部参数交给前端，用于第一人称搏鱼玩法。
 */
@Data
public class CastResult {

    /** 本次遭遇 ID（结算时回传） */
    private String encounterId;

    /** 鱼名 */
    private String fishName;

    /** 鱼 emoji */
    private String fishIcon;

    /** 品级 COMMON / RARE / LEGENDARY / MYTHIC / SHANHAI */
    private String tier;

    /** 品级中文名 */
    private String tierName;

    /** 重量（斤） */
    private Double weight;

    /** 成功钓起可得贝壳 */
    private Integer rewardShells;

    /** 成功钓起可得金石 */
    private Integer rewardGold;

    /** 图鉴小传 / 山海经出处 */
    private String lore;

    /** 装备钓力 */
    private Integer rodPower;

    /** 有效鱼线承重（斤） */
    private Integer lineStrength;

    /** 当前最大可钓重量（斤） */
    private Integer maxCatchWeight;

    /** 力量值 */
    private Integer strength;

    /** 收线难度系数（约 0.12 ~ 5，越大越吃力） */
    private Double difficulty;

    /** 鱼线被挣断的风险（0~1，仅展示参考） */
    private Double breakRisk;

    /** 接近水面时暴走的概率（0~1） */
    private Double berserkChance;

    /** 钓后鱼饵剩余 */
    private Integer totalBait;

    /** 当前贝壳余额 */
    private Integer shells;

    /** 当前金石余额 */
    private Integer goldStones;

    /** 提示文案 */
    private String message;
}
