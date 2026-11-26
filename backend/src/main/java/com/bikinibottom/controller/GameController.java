package com.bikinibottom.controller;

import com.bikinibottom.common.Result;
import com.bikinibottom.dto.AiChatResult;
import com.bikinibottom.dto.CastResult;
import com.bikinibottom.dto.CultivateResult;
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
import org.springframework.web.bind.annotation.RequestMethod;
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

    /** 抛竿（生成咬钩遭遇）：POST /api/game/cast  { "username", "mapId", "baitId" } */
    @PostMapping("/cast")
    public Result<CastResult> cast(@RequestBody Map<String, Object> body) {
        String username = body.get("username") == null ? null : String.valueOf(body.get("username"));
        String mapId = body.get("mapId") == null ? null : String.valueOf(body.get("mapId"));
        Long baitId = null;
        try {
            if (body.get("baitId") != null) baitId = Long.valueOf(String.valueOf(body.get("baitId")));
        } catch (NumberFormatException ignored) { /* 非法 baitId 视为未指定，回退默认饵 */ }
        // 本命法宝淬炼等级（洞天福地），clamp 0~10 后作用于稀有率 / 鱼重 / 收益
        int blessing = 0;
        try {
            if (body.get("blessing") != null) blessing = Integer.parseInt(String.valueOf(body.get("blessing")));
        } catch (NumberFormatException ignored) { /* 非法值视为 0 */ }
        return gameService.cast(username, mapId, baitId, blessing);
    }

    /** 地图目录：GET /api/game/maps —— 返回全部钓场配置（含专属鱼概率与建议力量） */
    @GetMapping("/maps")
    public Result<List<Map<String, Object>>> maps() {
        return gameService.maps();
    }

    /** 切换当前钓场：POST /api/game/set-map { "username": "xxx", "mapId": "beiyuan" } */
    @PostMapping("/set-map")
    public Result<GameProfile> setMap(@RequestBody Map<String, String> body) {
        return gameService.setMap(body.get("username"), body.get("mapId"));
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

    /** 用金石淬炼根骨：POST /api/game/train { "username": "xxx" } */
    @PostMapping("/train")
    public Result<TrainResult> train(@RequestBody Map<String, String> body) {
        return gameService.train(body.get("username"));
    }

    /** 用金币突破钓道境界：POST /api/game/realm-up { "username": "xxx" } */
    @PostMapping("/realm-up")
    public Result<RealmUpResult> realmUp(@RequestBody Map<String, String> body) {
        return gameService.realmUp(body.get("username"));
    }

    /** 根骨一键修炼（耗尽金石，能升几级升几级）：POST /api/game/train-all { "username": "xxx" } */
    @PostMapping("/train-all")
    public Result<TrainResult> trainAll(@RequestBody Map<String, String> body) {
        return gameService.trainAll(body.get("username"));
    }

    /** 钓道境界一键突破（耗尽金币，能破几重破几重）：POST /api/game/realm-up-all { "username": "xxx" } */
    @PostMapping("/realm-up-all")
    public Result<RealmUpResult> realmUpAll(@RequestBody Map<String, String> body) {
        return gameService.realmUpAll(body.get("username"));
    }

    /** 钓鱼功法目录（前端功法阁渲染用，无需登录）：GET / POST /api/game/skills
     *  同时支持 GET 与 POST：离线引擎 localEngine.js 与前端 skillCatalogApi 均以 POST 调用，
     *  原仅 GET 会导致 ?api=server 模式下功法阁加载失败（405）。 */
    @RequestMapping(value = "/skills", method = {RequestMethod.GET, RequestMethod.POST})
    public Result<List<com.bikinibottom.service.GameService.SkillDef>> skills() {
        return gameService.skills();
    }

    /** 鱼饵列表（切换鱼饵用）：POST /api/game/baits { "username": "xxx" }
     *  与离线引擎 localEngine.js listBaits 返回结构保持一致，原后端缺失该端点
     *  （?api=server 模式下切换鱼饵会 404）。 */
    @PostMapping("/baits")
    public Result<List<Map<String, Object>>> baits(@RequestBody Map<String, String> body) {
        return gameService.listBaits(body.get("username"));
    }

    /** 修炼钓鱼功法：POST /api/game/cultivate { "username": "xxx", "skillId": "jingxin" } */
    @PostMapping("/cultivate")
    public Result<CultivateResult> cultivate(@RequestBody Map<String, String> body) {
        return gameService.cultivate(body.get("username"), body.get("skillId"));
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
