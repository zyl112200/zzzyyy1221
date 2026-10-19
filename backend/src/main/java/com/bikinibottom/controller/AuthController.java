package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.dto.LoginRequest;
import com.bikinibottom.dto.RegisterRequest;
import com.bikinibottom.entity.User;
import com.bikinibottom.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口：注册 / 登录
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    /**
     * 注册
     * POST /api/auth/register
     * { "username": "...", "email": "...", "password": "..." }
     */
    @PostMapping("/register")
    public Result<User> register(@Valid @RequestBody RegisterRequest req) {
        return userService.register(req);
    }

    /**
     * 登录
     * POST /api/auth/login
     * { "username": "...", "password": "..." }
     */
    @PostMapping("/login")
    public Result<User> login(@Valid @RequestBody LoginRequest req) {
        return userService.login(req);
    }
}
