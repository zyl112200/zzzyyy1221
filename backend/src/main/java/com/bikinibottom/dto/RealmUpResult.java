package com.bikinibottom.dto;

import lombok.Data;

/**
 * 钓道境界突破结果
 */
@Data
public class RealmUpResult {

    /** 突破后的境界（重天数） */
    private Integer powerRealm;

    /** 本次消耗金币（2^原境界） */
    private Long cost;

    /** 突破后金币余额 */
    private Integer shells;

    /** 金币余额（兼容字段，恒为 0） */
    private Integer goldStones;

    /** 每重天 +5% 的收益加成 */
    private Integer realmBonusPct;

    /** 下一重天所需金币（已满级为 null） */
    private Long nextRealmCost;

    /** 提示文案 */
    private String message;
}
