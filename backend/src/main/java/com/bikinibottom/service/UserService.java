package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bikinibottom.common.Result;
import com.bikinibottom.dto.LoginRequest;
import com.bikinibottom.dto.RegisterRequest;
import com.bikinibottom.entity.User;
import com.bikinibottom.entity.UserItem;
import com.bikinibottom.mapper.UserItemMapper;
import com.bikinibottom.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 用户业务层：注册 / 登录
 */
@Service
public class UserService extends ServiceImpl<UserMapper, User> {

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Autowired
    private UserItemMapper userItemMapper;

    /**
     * 注册：用户名唯一校验，密码 BCrypt 加密入库；
     * 邮箱已改为可选，留空时按用户名生成占位邮箱以保持数据模型不变
     */
    public Result<User> register(RegisterRequest req) {
        boolean usernameExists = lambdaQuery().eq(User::getUsername, req.getUsername()).exists();
        if (usernameExists) {
            return Result.error("此道号已被先人占用，另择一名号吧 🍃");
        }
        String mail = req.getEmail() == null || req.getEmail().trim().isEmpty()
                ? req.getUsername() + "@xiandao.world"
                : req.getEmail().trim();
        if (req.getEmail() != null && !req.getEmail().trim().isEmpty()) {
            boolean emailExists = lambdaQuery().eq(User::getEmail, mail).exists();
            if (emailExists) {
                return Result.error("该仙讯邮箱已注册过，直接回山门登录吧 🕊️");
            }
        }

        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(mail);
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        save(user);
        // 新手礼包：注册即赠 1 把初级钓竿（已装备）+ 5 个普通鱼饵。
        // 与离线引擎 localEngine.js（register 第 844–846 行）及 README「注册新道号（50 贝壳 + 5 鱼饵）」契约一致。
        // 原实现只建 user、不建 user_item，导致新用户 totalBait=0、cast 直接报「没有鱼饵了」而无法游玩。
        grantStarterPack(user.getId());
        return Result.success("入道成功，欢迎踏入仙钓大陆 🎉", user);
    }

    /**
     * 新注册用户初始背包：1 把初级钓竿（item_id=1，已装备）+ 5 个普通鱼饵（item_id=5）。
     * 直接插库，保证新道号注册后即可抛竿，无需先去商店买饵。
     */
    @Transactional
    private void grantStarterPack(Long userId) {
        UserItem rod = new UserItem();
        rod.setUserId(userId);
        rod.setItemId(1L);           // 初级钓竿
        rod.setQuantity(1);
        rod.setEquipped(1);           // 已装备
        userItemMapper.insert(rod);

        UserItem bait = new UserItem();
        bait.setUserId(userId);
        bait.setItemId(5L);           // 普通鱼饵
        bait.setQuantity(5);
        bait.setEquipped(0);
        userItemMapper.insert(bait);
    }

    /**
     * 登录：按用户名查找，BCrypt 校验密码
     */
    public Result<User> login(LoginRequest req) {
        User user = lambdaQuery().eq(User::getUsername, req.getUsername()).one();
        if (user == null) {
            return Result.error("查无此道号，仙门名录上没有此人 🌫️");
        }
        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            return Result.error("护道法印不对，心魔可趁机而入 🗝️");
        }
        return Result.success("登仙成功，欢迎回到仙钓大陆 🎉", user);
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
