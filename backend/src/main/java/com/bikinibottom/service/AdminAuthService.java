package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.bikinibottom.common.Result;
import com.bikinibottom.entity.User;
import com.bikinibottom.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 后台管理员鉴权：登录校验 + 无状态 token（HMAC-SHA256 签名）。
 * <p>token 格式：base64(username|到期毫秒).base64(HMAC-SHA256)，密钥来自配置
 * admin.token-secret（可用环境变量 ADMIN_TOKEN_SECRET 覆盖）。重启后只要密钥不变即仍有效。
 * 不引入 JWT 依赖，仅用 JDK 自带加密 API，零新增依赖。</p>
 */
@Service
public class AdminAuthService {

    private static final long TOKEN_TTL_MS = 12 * 60 * 60 * 1000L; // 12 小时

    private final UserMapper userMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final String secret;

    public AdminAuthService(UserMapper userMapper,
                            @Value("${admin.token-secret:xiandiao-admin-secret-change-me}") String secret) {
        this.userMapper = userMapper;
        this.secret = secret;
    }

    /** 管理员登录：校验用户名/密码 + permission=0，成功签发 token */
    public Result<Map<String, Object>> login(String username, String password) {
        String name = String.valueOf(username == null ? "" : username).trim();
        if (name.isEmpty() || password == null || password.isEmpty()) {
            return Result.error("请输入账号和密码");
        }
        User u = userMapper.selectOne(Wrappers.<User>lambdaQuery().eq(User::getUsername, name));
        if (u == null) return Result.error("查无此管理员账号");
        if (!passwordEncoder.matches(password, u.getPassword())) return Result.error("密码错误");
        if (u.getPermission() == null || u.getPermission() != 0) {
            return Result.error("该账号不是管理员，无权访问后台");
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("token", sign(name));
        data.put("username", u.getUsername());
        data.put("permission", u.getPermission());
        data.put("expiresIn", TOKEN_TTL_MS / 1000);
        return Result.success("管理员登录成功", data);
    }

    /** 校验 token 是否有效且为管理员，返回用户名；无效返回 null */
    public String verify(String token) {
        if (token == null || token.isEmpty()) return null;
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 2) return null;
            String payload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String sig = hmac(parts[0]);
            if (!MessageDigest.isEqual(sig.getBytes(StandardCharsets.UTF_8), parts[1].getBytes(StandardCharsets.UTF_8))) {
                return null;
            }
            int bar = payload.indexOf('|');
            if (bar < 0) return null;
            String username = payload.substring(0, bar);
            long expire = Long.parseLong(payload.substring(bar + 1));
            if (System.currentTimeMillis() > expire) return null;
            // 复核该用户仍是管理员（防止降级/删除后 token 仍可用）
            User u = userMapper.selectOne(Wrappers.<User>lambdaQuery().eq(User::getUsername, username));
            if (u == null || u.getPermission() == null || u.getPermission() != 0) return null;
            return username;
        } catch (Exception e) {
            return null;
        }
    }

    private String sign(String username) {
        String payload = username + "|" + (System.currentTimeMillis() + TOKEN_TTL_MS);
        String p = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return p + "." + hmac(p);
    }

    private String hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("HMAC 初始化失败", e);
        }
    }
}
