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

    /** 成功获得金币（失败为 0） */
    private Integer rewardShells;

    /** 成功兼容字段（恒为 0）（失败为 0） */
    private Integer rewardGold;

    /** 钓后金币余额 */
    private Integer shells;

    /** 钓后金币余额（兼容字段，恒为 0） */
    private Integer goldStones;

    /** 钓后根骨（基础力量） */
    private Integer strength;

    /** 钓后总力量 = 基础力量 × (1 + 修为%) */
    private Integer power;

    /** 钓后基础力量 */
    private Integer basePower;

    /** 钓后修为百分比 */
    private Integer cultivation;

    /** 本次钓鱼收益中，钓道境界提供的加成百分比（1 重天为 0%） */
    private Integer realmBonusPct;

    /** 本次力量成长数值（未成长为 0） */
    private Integer powerGain;

    /** 本次基础力量成长百分比（1~50 随机，未成长为 0） */
    private Integer powerGainPct;

    /** 本次基础力量净增数值 */
    private Integer powerGainBase;

    /** 本次修为成长百分点（1~50 随机，未成长为 0） */
    private Integer cultivationGain;

    /** 本次总力量净增（含修为放大） */
    private Integer powerGainTotal;

    /** 力量成长类型：over-limit = 钓起超过自身上限 10% 的鱼 */
    private String powerKind;

    /** 失败类型 */
    private String breakType;

    /** 是否损毁了鱼竿 */
    private Boolean rodBroken;

    /** 提示文案 */
    private String message;

    /** 钓到神话/山海级稀有鱼时，AI 助手的祝贺台词（前端自动唤起助手播报） */
    private String celebrateMessage;

    /** 钓鱼协会播报：任务达成 / 比赛累计 / 徽章认证等消息（可为空） */
    private java.util.List<String> assocMessages;
}
