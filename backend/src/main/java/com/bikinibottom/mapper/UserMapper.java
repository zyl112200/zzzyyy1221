package com.bikinibottom.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bikinibottom.entity.User;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户表 Mapper（MyBatis-Plus 提供基础 CRUD）
 */
@Mapper
public interface UserMapper extends BaseMapper<User> {
}
