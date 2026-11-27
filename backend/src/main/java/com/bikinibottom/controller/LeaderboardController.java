package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.service.LeaderboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 仙钓天榜接口：与离线引擎 localEngine.js 的 /api/leaderboard/* 返回结构保持一致。
 */
@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    /** GET /api/leaderboard/overview?username= */
    @GetMapping("/overview")
    public Result<Map<String, Object>> overview(@RequestParam(required = false) String username) {
        return leaderboardService.overview(username);
    }

    /** GET /api/leaderboard/board?type=achievement&limit=20 */
    @GetMapping("/board")
    public Result<Map<String, Object>> board(@RequestParam(required = false) String type,
                                              @RequestParam(required = false, defaultValue = "20") int limit) {
        return leaderboardService.board(type, limit);
    }
}
