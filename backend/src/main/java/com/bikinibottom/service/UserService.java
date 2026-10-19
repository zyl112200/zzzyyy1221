package com.bikinibottom.service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bikinibottom.common.Result;
import com.bikinibottom.dto.LoginRequest;
import com.bikinibottom.dto.RegisterRequest;
import com.bikinibottom.entity.User;
import com.bikinibottom.mapper.UserMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

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
}
