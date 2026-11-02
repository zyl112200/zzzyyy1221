package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.dto.AdminUserDto;
import com.bikinibottom.entity.User;
import com.bikinibottom.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 后台用户管理接口（与离线本地引擎 localEngine.js 接口契约保持一致）
 *
 * 说明：本项目为演示用途，未引入鉴权框架，接口通过 username 定位玩家，
 * 与现有 /api/auth、/api/game 风格一致（详见 README「接口约定」）。
 */
@RestController
@RequestMapping("/api/admin")
public class AdminUserController {

    private final UserService userService;

    public AdminUserController(UserService userService) {
        this.userService = userService;
    }

    /** 用户列表（关键词 / 角色 / 分页）：GET /api/admin/users */
    @GetMapping("/users")
    public Result<Map<String, Object>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer permission,
            @RequestParam(required = false, defaultValue = "1") Integer page,
            @RequestParam(required = false, defaultValue = "10") Integer pageSize) {
        return userService.adminListUsers(keyword, permission, page, pageSize);
    }

    /** 用户详情：GET /api/admin/users/detail?id= */
    @GetMapping("/users/detail")
    public Result<User> detail(@RequestParam Long id) {
        return userService.adminGetUser(id);
    }

    /** 新建用户：POST /api/admin/users */
    @PostMapping("/users")
    public Result<User> create(@RequestBody AdminUserDto dto) {
        return userService.adminCreateUser(dto.getUsername(), dto.getEmail(), dto.getPassword(),
                dto.getShells(), dto.getStrength(), dto.getGoldStones(), dto.getPowerRealm(), dto.getPermission());
    }

    /** 编辑用户：POST /api/admin/users/update */
    @PostMapping("/users/update")
    public Result<User> update(@RequestBody AdminUserDto dto) {
        if (dto.getId() == null) return Result.error("缺少用户 ID");
        return userService.adminUpdateUser(dto.getId(), dto.getEmail(), dto.getShells(), dto.getStrength(),
                dto.getGoldStones(), dto.getPowerRealm(), dto.getPermission());
    }

    /** 删除用户：POST /api/admin/users/delete { "id": 1 } */
    @PostMapping("/users/delete")
    public Result<Void> delete(@RequestBody Map<String, Object> body) {
        Object idObj = body.get("id");
        if (idObj == null) return Result.error("缺少用户 ID");
        Long id = Long.valueOf(idObj.toString());
        return userService.adminDeleteUser(id);
    }

    /** 重置密码：POST /api/admin/users/reset-password { "id": 1, "newPassword": "******" } */
    @PostMapping("/users/reset-password")
    public Result<Void> resetPassword(@RequestBody Map<String, Object> body) {
        Object idObj = body.get("id");
        Object pwdObj = body.get("newPassword");
        if (idObj == null) return Result.error("缺少用户 ID");
        String newPassword = (pwdObj == null) ? null : pwdObj.toString();
        Long id = Long.valueOf(idObj.toString());
        return userService.adminResetPassword(id, newPassword);
    }
}
