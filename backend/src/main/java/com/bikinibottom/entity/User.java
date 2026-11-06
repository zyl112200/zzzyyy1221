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

    /** 根骨：影响收线速度与可抗衡的鱼重，注册默认 10 */
    private Integer strength;

    /** 金石：淬炼根骨的稀有材料，钓到越稀有越重的灵鱼给得越多 */
    private Integer goldStones;

    /** 钓道境界（修仙式层级，1 起步，最高 999；突破消耗贝壳按 2^(境界-1) 翻倍） */
    private Integer powerRealm = 1;

    /** 已修炼的钓鱼功法 id 列表，逗号分隔存储（如 "jingxin,xieli"） */
    private String skills;

    /**
     * 权限：0 = 管理员（可进入后台管理系统），1 = 普通玩家（默认）。
     * 与离线本地引擎 localEngine.js 中的 permission 字段保持一致。
     */
    private Integer permission = 1;

    /** 注册时间（插入时自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
