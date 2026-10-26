package com.bikinibottom.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.bikinibottom.dto.AiChatResult;
import com.bikinibottom.entity.AiDialog;
import com.bikinibottom.mapper.AiDialogMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 游戏内 AI 助手：按「触发词 -> 回复」的预设做关键词匹配。
 * <p>规则简单可靠：玩家消息里包含某条启用预设的 scene（触发词）即命中，
 * 按 sort_order 越小越优先；都不命中则随机给一条兜底回复。
 * 完全本地实现，不依赖任何外部大模型接口。</p>
 */
@Service
public class AiDialogService {

    /** 未命中任何预设时的兜底回复 */
    private static final String[] FALLBACK_REPLIES = {
            "唔…这个我还在学。不过我知道：张力别拉满，暴走要松手！🎣",
            "试试问我「怎么玩」「力量」「金石」「巨物」「存档」这些关键词吧～",
            "派大星说：钓大鱼最重要的是耐心…还有别忘了买鱼饵 🪱",
            "章鱼哥懒得理你，我先替他回答：先抛竿，等咬钩，2.2 秒内提竿！🐠"
    };

    private final AiDialogMapper aiDialogMapper;

    public AiDialogService(AiDialogMapper aiDialogMapper) {
        this.aiDialogMapper = aiDialogMapper;
    }

    /** 启用中的预设列表（前端快捷按钮用），按 sort_order 升序 */
    public List<AiDialog> listEnabled() {
        return aiDialogMapper.selectList(
                Wrappers.<AiDialog>lambdaQuery()
                        .eq(AiDialog::getEnabled, 1)
                        .orderByAsc(AiDialog::getSortOrder)
                        .orderByAsc(AiDialog::getId));
    }

    /** 按触发词匹配回复；都不命中给兜底回复 */
    public AiChatResult match(String message) {
        String msg = message == null ? "" : message.trim();
        if (!msg.isEmpty()) {
            for (AiDialog d : listEnabled()) {
                if (d.getScene() != null && !d.getScene().isBlank() && msg.contains(d.getScene().trim())) {
                    return build(d.getReply(), d.getScene(), true);
                }
            }
        }
        String reply = FALLBACK_REPLIES[ThreadLocalRandom.current().nextInt(FALLBACK_REPLIES.length)];
        return build(reply, null, false);
    }

    private AiChatResult build(String reply, String scene, boolean matched) {
        AiChatResult r = new AiChatResult();
        r.setReply(reply);
        r.setScene(scene);
        r.setMatched(matched);
        return r;
    }
}
