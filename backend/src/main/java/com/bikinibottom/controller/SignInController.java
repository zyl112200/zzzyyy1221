package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.service.SignInService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 每日签到接口：与离线引擎 localEngine.js 的 /api/signin/* 返回结构保持一致。
 */
@RestController
@RequestMapping("/api/signin")
public class SignInController {

    private final SignInService signInService;

    public SignInController(SignInService signInService) {
        this.signInService = signInService;
    }

    /** GET /api/signin/info?username= */
    @GetMapping("/info")
    public Result<Map<String, Object>> info(@RequestParam String username) {
        return signInService.info(username);
    }

    /** POST /api/signin/do { "username": "xxx" } */
    @PostMapping("/do")
    public Result<Map<String, Object>> doSignIn(@RequestBody Map<String, Object> body) {
        Object val = body.get("username");
        return signInService.signIn(val == null ? null : String.valueOf(val));
    }
}
