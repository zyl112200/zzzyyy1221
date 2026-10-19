package com.bikinibottom.dto;

import lombok.Data;

/**
 * 背包中的单件道具（关联商品信息）
 */
@Data
public class OwnedItemDto {

    /** 背包记录 ID（user_item.id） */
    private Long userItemId;

    /** 商品 ID */
    private Long itemId;

    /** 名称 */
    private String name;

    /** 类型 ROD / BAIT / LUCK / LINE */
    private String type;

    /** 展示 emoji */
    private String icon;

    /** 售价 */
    private Integer price;

    /** 钓力 / 加成 */
    private Integer power;

    /** 鱼线承重（斤） */
    private Integer lineStrength;

    /** 最大可钓重量（斤） */
    private Integer maxCatchWeight;

    /** 描述 */
    private String description;

    /** 拥有数量 */
    private Integer quantity;

    /** 是否装备（钓竿 / 鱼线） */
    private Integer equipped;
}
