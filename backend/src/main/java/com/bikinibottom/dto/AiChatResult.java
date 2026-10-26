package com.bikinibottom.dto;

import lombok.Data;

/**
 * 游戏内 AI 助手对话结果（按触发词匹配后台预设）
 */
@Data
public class AiChatResult {

    /** 助手回复内容 */
    private String reply;

    /** 命中的场景 / 触发词（未命中为 null） */
    private String scene;

    /** 是否命中了预设问答 */
    private Boolean matched;
}
