package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bikinibottom.common.Result;
import com.bikinibottom.dto.LoginRequest;
import com.bikinibottom.dto.RegisterRequest;
import com.bikinibottom.entity.User;
import com.bikinibottom.mapper.UserMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 用户业务层：注册 / 登录
 */
@Service
public class UserService extends ServiceImpl<UserMapper, User> {

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /**
     * 注册：用户名 / 邮箱唯一校验，密码 BCrypt 加密入库
     */
    public Result<User> register(RegisterRequest req) {
        boolean usernameExists = lambdaQuery().eq(User::getUsername, req.getUsername()).exists();
        if (usernameExists) {
            return Result.error("该用户名已被占用，海绵宝宝不答应 🍍");
        }
        boolean emailExists = lambdaQuery().eq(User::getEmail, req.getEmail()).exists();
        if (emailExists) {
            return Result.error("该邮箱已注册过，直接回菠萝屋登录吧 🐌");
        }

        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        save(user);
        return Result.success("注册成功，欢迎加入比奇堡 🎉", user);
    }

    /**
     * 登录：按用户名查找，BCrypt 校验密码
     */
    public Result<User> login(LoginRequest req) {
        User user = lambdaQuery().eq(User::getUsername, req.getUsername()).one();
        if (user == null) {
            return Result.error("用户不存在，比奇堡查无此人 🐙");
        }
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            return Result.error("密码错误，蟹黄堡秘方可不是这个 🦀");
        }
        return Result.success("登录成功，欢迎回到比奇堡 🎉", user);
    }

    // ============================================================
    //  后台用户管理（与离线本地引擎 localEngine.js 接口契约保持一致）
    // ============================================================

    /** 用户列表：关键词（用户名/邮箱）、角色筛选、内存分页 */
    public Result<Map<String, Object>> adminListUsers(String keyword, Integer permission, Integer page, Integer pageSize) {
        LambdaQueryWrapper<User> q = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.trim().isEmpty()) {
            String kw = keyword.trim();
            q.and(w -> w.like(User::getUsername, kw).or().like(User::getEmail, kw));
        }
        if (permission != null) {
            q.eq(User::getPermission, permission);
        }
        q.orderByAsc(User::getId);
        List<User> all = list(q);
        int total = all.size();
        int p = (page == null || page < 1) ? 1 : page;
        int ps = (pageSize == null || pageSize < 1) ? 10 : pageSize;
        int from = Math.min((p - 1) * ps, Math.max(0, total));
        int to = Math.min(from + ps, total);
        List<User> slice = all.subList(from, to);
        Map<String, Object> data = new HashMap<>();
        data.put("list", slice);
        data.put("total", total);
        data.put("page", p);
        data.put("pageSize", ps);
        return Result.success(data);
    }

    /** 用户详情 */
    public Result<User> adminGetUser(Long id) {
        User u = getById(id);
        if (u == null) return Result.error("用户不存在");
        return Result.success(u);
    }

    /** 编辑用户：仅更新传入的非空字段；不允许降级/删除最后一名管理员 */
    public Result<User> adminUpdateUser(Long id, String email, Integer shells, Integer strength,
                                        Integer goldStones, Integer powerRealm, Integer permission) {
        User u = getById(id);
        if (u == null) return Result.error("用户不存在");
        if (email != null) {
            String mail = email.trim();
            if (mail.isEmpty()) return Result.error("邮箱不能为空");
            boolean dup = lambdaQuery().eq(User::getEmail, mail).ne(User::getId, id).exists();
            if (dup) return Result.error("该邮箱已被其他用户使用");
            u.setEmail(mail);
        }
        if (shells != null) u.setShells(clampInt(shells, 0, 1_000_000_000));
        if (strength != null) u.setStrength(clampInt(strength, 0, 1_000_000_000));
        if (goldStones != null) u.setGoldStones(clampInt(goldStones, 0, 1_000_000_000));
        if (powerRealm != null) u.setPowerRealm(clampInt(powerRealm, 1, 999));
        if (permission != null) {
            int perm = (permission == 0) ? 0 : 1;
            if (perm == 1 && u.getPermission() != null && u.getPermission() == 0) {
                long adminCount = lambdaQuery().eq(User::getPermission, 0).count();
                if (adminCount <= 1) return Result.error("至少需要保留一名管理员，无法降级最后一名管理员");
            }
            u.setPermission(perm);
        }
        updateById(u);
        return Result.success("用户已更新", u);
    }

    /** 删除用户：不允许删除最后一名管理员 */
    public Result<Void> adminDeleteUser(Long id) {
        User u = getById(id);
        if (u == null) return Result.error("用户不存在");
        if (u.getPermission() != null && u.getPermission() == 0) {
            long adminCount = lambdaQuery().eq(User::getPermission, 0).count();
            if (adminCount <= 1) return Result.error("至少需要保留一名管理员，无法删除最后一名管理员");
        }
        removeById(id);
        return Result.success();
    }

    /** 新建用户：用户名/邮箱唯一校验，密码 BCrypt 加密入库 */
    public Result<User> adminCreateUser(String username, String email, String password,
                                        Integer shells, Integer strength, Integer goldStones,
                                        Integer powerRealm, Integer permission) {
        if (username == null || username.trim().isEmpty()) return Result.error("用户名不能为空");
        if (email == null || email.trim().isEmpty()) return Result.error("邮箱不能为空");
        if (password == null || password.length() < 6) return Result.error("密码至少 6 位");
        String name = username.trim();
        String mail = email.trim();
        if (lambdaQuery().eq(User::getUsername, name).exists()) return Result.error("该用户名已被占用");
        if (lambdaQuery().eq(User::getEmail, mail).exists()) return Result.error("该邮箱已注册过");
        User u = new User();
        u.setUsername(name);
        u.setEmail(mail);
        u.setPassword(passwordEncoder.encode(password));
        u.setShells(shells == null ? 50 : clampInt(shells, 0, 1_000_000_000));
        u.setStrength(strength == null ? 10 : clampInt(strength, 0, 1_000_000_000));
        u.setGoldStones(goldStones == null ? 0 : clampInt(goldStones, 0, 1_000_000_000));
        u.setPowerRealm(powerRealm == null ? 1 : clampInt(powerRealm, 1, 999));
        u.setPermission(permission == null ? 1 : ((permission == 0) ? 0 : 1));
        save(u);
        return Result.success("创建成功", u);
    }

    /** 重置用户密码（BCrypt 加密） */
    public Result<Void> adminResetPassword(Long id, String newPassword) {
        User u = getById(id);
        if (u == null) return Result.error("用户不存在");
        if (newPassword == null || newPassword.length() < 6) return Result.error("新密码至少 6 位");
        u.setPassword(passwordEncoder.encode(newPassword));
        updateById(u);
        return Result.success();
    }

    private int clampInt(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }
}
