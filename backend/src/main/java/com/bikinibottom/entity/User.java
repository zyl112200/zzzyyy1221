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

    /** 金币余额（游戏货币，注册时默认 50） */
    private Integer shells;

    /** 根骨：决定收线稳定性与可抗衡的鱼重，注册默认 10（对应前端「力量」展示） */
    private Integer strength = 10;

    /** 金石：兼容字段，货币已统一为金币（恒为 0） */
    private Integer goldStones;

    /** 钓道境界（1 ~ 999 重天），突破消耗金币 */
    private Integer powerRealm = 1;

    /** 已修炼钓鱼功法 id 列表（逗号分隔，如 "jingxin,xieli"） */
    private String skills;

    /**
     * 权限：0 = 管理员（可进入后台管理系统），1 = 普通玩家（默认）。
     * 与离线本地引擎 localEngine.js 中的 permission 字段保持一致。
     */
    private Integer permission = 1;

    /** 历史最重单尾钓获（斤），钓鱼协会认证徽章的评定依据 */
    private Integer maxCaughtWeight = 0;

    /** 钓鱼协会认证徽章星级（0 = 未认证，1~9 星；单尾 ≥ 对应门槛即授予） */
    private Integer assocBadge = 0;

    /** 当前所在钓场地图 id（对应前端 maps.js，默认灵湖） */
    private String currentMap = "linghu";

    /** 已解锁图鉴的鱼名列表（逗号分隔，钓起对应鱼后写入） */
    private String codex = "";

    /** 注册时间（插入时自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
