package com.bikinibottom.service;

import com.bikinibottom.common.Result;
import com.bikinibottom.entity.User;
import com.bikinibottom.mapper.UserMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 洞天福地：灵池 / 悬赏令 / 本命法宝的统一状态存取（与前端 localEngine.js 同构）。
 * 状态以 JSON 存在 user.feature 字段，惰性写入，不提升存档版本。
 * 金币按「新旧 earnedTotal 差额」结算：重复提交不重复入账，负数差额即扣费。
 */
@Service
public class FeatureService {

    private final UserMapper userMapper;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public FeatureService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    /** 读取洞天状态：返回 { state, shells } */
    @SuppressWarnings("unchecked")
    public Result<Map<String, Object>> state(String username) {
        User u = userByName(username);
        if (u == null) return Result.error("仙门名录上没有此人");
        Map<String, Object> state = parseState(u.getFeature());
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("state", state);
        data.put("shells", u.getShells() == null ? 0 : u.getShells());
        return Result.success(data);
    }

    /** 保存洞天状态：按 earnedTotal 差额入账/扣费 */
    @SuppressWarnings("unchecked")
    public Result<Map<String, Object>> save(String username, Map<String, Object> incoming,
                                            Number earnedTotalRaw) {
        User u = userByName(username);
        if (u == null) return Result.error("仙门名录上没有此人");
        if (incoming == null || !incoming.containsKey("earnedTotal")) {
            return Result.error("洞天存档格式不正确");
        }
        Map<String, Object> state = normalize(incoming);
        double next = earnedTotalRaw == null ? num(state.get("earnedTotal")) : earnedTotalRaw.doubleValue();
        Map<String, Object> prevState = parseState(u.getFeature());
        double prev = num(prevState.get("earnedTotal"));
        double rawDelta = next - prev;
        double delta = Math.max(-200000, Math.min(200000, rawDelta));
        long balance = (u.getShells() == null ? 0 : u.getShells()) + (long) delta;
        if (balance < 0) return Result.error("金币不足，无法完成本次洞天操作");
        // 存回 prev + delta（实际入账值），避免单次收益超 ±20万 时净值错位
        state.put("earnedTotal", prev + delta);
        u.setFeature(toJson(state));
        // User.shells 为 Integer：夹到上限，避免大额收益溢出成负数（与 AssociationService 一致）
        u.setShells((int) Math.min(Integer.MAX_VALUE, balance));
        userMapper.updateById(u);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("state", state);
        data.put("shells", u.getShells());
        data.put("delta", delta);
        return Result.success(data);
    }

    private User userByName(String username) {
        if (username == null || username.trim().isEmpty()) return null;
        return userMapper.selectOne(
                com.baomidou.mybatisplus.core.toolkit.Wrappers.<User>lambdaQuery()
                        .eq(User::getUsername, username.trim()));
    }

    private Map<String, Object> parseState(String json) {
        if (json == null || json.trim().isEmpty()) return emptyState();
        try {
            Map<String, Object> m = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            return normalize(m);
        } catch (Exception e) {
            return emptyState();
        }
    }

    /**
     * 规范化：补齐默认字段（与前端 normalizeFeature 对齐）。
     * 关键：先整体复制 raw，再覆盖已知字段——确保 spiritBonds / advance 等
     * 前端玩法状态原样透传，不会因为规范化被丢弃（否则每次 save 都会抹掉
     * 灵契 / 无尽塔 / 灵脉 / 轮回 / 战令进度）。
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> normalize(Map<String, Object> raw) {
        Map<String, Object> s = new LinkedHashMap<>();
        if (raw != null) s.putAll(raw); // 透传未知字段（spiritBonds / advance 等）
        s.put("version", 1);
        s.put("earnedTotal", num(raw == null ? 0 : raw.get("earnedTotal")));
        int forge = (int) Math.round(num(raw == null ? 0 : raw.get("forgeLevel")));
        s.put("forgeLevel", Math.max(0, Math.min(10, forge)));
        s.put("pool", Math.max(0, num(raw == null ? 0 : raw.get("pool"))));
        Object bountyObj = raw == null ? null : raw.get("bounty");
        s.put("bounty", bountyObj instanceof Map ? bountyObj : new LinkedHashMap<String, Object>());
        Object statsObj = raw == null ? null : raw.get("stats");
        s.put("stats", statsObj instanceof Map ? statsObj : new LinkedHashMap<String, Object>());
        return s;
    }

    private Map<String, Object> emptyState() {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("version", 1);
        s.put("earnedTotal", 0);
        s.put("forgeLevel", 0);
        s.put("pool", 0);
        s.put("bounty", new LinkedHashMap<String, Object>());
        s.put("stats", new LinkedHashMap<String, Object>());
        // 灵契 / 更多玩法：前端惰性挂载并会自行规范化，这里给出空壳占位即可，
        // 关键是 normalize() 会透传这些字段，不再丢失。
        s.put("spiritBonds", new LinkedHashMap<String, Object>());
        s.put("advance", new LinkedHashMap<String, Object>());
        return s;
    }

    private String toJson(Map<String, Object> state) {
        try {
            return objectMapper.writeValueAsString(state);
        } catch (Exception e) {
            return "{}";
        }
    }

    private static double num(Object v) {
        if (v instanceof Number) return ((Number) v).doubleValue();
        try {
            return Double.parseDouble(String.valueOf(v));
        } catch (Exception e) {
            return 0;
        }
    }
}
