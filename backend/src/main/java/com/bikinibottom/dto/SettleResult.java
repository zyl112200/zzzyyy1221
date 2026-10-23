package com.bikinibottom.dto;

import lombok.Data;

/**
 * 搏鱼结算结果
 */
@Data
public class SettleResult {

    /** 是否成功钓起 */
    private Boolean landed;

    /** 鱼名 */
    private String fishName;

    /** 鱼 emoji */
    private String fishIcon;

    /** 品级 */
    private String tier;

    /** 品级中文名 */
    private String tierName;

    /** 重量（斤） */
    private Double weight;

    /** 成功获得贝壳（失败为 0） */
    private Integer rewardShells;

    /** 成功获得金石（失败为 0） */
    private Integer rewardGold;

    /** 钓后贝壳余额 */
    private Integer shells;

    /** 钓后金石余额 */
    private Integer goldStones;

    /** 钓后力量 */
    private Integer strength;

    /** 本次钓鱼收益中，力量境界提供的加成百分比（1 重天为 0%） */
    private Integer realmBonusPct;

    /** 失败类型 */
    private String breakType;

    /** 是否损毁了鱼竿 */
    private Boolean rodBroken;

    /** 提示文案 */
    private String message;
}
