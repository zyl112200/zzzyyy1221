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
 * 比奇堡用户表
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

    /** 力量：影响收线速度与可抗衡的鱼重，注册默认 10 */
    private Integer strength;

    /** 金石：升级力量的稀有材料，钓到越稀有越重的鱼给得越多 */
    private Integer goldStones;

    /** 注册时间（插入时自动填充） */
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
