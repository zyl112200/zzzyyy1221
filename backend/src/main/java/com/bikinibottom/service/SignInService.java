package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.bikinibottom.common.Result;
import com.bikinibottom.entity.User;
import com.bikinibottom.mapper.UserMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 每日签到业务：与前端离线引擎 localEngine.js 的签到实现同构。
 * <p>规则：连续签到奖励 = 100 + (连签天数-1)*50；每 7 天里程碑额外 +500。
 * 断签（上次签到不是昨天）则连签天数重置为 1。签到金币入账 user.shells 持久化。</p>
 */
@Service
public class SignInService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final UserMapper userMapper;

    public SignInService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    /** 第 day 天的签到奖励（连签天数），与 localEngine.signRewardForDay 一致 */
    private int rewardForDay(int day) {
        int base = 100 + Math.max(0, day - 1) * 50;
        return day % 7 == 0 ? base + 500 : base;
    }

    private Map<String, Object> stateOf(User u, boolean signed, int reward, String message) {
        int streak = u.getSignStreak() == null ? 0 : u.getSignStreak();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("signed", signed);
        data.put("rewardShells", reward);
        data.put("message", message);
        data.put("streak", streak);
        data.put("total", u.getSignTotal() == null ? 0 : u.getSignTotal());
        String today = LocalDate.now().format(DATE_FMT);
        data.put("todaySigned", today.equals(u.getLastSignDate()));
        List<Integer> week = new ArrayList<>();
        for (int day = 1; day <= 7; day++) week.add(rewardForDay(day));
        data.put("weekRewards", week);
        data.put("shells", u.getShells() == null ? 0 : u.getShells());
        return data;
    }

    /** 签到状态：GET /api/signin/info?username= */
    public Result<Map<String, Object>> info(String username) {
        User u = userMapper.selectOne(Wrappers.<User>lambdaQuery().eq(User::getUsername, String.valueOf(username == null ? "" : username).trim()));
        if (u == null) return Result.error("仙门名录上没有此人");
        return Result.success(stateOf(u, false, 0, ""));
    }

    /** 执行签到：POST /api/signin/do { username } */
    @Transactional
    public Result<Map<String, Object>> signIn(String username) {
        User u = userMapper.selectOne(Wrappers.<User>lambdaQuery().eq(User::getUsername, String.valueOf(username == null ? "" : username).trim()));
        if (u == null) return Result.error("仙门名录上没有此人");
        LocalDate today = LocalDate.now();
        String todayStr = today.format(DATE_FMT);
        if (todayStr.equals(u.getLastSignDate())) {
            return Result.success(stateOf(u, false, 0, "今日已签到，明日再来领奖吧～"));
        }
        String yesterdayStr = today.minusDays(1).format(DATE_FMT);
        int streak = u.getSignStreak() == null ? 0 : u.getSignStreak();
        if (u.getLastSignDate() == null || !yesterdayStr.equals(u.getLastSignDate())) streak = 0;
        streak += 1;
        int reward = rewardForDay(streak);
        u.setSignStreak(streak);
        u.setSignTotal((u.getSignTotal() == null ? 0 : u.getSignTotal()) + 1);
        u.setLastSignDate(todayStr);
        u.setShells((u.getShells() == null ? 0 : u.getShells()) + reward);
        userMapper.updateById(u);
        String milestone = streak % 7 == 0 ? " · 连签 7 日里程碑！额外奖励已发放" : "";
        String msg = "签到成功！连签 " + streak + " 天，获得 " + reward + " 金币" + milestone;
        return Result.success(stateOf(u, true, reward, msg));
    }
}
