package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.service.AssociationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 钓鱼协会接口：协会任务 / 2 分钟钓鱼比赛 / 1-9 星认证徽章。
 * 与离线引擎 localEngine.js 的 /api/assoc/* 返回结构保持一致。
 */
@RestController
@RequestMapping("/api/assoc")
public class AssociationController {

    private final AssociationService associationService;

    public AssociationController(AssociationService associationService) {
        this.associationService = associationService;
    }

    /** 协会主页数据（任务 / 徽章 / 比赛战况）：GET /api/assoc/info?username=xxx */
    @GetMapping("/info")
    public Result<Map<String, Object>> info(@RequestParam String username) {
        return associationService.info(username);
    }

    /** 领取协会任务奖励：POST /api/assoc/task-claim { "username": "xxx", "taskId": 1 } */
    @PostMapping("/task-claim")
    public Result<Map<String, Object>> taskClaim(@RequestBody Map<String, Object> body) {
        return associationService.claimTask(
                (String) body.get("username"),
                body.get("taskId") == null ? null : Integer.valueOf(String.valueOf(body.get("taskId"))));
    }

    /** 报名并开始 2 分钟钓鱼比赛：POST /api/assoc/comp-start { "username": "xxx" } */
    @PostMapping("/comp-start")
    public Result<Map<String, Object>> compStart(@RequestBody Map<String, String> body) {
        return associationService.compStart(body.get("username"));
    }

    /** 查询比赛实时战况（到点自动结算发奖）：POST /api/assoc/comp-state { "username": "xxx" } */
    @PostMapping("/comp-state")
    public Result<Map<String, Object>> compState(@RequestBody Map<String, String> body) {
        return associationService.compState(body.get("username"));
    }
}
