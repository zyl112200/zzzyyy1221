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

/** 抛竿：POST /api/game/cast —— 返回咬钩的鱼与搏鱼参数（baitId 为可选，指定使用的鱼饵） */
export const castApi = (username, baitId = null) =>
  request('/api/game/cast', { username, baitId })

/** 鱼饵列表：POST /api/game/baits —— 返回当前玩家拥有的鱼饵（含库存），供切换鱼饵使用 */
export const baitsApi = (username) => request('/api/game/baits', { username })

/** 搏鱼结算：POST /api/game/settle */
export const settleApi = (username, encounterId, landed, breakType = 'NONE') =>
  request('/api/game/settle', { username, encounterId, landed, breakType })

/** 装备钓竿 / 鱼线：POST /api/game/equip */
export const equipApi = (username, userItemId) =>
  request('/api/game/equip', { username, userItemId })

/** 金石升级力量：POST /api/game/train */
export const trainApi = (username) => request('/api/game/train', { username })

/** 贝壳突破力量境界：POST /api/game/realm-up */
export const realmUpApi = (username) => request('/api/game/realm-up', { username })

/** AI 对话预设列表（游戏内助手，无需登录）：POST /api/game/ai-dialogs */
export const aiDialogsApi = () => request('/api/game/ai-dialogs')

/** AI 对话：POST /api/game/ai-chat { username, message } */
export const aiChatApi = (username, message) =>
  request('/api/game/ai-chat', { username, message })
