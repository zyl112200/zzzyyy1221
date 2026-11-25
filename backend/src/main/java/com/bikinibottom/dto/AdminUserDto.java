package com.bikinibottom.dto;

import lombok.Data;

/**
 * 后台用户管理入参（所有字段可选，按需传入）
 */
@Data
public class AdminUserDto {
    private Long id;
    private String username;
    private String email;
    private String password;
    private String newPassword;
    private Integer shells;
    private Integer strength;
    /** 前端后台面板使用「力量」字段名，兼容映射到 strength */
    private Integer power;

    /** 后台面板传 power、核心用 strength；优先 strength，其次 power */
    public Integer effectiveStrength() {
        return strength != null ? strength : power;
    }
    /** 修为百分比（无上限） */
    private Integer cultivation;
    private Integer goldStones;
    private Integer powerRealm;
    private Integer permission;
}
