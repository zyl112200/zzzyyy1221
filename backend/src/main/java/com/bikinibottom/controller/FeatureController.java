package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.service.FeatureService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 洞天福地接口（灵池 / 悬赏 / 本命法宝），在线后端与本地引擎同构：
 *   GET  /api/feature/state?username=xxx            -> { state, shells }
 *   POST /api/feature/save { username, state, earnedTotal }
 */
@RestController
@RequestMapping("/api/feature")
public class FeatureController {

    private final FeatureService featureService;

    public FeatureController(FeatureService featureService) {
        this.featureService = featureService;
    }

    @GetMapping("/state")
    public Result<Map<String, Object>> state(@RequestParam String username) {
        return featureService.state(username);
    }

    @PostMapping("/save")
    public Result<Map<String, Object>> save(@RequestBody Map<String, Object> body) {
        String username = body.get("username") == null ? null : String.valueOf(body.get("username"));
        @SuppressWarnings("unchecked")
        Map<String, Object> state = body.get("state") instanceof Map
                ? (Map<String, Object>) body.get("state") : null;
        Object earned = body.get("earnedTotal");
        return featureService.save(username, state, earned instanceof Number ? (Number) earned : null);
    }
}
