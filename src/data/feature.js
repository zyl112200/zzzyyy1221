// 洞天福地：灵池 / 悬赏令 / 本命法宝（统一状态）
// ---------------------------------------------------------------
import {
  normalizeBonds, poolQiMul, contractFish, starUpFish, toggleActive,
  expandSlots, upgradePool, FISH_TIER
} from './bonds.js'
import {
  normalizeAdvance, abyssChallenge, buyStamina, collectVein, upgradeVein,
  reincarnate, allocateSeal, claimPassDaily, settleVein
} from './advance.js'

// 状态惰性挂在用户 feature 字段上（见 localEngine.js / 后端 FeatureService），
// 不提升存档版本号，避免影响旧存档迁移。金币发放按 earnedTotal 差额结算：
// 重复提交同一状态不会重复入账，负数差额即扣费（扩建 / 淬炼）。
// 注意：钓鱼金币由 settle() 直接发放、不进 earnedTotal（避免双重发币）；
//       earnedTotal 只记洞天内部收支（悬赏 / 淬炼 / 扩建 / 灵契 / 更多玩法）。
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
  // earnedTotal 是「洞天内部累计结算净值」：悬赏/更多玩法奖励为正、
  // 淬炼/扩建/灵契消费为负；钓鱼金币不在此列（由 settle 直接发）。
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
    },
    // 仙钓道途 · 灵契（惰性挂载，沿用洞天 feature 存档）
    spiritBonds: normalizeBonds(s.spiritBonds),
    // 更多玩法（无尽塔 / 灵脉 / 轮回 / 战令），惰性挂载、无 DB 迁移
    advance: normalizeAdvance(s.advance)
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
 * 注意：钓获金币已由 settle() 直接发放到 user.shells，
 *       因此这里【不再】把 coins 累加进 earnedTotal，否则会双重发币。
 *       earnedTotal 只承载「洞天内部收支」：悬赏奖励 / 淬炼 / 扩建 /
 *       灵契 / 更多玩法的金币差额（见 claimBounty / forgeUp / adv*）。
 * 返回：新的规范化状态（earnedTotal 保持不变）。
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

  // 灵池：钓获入账（成功钓起才凝聚灵气）；灵池扩建等级提升凝聚倍率
  if (landed) {
    const qiMul = poolQiMul(st.spiritBonds.poolLevel)
    const gain = Math.max(1, Math.round((weight * 0.02 + coins * 0.01) * qiMul))
    st.pool += gain
    if (st.bounty.tiers[tier] != null) st.bounty.tiers[tier] += 1
    st.bounty.weight += weight
    st.bounty.catches += 1
    st.stats.landed += 1
    st.stats.maxWeight = Math.max(st.stats.maxWeight, weight)
    st.stats.byTier[tier] = (Number(st.stats.byTier[tier]) || 0) + 1
  }
  st.stats.totalCatch += 1

  // 钓获金币不走 earnedTotal：settle() 已直接发放，重复计入会导致双重发币。
  // earnedTotal 仅记录洞天内部收支（悬赏奖励、淬炼/扩建/灵契/更多玩法消费）。
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

// ============================================================
//  仙钓道途 · 灵契操作（扣灵气 = 减 pool；扣金币 = 减 earnedTotal 负差额）
//  返回新 state（规范化）；不可操作时返回 null。
//  codex 为已解锁鱼名数组，用于「必须先钓到才能结契」校验。
// ============================================================

/** 结契一条已钓到的鱼 */
export function bondContract(state, fishName, codex) {
  const st = normalizeFeature(state)
  const caught = Array.isArray(codex) ? codex : []
  if (!fishName || !caught.includes(fishName)) return null // 必须先钓到
  const cost = contractFish(st.spiritBonds, fishName, st.pool, Number.MAX_SAFE_INTEGER)
  if (!cost) return null
  st.spiritBonds = normalizeBonds(cost)
  st.pool -= cost._cost.qi
  st.earnedTotal -= cost._cost.coins // 金币差额由 save 层结算
  return st
}

/** 升星 */
export function bondStarUp(state, fishName) {
  const st = normalizeFeature(state)
  const up = starUpFish(st.spiritBonds, fishName, st.pool, Number.MAX_SAFE_INTEGER)
  if (!up) return null
  st.spiritBonds = normalizeBonds(up)
  st.pool -= up._cost.qi
  st.earnedTotal -= up._cost.coins
  return st
}

/** 上阵 / 下阵 */
export function bondToggleActive(state, fishName) {
  const st = normalizeFeature(state)
  const next = toggleActive(st.spiritBonds, fishName)
  if (!next) return null
  st.spiritBonds = normalizeBonds(next)
  return st
}

/** 扩展出战位 */
export function bondExpandSlots(state) {
  const st = normalizeFeature(state)
  const next = expandSlots(st.spiritBonds, Number.MAX_SAFE_INTEGER)
  if (!next) return null
  st.spiritBonds = normalizeBonds(next)
  st.earnedTotal -= next._cost.coins
  return st
}

/** 灵池扩建 */
export function bondUpgradePool(state) {
  const st = normalizeFeature(state)
  const next = upgradePool(st.spiritBonds, Number.MAX_SAFE_INTEGER)
  if (!next) return null
  st.spiritBonds = normalizeBonds(next)
  st.earnedTotal -= next._cost.coins
  return st
}

/** 读取某鱼种品级（供 UI 展示） */
export function fishTierOf(name) {
  return FISH_TIER.get(name) || null
}

// ============================================================
//  更多玩法操作（无尽塔 / 灵脉 / 轮回 / 战令）
//  advance 子模块返回 { next, coins, qi, msg }，这里把 coins 折进
//  earnedTotal（差额结算金币）、qi 折进 pool；返回新 state（规范化）。
//  opts 由调用方透传（power / now / rng / bought / type / id）。
// ============================================================
function applyAdvanceOp(state, op) {
  if (!op) return null
  const st = normalizeFeature(state)
  st.advance = op.next
  st.earnedTotal += op.coins || 0
  st.pool = Math.max(0, st.pool + (op.qi || 0))
  return st
}

/** 无尽塔挑战 */
export function advAbyssChallenge(state, opts) {
  return applyAdvanceOp(state, abyssChallenge(state && state.advance, opts))
}
/** 购买精力 */
export function advBuyStamina(state, opts) {
  return applyAdvanceOp(state, buyStamina(state && state.advance, opts))
}
/** 收取灵脉 */
export function advCollectVein(state, now) {
  return applyAdvanceOp(state, collectVein(state && state.advance, now))
}
/** 升级灵脉 */
export function advUpgradeVein(state, now) {
  return applyAdvanceOp(state, upgradeVein(state && state.advance, now))
}
/** 轮回 */
export function advReincarnate(state, now) {
  return applyAdvanceOp(state, reincarnate(state && state.advance, now))
}
/** 分配道印 */
export function advAllocateSeal(state, type, now) {
  return applyAdvanceOp(state, allocateSeal(state && state.advance, type, now))
}
/** 战令每日任务领奖 */
export function advClaimPassDaily(state, id, now) {
  return applyAdvanceOp(state, claimPassDaily(state && state.advance, id, now))
}
/** 仅推进灵脉结算（不改金币/灵气），用于进入页面时刷新累积量 */
export function advSettleVein(state, now) {
  const st = normalizeFeature(state)
  st.advance = settleVein(state && state.advance, now)
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
  forgeCost, poolExpandCost, applyCatch, claimBounty, forgeUp,
  bondContract, bondStarUp, bondToggleActive, bondExpandSlots, bondUpgradePool, fishTierOf,
  advAbyssChallenge, advBuyStamina, advCollectVein, advUpgradeVein,
  advReincarnate, advAllocateSeal, advClaimPassDaily, advSettleVein
}
