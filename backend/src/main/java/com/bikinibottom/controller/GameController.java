package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.dto.AiChatResult;
import com.bikinibottom.dto.CastResult;
import com.bikinibottom.dto.EquipRequest;
import com.bikinibottom.dto.GameProfile;
import com.bikinibottom.dto.SettleRequest;
import com.bikinibottom.dto.SettleResult;
import com.bikinibottom.dto.TrainResult;
import com.bikinibottom.dto.RealmUpResult;
import com.bikinibottom.entity.AiDialog;
import com.bikinibottom.service.AiDialogService;
import com.bikinibottom.service.GameService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 钓鱼小游戏接口
 */
@RestController
@RequestMapping("/api/game")
public class GameController {

    private final GameService gameService;
    private final AiDialogService aiDialogService;

    public GameController(GameService gameService, AiDialogService aiDialogService) {
        this.gameService = gameService;
        this.aiDialogService = aiDialogService;
    }

    /** 获取玩家档案：GET /api/game/me?username=xxx */
    @GetMapping("/me")
    public Result<GameProfile> me(@RequestParam String username) {
        return gameService.me(username);
    }

    /** 抛竿（生成咬钩遭遇）：POST /api/game/cast  { "username": "xxx" } */
    @PostMapping("/cast")
    public Result<CastResult> cast(@RequestBody Map<String, String> body) {
        return gameService.cast(body.get("username"));
    }

    /** 搏鱼结算：POST /api/game/settle  { "username", "encounterId", "landed", "breakType" } */
    @PostMapping("/settle")
    public Result<SettleResult> settle(@RequestBody SettleRequest req) {
        return gameService.settle(req);
    }

    /** 装备钓竿 / 鱼线：POST /api/game/equip { "username": "xxx", "userItemId": 1 } */
    @PostMapping("/equip")
    public Result<GameProfile> equip(@RequestBody EquipRequest req) {
        return gameService.equip(req.getUsername(), req.getUserItemId());
    }

    /** 用金石升级力量：POST /api/game/train { "username": "xxx" } */
    @PostMapping("/train")
    public Result<TrainResult> train(@RequestBody Map<String, String> body) {
        return gameService.train(body.get("username"));
    }

    /** 用贝壳突破力量境界：POST /api/game/realm-up { "username": "xxx" } */
    @PostMapping("/realm-up")
    public Result<RealmUpResult> realmUp(@RequestBody Map<String, String> body) {
        return gameService.realmUp(body.get("username"));
    }

    /** AI 对话预设列表（游戏内助手用，无需登录）：POST /api/game/ai-dialogs */
    @PostMapping("/ai-dialogs")
    public Result<List<AiDialog>> aiDialogs() {
        return Result.success(aiDialogService.listEnabled());
    }

    /** AI 对话：POST /api/game/ai-chat { "username", "message" }，按触发词匹配后台预设回复 */
    @PostMapping("/ai-chat")
    public Result<AiChatResult> aiChat(@RequestBody Map<String, String> body) {
        return Result.success(aiDialogService.match(body.get("message")));
    }
}
