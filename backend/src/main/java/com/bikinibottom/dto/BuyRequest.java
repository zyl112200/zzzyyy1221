package com.bikinibottom.dto;

import lombok.Data;

/**
 * 购买请求
 */
@Data
public class BuyRequest {

    /** 用户名（演示用，用于定位当前玩家） */
    private String username;

    /** 商品 ID */
    private Long itemId;

    /** 购买数量（默认 1） */
    private Integer quantity;
}
