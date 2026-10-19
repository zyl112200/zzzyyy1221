package com.bikinibottom.dto;

import lombok.Data;

/**
 * 装备钓竿请求
 */
@Data
public class EquipRequest {

    /** 用户名 */
    private String username;

    /** 背包中的道具 ID（user_item.id） */
    private Long userItemId;
}
