package com.bikinibottom.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bikinibottom.entity.AiDialog;
import org.apache.ibatis.annotations.Mapper;

/**
 * AI 对话预设 Mapper（MyBatis-Plus 提供基础 CRUD）
 */
@Mapper
public interface AiDialogMapper extends BaseMapper<AiDialog> {
}
