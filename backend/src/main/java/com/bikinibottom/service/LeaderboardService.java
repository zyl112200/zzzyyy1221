package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.bikinibottom.common.Result;
import com.bikinibottom.entity.User;
import com.bikinibottom.mapper.UserMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.ToIntFunction;

/**
 * 仙钓天榜业务：与前端离线引擎 localEngine.js 的天榜实现同构。
 * <p>榜单类型：wealth 财富榜 / weight 巨物榜 / codex 图鉴榜 / achievement 综合榜 / signin 勤修榜。
 * 综合分 = 金币/1000 + 最重/100 + 图鉴数*20 + 功法数*30 + 修为 + 签到数*5 + 徽章*50。</p>
 */
@Service
public class LeaderboardService {

    private final UserMapper userMapper;

    public LeaderboardService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    private int countOf(String s) {
        if (s == null || s.trim().isEmpty()) return 0;
        int n = 0;
        for (String part : s.split(",")) if (!part.trim().isEmpty()) n++;
        return n;
    }

    private int codexCount(User u) {
        return countOf(u.getCodex());
    }

    private int skillCount(User u) {
        return countOf(u.getSkills());
    }

    private int scoreOf(User u) {
        long shells = Math.max(0, u.getShells() == null ? 0 : u.getShells());
        long weight = Math.max(0, u.getMaxCaughtWeight() == null ? 0 : u.getMaxCaughtWeight());
        int cult = Math.max(0, u.getCultivation() == null ? 0 : u.getCultivation());
        int sign = Math.max(0, u.getSignTotal() == null ? 0 : u.getSignTotal());
        int badge = Math.max(0, u.getAssocBadge() == null ? 0 : u.getAssocBadge());
        return (int) (shells / 1000 + weight / 100) + codexCount(u) * 20 + skillCount(u) * 30
                + cult + sign * 5 + badge * 50;
    }

    /** 分类榜单：GET /api/leaderboard/board?type=&limit= */
    public Result<Map<String, Object>> board(String type, int limit) {
        List<User> users = userMapper.selectList(Wrappers.<User>lambdaQuery().ne(User::getUsername, "admin"));
        ToIntFunction<User> metric;
        String label;
        String t = type == null ? "" : type;
        switch (t) {
            case "wealth": metric = u -> Math.max(0, u.getShells() == null ? 0 : u.getShells()); label = "财富榜"; break;
            case "weight": metric = u -> Math.max(0, u.getMaxCaughtWeight() == null ? 0 : u.getMaxCaughtWeight()); label = "巨物榜"; break;
            case "codex": metric = this::codexCount; label = "图鉴榜"; break;
            case "signin": metric = u -> Math.max(0, u.getSignTotal() == null ? 0 : u.getSignTotal()); label = "勤修榜"; break;
            case "achievement":
            case "overall":
            default: metric = this::scoreOf; label = "综合榜"; break;
        }
        int cap = Math.max(1, Math.min(100, limit == 0 ? 20 : limit));
        final ToIntFunction<User> m = metric;
        users.sort(Comparator.comparingInt((User u) -> -m.applyAsInt(u)).thenComparing(u -> String.valueOf(u.getUsername())));
        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < Math.min(cap, users.size()); i++) {
            User u = users.get(i);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("rank", i + 1);
            row.put("username", u.getUsername());
            row.put("value", m.applyAsInt(u));
            rows.add(row);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("type", t.isEmpty() ? "overall" : t);
        data.put("label", label);
        data.put("rows", rows);
        data.put("totalUsers", users.size());
        return Result.success(data);
    }

    /** 天榜概览：GET /api/leaderboard/overview?username= */
    public Result<Map<String, Object>> overview(String username) {
        Map<String, Object> data = new LinkedHashMap<>();
        for (String t : new String[]{"wealth", "weight", "codex", "achievement", "signin"}) {
            data.put(t, board(t, 3).getData());
        }
        Map<String, Object> overall = board("achievement", 100).getData();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rows = (List<Map<String, Object>>) overall.get("rows");
        Integer myRank = null;
        int myScore = 0;
        if (username != null && !username.isEmpty()) {
            for (Map<String, Object> row : rows) {
                if (username.equals(row.get("username"))) {
                    myRank = (Integer) row.get("rank");
                    myScore = (Integer) row.get("value");
                    break;
                }
            }
            if (myRank == null) {
                User u = userMapper.selectOne(Wrappers.<User>lambdaQuery().eq(User::getUsername, username));
                if (u != null && !"admin".equals(u.getUsername())) {
                    myRank = (Integer) overall.get("totalUsers");
                    myScore = scoreOf(u);
                }
            }
        }
        data.put("myRank", myRank);
        data.put("myScore", myScore);
        return Result.success(data);
    }
}
