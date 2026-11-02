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
    private Integer goldStones;
    private Integer powerRealm;
    private Integer permission;
}
