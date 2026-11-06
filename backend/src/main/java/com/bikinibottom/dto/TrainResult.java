package com.bikinibottom.dto;

import lombok.Data;

/**
 * 根骨修炼结果
 */
@Data
public class TrainResult {

    /** 修炼后根骨 */
    private Integer strength;

    /** 本次消耗金石 */
    private Integer cost;

    /** 升级后金石余额 */
    private Integer goldStones;

    /** 本次提升点数 */
    private Integer gained;

    /** 提示文案 */
    private String message;
}
