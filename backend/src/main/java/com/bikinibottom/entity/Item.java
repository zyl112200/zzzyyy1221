package com.bikinibottom.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

/**
 * 商店商品目录：钓竿 / 鱼饵 / 幸运物
 */
@Data
@TableName("item")
public class Item implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 商品名 */
    private String name;

    /** 类型：ROD 钓竿 / BAIT 鱼饵 / LUCK 幸运物 */
    private String type;

    /** 售价（贝壳） */
    private Integer price;

    /** 钓力 / 幸运加成 */
    private Integer power;

    /** 鱼线承重（斤）：鱼超过该重量后极易挣断鱼线；0 表示不提供承重 */
    private Integer lineStrength;

    /** 最大可钓重量（斤）：装备后能遇到的最大鱼；0 表示不限制 */
    private Integer maxCatchWeight;

    /** 展示用 emoji */
    private String icon;

    /** 描述 */
    private String description;

    /** 排序 */
    private Integer sort;
}
