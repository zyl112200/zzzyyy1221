package com.bikinibottom.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 钓鱼爆率配置：各品级的相对权重（后台可实时修改）
 */
@Data
@TableName("catch_rate")
public class CatchRate implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 品级编码：COMMON / RARE / LEGENDARY / MYTHIC / SHANHAI */
    private String tierCode;

    /** 品级名称 */
    private String tierName;

    /** 相对权重（越大越容易钓到） */
    private Integer baseWeight;

    /** 是否启用：1 启用 / 0 停用 */
    private Integer enabled;

    /** 创建时间 */
    private LocalDateTime createTime;
}
