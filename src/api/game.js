/**
 * 钓鱼小游戏 / 商店接口封装
 */
import { request, get } from './http'

/** 玩家档案：GET /api/game/me?username= */
export const meApi = (username) =>
  get('/api/game/me?username=' + encodeURIComponent(username))

/** 商品目录：GET /api/shop/items */
export const shopItemsApi = () => get('/api/shop/items')

/** 购买：POST /api/shop/buy */
export const buyApi = (username, itemId, quantity = 1) =>
  request('/api/shop/buy', { username, itemId, quantity })

/** 抛竿：POST /api/game/cast —— 返回咬钩的鱼与搏鱼参数
 *  baitId / mapId 可选（指定鱼饵与钓场）；blessing 为「本命法宝」淬炼等级 0~10；
 *  bondFx 为「仙钓道途」灵契 + 图鉴大成加成 { rareBoost, weightMul, coinMul, tensionMul }，
 *  由后端 clamp 后作用于异种概率 / 鱼重 / 收益，离线引擎同构。 */
export const castApi = (username, baitId = null, mapId = null, blessing = 0, bondFx = null) =>
  request('/api/game/cast', { username, baitId, mapId, blessing, bondFx })

/** 鱼饵列表：POST /api/game/baits —— 返回当前玩家拥有的鱼饵（含库存），供切换鱼饵使用 */
export const baitsApi = (username) => request('/api/game/baits', { username })

/** 搏鱼结算：POST /api/game/settle */
export const settleApi = (username, encounterId, landed, breakType = 'NONE') =>
  request('/api/game/settle', { username, encounterId, landed, breakType })

/** 地图列表：GET /api/game/maps —— 返回全部钓鱼地图（含专属鱼概率与建议力量） */
export const mapsApi = () => get('/api/game/maps')

/** 切换当前钓场：POST /api/game/set-map { username, mapId } */
export const setMapApi = (username, mapId) =>
  request('/api/game/set-map', { username, mapId })

/** 装备钓竿 / 鱼线：POST /api/game/equip */
export const equipApi = (username, userItemId) =>
  request('/api/game/equip', { username, userItemId })

// ---------------- 仙钓天榜 ----------------

/** 天榜概览：GET /api/leaderboard/overview?username= */
export const leaderboardOverviewApi = (username) =>
  get('/api/leaderboard/overview?username=' + encodeURIComponent(username || ''))

/** 分类榜单：GET /api/leaderboard/board?type=&limit= */
export const leaderboardBoardApi = (type, limit = 20) =>
  get('/api/leaderboard/board?type=' + encodeURIComponent(type) + '&limit=' + limit)

// ---------------- 每日签到 ----------------

/** 签到状态：GET /api/signin/info?username= */
export const signInInfoApi = (username) =>
  get('/api/signin/info?username=' + encodeURIComponent(username))

/** 执行签到：POST /api/signin/do { username } */
export const signInApi = (username) => request('/api/signin/do', { username })

// ---------------- 钓鱼功法阁 ----------------

/** 功法目录：POST /api/game/skills —— 返回 8 部功法的 id/名称/价格/效果（无需登录） */
export const skillCatalogApi = () => request('/api/game/skills', {})

/** 修炼功法：POST /api/game/cultivate { username, skillId } */
export const cultivateApi = (username, skillId) =>
  request('/api/game/cultivate', { username, skillId })

// ---------------- 洞天福地（灵池 / 悬赏 / 本命法宝） ----------------

/** 洞天状态：GET /api/feature/state?username= —— 返回 { state, shells } */
export const featureStateApi = (username) =>
  get('/api/feature/state?username=' + encodeURIComponent(username))

/** 保存洞天状态：POST /api/feature/save { username, state, earnedTotal }
 *  后端按「新旧 earnedTotal 差额」入账金币，重复提交不会重复发钱（在线 / 离线同构）。 */
export const featureSaveApi = (username, state, earnedTotal) =>
  request('/api/feature/save', { username, state, earnedTotal })

/** AI 对话预设列表（游戏内助手，无需登录）：POST /api/game/ai-dialogs */
export const aiDialogsApi = () => request('/api/game/ai-dialogs')

/** AI 对话：POST /api/game/ai-chat { username, message } */
export const aiChatApi = (username, message) =>
  request('/api/game/ai-chat', { username, message })

// ---------------- 钓鱼协会 ----------------

/** 协会主页数据（任务 / 徽章 / 比赛战况）：GET /api/assoc/info?username= */
export const assocInfoApi = (username) =>
  get('/api/assoc/info?username=' + encodeURIComponent(username))

/** 领取协会任务奖励：POST /api/assoc/task-claim { username, taskId } */
export const assocTaskClaimApi = (username, taskId) =>
  request('/api/assoc/task-claim', { username, taskId })

/** 在线报名钓鱼比赛（1 分钟匹配 + 100 人 + 1 小时）：POST /api/assoc/comp-start { username } */
export const assocCompStartApi = (username) =>
  request('/api/assoc/comp-start', { username })

/** 查询比赛实时战况（到点自动结算发奖）：POST /api/assoc/comp-state { username } */
export const assocCompStateApi = (username) =>
  request('/api/assoc/comp-state', { username })
