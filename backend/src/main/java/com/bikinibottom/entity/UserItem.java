package com.bikinibottom.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;

/**
 * 用户背包：拥有某件道具的数量与装备状态
 */
@Data
@TableName("user_item")
public class UserItem implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 用户 ID */
    private Long userId;

    /** 商品 ID */
    private Long itemId;

    /** 拥有数量 */
    private Integer quantity;

    /** 是否装备（仅钓竿：1=已装备） */
    private Integer equipped;
}
