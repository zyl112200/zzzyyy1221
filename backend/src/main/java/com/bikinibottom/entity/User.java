package com.bikinibottom.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 仙门用户表（仙钓大陆）
 */
@Data
@TableName("user")
public class User {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 用户名（唯一） */
    private String username;

    /** 邮箱（唯一） */
    private String email;

    /** 密码（BCrypt 加密存储，返回给前端时忽略） */
    @JsonIgnore
    private String password;

    /** 贝壳余额（游戏货币，注册时默认 50） */
    private Integer shells;

    /** 力量：决定可抗衡的鱼重与专属鱼规模，注册默认 100（取代原根骨 + 钓道境界 + 功法体系） */
    private Integer power = 100;

    /** 当前所在钓点地图 id（对应前端 maps.js 的 MAP_MAP；默认灵湖） */
    private String currentMap = "linghu";

    /** 金石：滋养力量的稀有材料，钓到越稀有越重的灵鱼给得越多 */
    private Integer goldStones;

    /**
     * 权限：0 = 管理员（可进入后台管理系统），1 = 普通玩家（默认）。
     * 与离线本地引擎 localEngine.js 中的 permission 字段保持一致。
     */
    private Integer permission = 1;

    /** 历史最重单尾钓获（斤），钓鱼协会认证徽章的评定依据 */
    private Integer maxCaughtWeight = 0;

    /** 钓鱼协会认证徽章星级（0 = 未认证，1~9 星；单尾 ≥ 对应门槛即授予） */
    private Integer assocBadge = 0;

    /** 注册时间（插入时自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
