// 洞天福地：灵池 / 悬赏令 / 本命法宝（统一状态）
// ---------------------------------------------------------------
// 状态惰性挂在用户 feature 字段上（见 localEngine.js / 后端 FeatureService），
// 不提升存档版本号，避免影响旧存档迁移。金币发放按 earnedTotal 差额结算：
// 重复提交同一状态不会重复入账，负数差额即扣费（扩建 / 淬炼）。
//
// 导出：
//   · normalizeFeature(state) -> 补全默认字段、夹紧数值，返回规范化状态
//   · blessingOf(state)       -> 本命法宝淬炼等级（0~10），传给 castApi
//   · forgeBonus(level)       -> 该等级对搏鱼 / 收益的倍率加成
//   · applyCatch(base, info)  -> 把一次钓获写入状态（灵池 / 悬赏 / 统计），
//                                并结算本次应入账的金币差，返回新状态
//   · 供洞天页展示的常量：FORGE_MAX、BOUNTY_TARGETS

export const FORGE_MAX = 10

/** 悬赏手札目标：不同品级钓获计入悬赏进度 */
export const BOUNTY_TARGETS = [
  { id: 'common', name: '凡鳞小钓', desc: '今日钓起 5 条普通灵鱼', tier: 'COMMON', need: 5, reward: 120 },
  { id: 'rare', name: '深渊寻珍', desc: '今日钓起 3 条稀有灵鱼', tier: 'RARE', need: 3, reward: 400 },
  { id: 'legend', name: '深海探秘', desc: '今日钓起 1 条传说灵鱼', tier: 'LEGENDARY', need: 1, reward: 1200 },
  { id: 'weight', name: '千斤巨物', desc: '今日钓起重量合计满 5000 斤', need: 5000, reward: 2000 }
]

function todayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptyBounty(date) {
  return {
    date,
    tiers: { COMMON: 0, RARE: 0, LEGENDARY: 0, MYTHIC: 0, SHANHAI: 0 },
    weight: 0,
    catches: 0,
    claimed: []
  }
}

/** 规范化洞天状态：所有字段都有安全默认值 */
export function normalizeFeature(state) {
  const s = state && typeof state === 'object' ? state : {}
  // earnedTotal 是「累计结算净值」：钓获入账为正、淬炼/扩建消费为负，
  // 后端按新旧差额发放/扣回金币，因此这里允许为负，不能夹到 0。
  const earnedTotal = Number(s.earnedTotal) || 0
  const bounty = s.bounty && typeof s.bounty === 'object' && s.bounty.date === todayKey()
    ? s.bounty
    : emptyBounty(todayKey())
  const tiers = { COMMON: 0, RARE: 0, LEGENDARY: 0, MYTHIC: 0, SHANHAI: 0 }
  if (bounty.tiers && typeof bounty.tiers === 'object') {
    for (const k of Object.keys(tiers)) tiers[k] = Math.max(0, Number(bounty.tiers[k]) || 0)
  }
  const stats = s.stats && typeof s.stats === 'object' ? s.stats : {}
  return {
    version: 1,
    earnedTotal,
    forgeLevel: clampInt(s.forgeLevel, 0, FORGE_MAX),
    pool: Math.max(0, Number(s.pool) || 0),
    bounty: {
      date: bounty.date,
      tiers,
      weight: Math.max(0, Number(bounty.weight) || 0),
      catches: Math.max(0, Number(bounty.catches) || 0),
      claimed: Array.isArray(bounty.claimed) ? bounty.claimed.filter((x) => typeof x === 'string') : []
    },
    stats: {
      totalCatch: Math.max(0, Number(stats.totalCatch) || 0),
      landed: Math.max(0, Number(stats.landed) || 0),
      maxWeight: Math.max(0, Number(stats.maxWeight) || 0),
      byTier: stats.byTier && typeof stats.byTier === 'object' ? stats.byTier : {}
    }
  }
}

/** 本命法宝淬炼等级 */
export function blessingOf(state) {
  return state ? clampInt(state.forgeLevel, 0, FORGE_MAX) : 0
}

/** 本命法宝（本命钓竿）倍率：每重 +约 4% 收益、+少量稀有/鱼重、略增张力 */
export function forgeBonus(level) {
  const lv = clampInt(level, 0, FORGE_MAX)
  return {
    rareBoost: round3(lv * 0.006),
    weightMul: round3(1 + lv * 0.015),
    coinMul: round3(1 + lv * 0.04),
    tensionMul: round3(1 + lv * 0.02)
  }
}

/** 本命法宝淬炼到下一重所需金币 */
export function forgeCost(level) {
  const lv = clampInt(level, 0, FORGE_MAX)
  return Math.round(200 * Math.pow(1.55, lv))
}

/** 灵池扩建所需金币（按当前容量递增） */
export function poolExpandCost(currentCapacity) {
  return Math.round(150 * Math.pow(1.6, Math.max(0, Number(currentCapacity) || 0) / 50))
}

/**
 * 把一次钓获写入洞天状态。
 * info: { tier, weight, mapId, coins, landed, fortuneId }
 * 返回：新的规范化状态（其 earnedTotal 为「本次操作后累计应收」，
 *       调用方以 newState.earnedTotal 作为 saveFeature 的 earnedTotal 入参，
 *       localEngine / 后端按与旧值差额发放金币）。
 */
export function applyCatch(base, info) {
  const st = normalizeFeature(base)
  const d = info && typeof info === 'object' ? info : {}
  const coins = Math.max(0, Number(d.coins) || 0)
  const weight = Math.max(0, Number(d.weight) || 0)
  const landed = !!d.landed
  const tier = typeof d.tier === 'string' ? d.tier : 'COMMON'

  // 悬赏手札按天重置
  if (st.bounty.date !== todayKey()) st.bounty = emptyBounty(todayKey())

  // 灵池：钓获入账（成功钓起才凝聚灵气）
  if (landed) {
    const gain = Math.max(1, Math.round(weight * 0.02 + coins * 0.01))
    st.pool += gain
    if (st.bounty.tiers[tier] != null) st.bounty.tiers[tier] += 1
    st.bounty.weight += weight
    st.bounty.catches += 1
    st.stats.landed += 1
    st.stats.maxWeight = Math.max(st.stats.maxWeight, weight)
    st.stats.byTier[tier] = (Number(st.stats.byTier[tier]) || 0) + 1
  }
  st.stats.totalCatch += 1

  // 累计收益：本次钓获金币 + 已领取悬赏奖励（claimed 在别处入账时同样累加）
  st.earnedTotal += coins
  return st
}

/** 领取悬赏奖励：把奖励计入 earnedTotal 并标记已领 */
export function claimBounty(state, bountyId) {
  const st = normalizeFeature(state)
  if (st.bounty.claimed.includes(bountyId)) return null
  const target = BOUNTY_TARGETS.find((t) => t.id === bountyId)
  if (!target) return null
  const done = target.tier
    ? (st.bounty.tiers[target.tier] || 0) >= target.need
    : st.bounty.weight >= target.need
  if (!done) return null
  st.bounty.claimed.push(bountyId)
  st.earnedTotal += target.reward
  return st
}

/** 淬炼本命法宝：扣金币（通过负 earnedTotal 差额），返回新状态 */
export function forgeUp(state) {
  const st = normalizeFeature(state)
  if (st.forgeLevel >= FORGE_MAX) return null
  const cost = forgeCost(st.forgeLevel)
  st.forgeLevel += 1
  st.earnedTotal = st.earnedTotal - cost
  return st
}

function clampInt(v, min, max) {
  const n = Math.round(Number(v) || 0)
  return Math.min(max, Math.max(min, n))
}

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

export default {
  FORGE_MAX, BOUNTY_TARGETS, normalizeFeature, blessingOf, forgeBonus,
  forgeCost, poolExpandCost, applyCatch, claimBounty, forgeUp
}
