package com.bikinibottom.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * AI 对话预设：后台可维护「触发词 -> 回复」
 */
@Data
@TableName("ai_dialog")
public class AiDialog implements Serializable {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 场景 / 触发词（玩家消息包含该词即命中） */
    private String scene;

    /** 回复内容 */
    private String reply;

    /** 是否启用：1 启用 / 0 停用 */
    private Integer enabled;

    /** 排序（越小越优先匹配） */
    private Integer sortOrder;

    /** 创建时间 */
    private LocalDateTime createTime;
}
