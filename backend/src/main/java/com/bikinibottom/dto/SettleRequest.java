package com.bikinibottom.dto;

import lombok.Data;

/**
 * 搏鱼结算请求：前端第一人称收线结束后回传结果。
 */
@Data
public class SettleRequest {

    /** 用户名 */
    private String username;

    /** 遭遇 ID */
    private String encounterId;

    /** 是否成功钓起 */
    private Boolean landed;

    /**
     * 失败类型：
     * NONE 成功 / LINE 挣断鱼线 / ROD 挣断鱼竿 / ESCAPE 脱钩 / TIMEOUT 超时
     */
    private String breakType;
}
