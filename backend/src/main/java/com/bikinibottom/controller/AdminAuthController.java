package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.service.AdminAuthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 后台认证接口（此接口本身不受 AdminAuthInterceptor 保护）：
 * 登录签发 token、校验 token。用户管理接口见 AdminUserController。
 */
@RestController
@RequestMapping("/api/admin")
public class AdminAuthController {

    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    /** POST /api/admin/login { username, password } -> { token, username, ... } */
    @PostMapping("/login")
    public Result<Map<String, Object>> login(@RequestBody Map<String, Object> body) {
        Object u = body.get("username");
        Object p = body.get("password");
        return adminAuthService.login(u == null ? null : String.valueOf(u), p == null ? null : String.valueOf(p));
    }

    /** GET /api/admin/verify —— 带 Authorization: Bearer <token>，有效返回 200 */
    @GetMapping("/verify")
    public Result<Map<String, Object>> verify(@RequestHeader(value = "Authorization", required = false) String auth) {
        String token = (auth != null && auth.startsWith("Bearer ")) ? auth.substring(7).trim() : null;
        String username = adminAuthService.verify(token);
        if (username == null) {
            Result<Map<String, Object>> r = Result.error("token 无效或已过期");
            r.setCode(401);
            return r;
        }
        return Result.success("有效", Map.of("username", username));
    }
}
