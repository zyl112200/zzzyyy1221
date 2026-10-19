package com.bikinibottom.dto;

import lombok.Data;

/**
 * 一次抛竿的钓获结果
 */
@Data
public class FishResult {

    /** 鱼名 */
    private String fishName;

    /** 鱼 emoji */
    private String fishIcon;

    /** 品级 COMMON / RARE / LEGENDARY */
    private String tier;

    /** 获得贝壳 */
    private Integer reward;

    /** 钓后贝壳余额 */
    private Integer shells;

    /** 钓后鱼饵剩余 */
    private Integer totalBait;

    /** 提示文案 */
    private String message;
}
