// 洞天福地状态存取：统一走 /api/feature/*，在线后端与本地引擎同构
// ---------------------------------------------------------------
// game.js 已声明 featureStateApi / featureSaveApi，这里在其上做一层薄封装，
// 让页面只关心「状态对象」本身：
//   · loadFeature(username, reload?) -> Promise<state>（规范化后的洞天状态）
//   · saveFeature(username, state)   -> Promise<{state, shells, delta}>
//
// 金币发放由服务端按 earnedTotal 差额结算，重复提交不会重复入账。

import { featureStateApi, featureSaveApi } from './game.js'
import { normalizeFeature } from '../data/feature.js'

/** 读取洞天状态；失败返回 null（页面据此兜底为空态，不影响钓鱼主流程） */
export async function loadFeature(username, reload = false) {
  const res = await featureStateApi(username)
  if (res && res.code === 200 && res.data) {
    return normalizeFeature(res.data.state)
  }
  return null
}

/** 保存洞天状态；以 state.earnedTotal 作为差额结算基准 */
export async function saveFeature(username, state) {
  const st = normalizeFeature(state)
  const res = await featureSaveApi(username, st, st.earnedTotal)
  if (res && res.code === 200 && res.data) {
    // 金币余额可能因差额结算变化，广播给所有顶栏组件刷新，
    // 避免父子页面各自持有 shells 副本导致显示不一致。
    try {
      window.dispatchEvent(new CustomEvent('bikini:coins-changed', { detail: { shells: res.data.shells } }))
    } catch { /* 非浏览器环境忽略 */ }
    return res.data
  }
  return null
}

export default { loadFeature, saveFeature }
