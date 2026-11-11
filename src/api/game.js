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

/** 抛竿：POST /api/game/cast —— 返回咬钩的鱼与搏鱼参数（baitId / mapId 可选，指定使用的鱼饵与地图） */
export const castApi = (username, baitId = null, mapId = null) =>
  request('/api/game/cast', { username, baitId, mapId })

/** 鱼饵列表：POST /api/game/baits —— 返回当前玩家拥有的鱼饵（含库存），供切换鱼饵使用 */
export const baitsApi = (username) => request('/api/game/baits', { username })

/** 搏鱼结算：POST /api/game/settle */
export const settleApi = (username, encounterId, landed, breakType = 'NONE') =>
  request('/api/game/settle', { username, encounterId, landed, breakType })

/** 地图列表：GET /api/game/maps —— 返回全部钓鱼地图（含专属鱼概率与建议力量） */
export const mapsApi = () => get('/api/game/maps')

/** 装备钓竿 / 鱼线：POST /api/game/equip */
export const equipApi = (username, userItemId) =>
  request('/api/game/equip', { username, userItemId })

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

/** 报名并开始 2 分钟钓鱼比赛：POST /api/assoc/comp-start { username } */
export const assocCompStartApi = (username) =>
  request('/api/assoc/comp-start', { username })

/** 查询比赛实时战况（到点自动结算发奖）：POST /api/assoc/comp-state { username } */
export const assocCompStateApi = (username) =>
  request('/api/assoc/comp-state', { username })
