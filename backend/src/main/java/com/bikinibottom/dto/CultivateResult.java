package com.bikinibottom.dto;

import lombok.Data;

import java.util.List;

/**
 * 修炼钓鱼功法结果（返回最新金石余额与已修炼功法列表，供前端刷新档案）
 */
@Data
public class CultivateResult {

    /** 修炼后的金石余额 */
    private Integer goldStones;

    /** 已修炼的钓鱼功法 id 列表（如 ["jingxin","xieli"]） */
    private List<String> skills;
}
