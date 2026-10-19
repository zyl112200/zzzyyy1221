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

/** 抛竿：POST /api/game/cast —— 返回咬钩的鱼与搏鱼参数 */
export const castApi = (username) => request('/api/game/cast', { username })

/** 搏鱼结算：POST /api/game/settle */
export const settleApi = (username, encounterId, landed, breakType = 'NONE') =>
  request('/api/game/settle', { username, encounterId, landed, breakType })

/** 装备钓竿 / 鱼线：POST /api/game/equip */
export const equipApi = (username, userItemId) =>
  request('/api/game/equip', { username, userItemId })

/** 金石升级力量：POST /api/game/train */
export const trainApi = (username) => request('/api/game/train', { username })
