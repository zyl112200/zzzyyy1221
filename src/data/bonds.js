// 仙钓道途 · 灵契系统（Node 安全，无任何 PNG / import.meta 依赖）
// ---------------------------------------------------------------
// 长期养成主线：把图鉴里钓到过的灵鱼「结契」为道途灵契，用灵池灵气 + 金币
// 将其升星（1~10 星），挑选有限出战位搭配，获得永久被动加成。
// 另含「图鉴大成」（集齐品级 / 地图专属）与「灵池扩建」（提升灵气凝聚）。
//
// 状态挂在 user.feature.spiritBonds 上（沿用洞天 feature JSON 存档，无 DB 迁移）：
//   spiritBonds = {
//     owned:   { [fishName]: star },        // 已结契灵契的星级 1~10
//     active:  [fishName, ...],             // 出战灵契名字列表（≤ slots）
//     slots:   number,                      // 出战位数（默认 2，可扩到 5）
//     poolLevel: number                     // 灵池扩建等级 0~10
//   }
//
// 加成对象与 forgeBonus 同构：{ rareBoost, weightMul, coinMul, tensionMul }
// 由前端计算后作为 bondFx 传给 castApi，本地引擎与后端同构 clamp 后生效。

export const MAX_STAR = 10
export const BASE_SLOTS = 2
export const MAX_SLOTS = 5
export const MAX_POOL_LEVEL = 10

/** 品级配置：base 加成（每星线性增长）与结契门槛 */
export const BOND_TIERS = {
  COMMON:     { code: 'COMMON',     label: '凡', color: '#b0bec5', perStar: { rareBoost: 0.0015, weightMul: 0.004, coinMul: 0.006, tensionMul: -0.003 }, contractQi: 20,  contractCoins: 300 },
  RARE:       { code: 'RARE',       label: '灵', color: '#66bb6a', perStar: { rareBoost: 0.0025, weightMul: 0.008, coinMul: 0.012, tensionMul: -0.005 }, contractQi: 80,  contractCoins: 900 },
  LEGENDARY:  { code: 'LEGENDARY',  label: '宝', color: '#29b6f6', perStar: { rareBoost: 0.004,  weightMul: 0.014, coinMul: 0.022, tensionMul: -0.008 }, contractQi: 300, contractCoins: 3000 },
  MYTHIC:     { code: 'MYTHIC',     label: '仙', color: '#ab47bc', perStar: { rareBoost: 0.006,  weightMul: 0.022, coinMul: 0.038, tensionMul: -0.012 }, contractQi: 900, contractCoins: 9000 },
  SHANHAI:    { code: 'SHANHAI',    label: '神', color: '#ffa726', perStar: { rareBoost: 0.009,  weightMul: 0.035, coinMul: 0.060, tensionMul: -0.018 }, contractQi: 2500, contractCoins: 30000 },
  EXCLUSIVE:  { code: 'EXCLUSIVE',  label: '域', color: '#ff7043', perStar: { rareBoost: 0.005,  weightMul: 0.018, coinMul: 0.030, tensionMul: -0.010 }, contractQi: 600, contractCoins: 6000 }
}
export const TIER_ORDER = ['COMMON', 'RARE', 'LEGENDARY', 'MYTHIC', 'SHANHAI', 'EXCLUSIVE']

/** Node 安全的内联鱼种目录（名称 → 品级），与 localEngine.POOLS / 图鉴 40 种完全一致 */
const FISH_BY_TIER = {
  COMMON: ['小丑鱼', '热带鱼', '河豚', '沙丁鱼', '鲭鱼'],
  RARE: ['章鱼', '鱿鱼', '帝王蟹', '巨型石斑', '电鳗'],
  LEGENDARY: ['深海龙鱼', '独角鲸', '黄金海马', '大王乌贼', '幽灵鲨'],
  MYTHIC: ['鲲', '烛龙', '九尾狐', '白泽', '凤凰', '麒麟'],
  SHANHAI: ['鲲鹏', '饕餮', '穷奇', '相柳', '玄武', '应龙', '巴蛇', '陵鱼', '帝江', '狰'],
  EXCLUSIVE: ['冰原王鲑', '玄冰巨鲲', '雪峰飞鲤', '幽冥龙王', '九幽冥鲛', '蓬莱金鳌', '寒渊烛龙', '冰魄银鳗', '霜甲巨蟹', '极光锦鲤']
}

/** 名称 → 品级 映射 */
export const FISH_TIER = (() => {
  const m = new Map()
  for (const tier of TIER_ORDER) for (const name of FISH_BY_TIER[tier]) m.set(name, tier)
  return m
})()

/** 全部可结契鱼种（扁平，含 name / tier） */
export const BOND_CATALOG = TIER_ORDER.flatMap((tier) =>
  FISH_BY_TIER[tier].map((name) => ({ name, tier, label: BOND_TIERS[tier].label, color: BOND_TIERS[tier].color }))
)

/**
 * 图鉴大成：集齐某组给予永久加成。
 * 注意：bonus 采用「倍率/加量」语义，与 forgeBonus / bondBonusOf 一致——
 *   rareBoost 为概率加量（0.02 = +2%），其余为乘区倍率（1.02 = +2%，张力 <1 更稳）。
 * mergeFx 会按此语义合并，切勿写成 0.02 的倍率（那会让收益暴跌到 2%）。
 */
export const CODEX_MASTERY = [
  { id: 'm_common', name: '凡鳞大成', desc: '集齐全部 5 种普通灵鱼', tier: 'COMMON', need: 5, bonus: { rareBoost: 0.004, weightMul: 1.01, coinMul: 1.02, tensionMul: 1 } },
  { id: 'm_rare', name: '灵族大成', desc: '集齐全部 5 种稀有灵鱼', tier: 'RARE', need: 5, bonus: { rareBoost: 0.006, weightMul: 1.02, coinMul: 1.04, tensionMul: 1 } },
  { id: 'm_legend', name: '传说大成', desc: '集齐全部 5 种传说灵鱼', tier: 'LEGENDARY', need: 5, bonus: { rareBoost: 0.01, weightMul: 1.03, coinMul: 1.06, tensionMul: 0.99 } },
  { id: 'm_mythic', name: '仙灵大成', desc: '集齐全部 6 种神话灵鱼', tier: 'MYTHIC', need: 6, bonus: { rareBoost: 0.015, weightMul: 1.05, coinMul: 1.10, tensionMul: 0.98 } },
  { id: 'm_shanhai', name: '山海大成', desc: '集齐全部 10 种山海异兽', tier: 'SHANHAI', need: 10, bonus: { rareBoost: 0.025, weightMul: 1.08, coinMul: 1.18, tensionMul: 0.97 } },
  { id: 'm_exclusive', name: '八荒行旅', desc: '集齐全部 10 种地图专属鱼', tier: 'EXCLUSIVE', need: 10, bonus: { rareBoost: 0.02, weightMul: 1.06, coinMul: 1.12, tensionMul: 0.98 } }
]

// ---------------- 规范化 / 查询 ----------------

/** 灵契状态规范化（安全默认值） */
export function normalizeBonds(raw) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const owned = {}
  if (s.owned && typeof s.owned === 'object') {
    for (const [name, star] of Object.entries(s.owned)) {
      if (!FISH_TIER.has(name)) continue
      const st = clampInt(star, 1, MAX_STAR)
      if (st > 0) owned[name] = st
    }
  }
  const slots = clampInt(s.slots, BASE_SLOTS, MAX_SLOTS)
  const active = []
  if (Array.isArray(s.active)) {
    for (const name of s.active) {
      if (owned[name] != null && !active.includes(name) && active.length < slots) active.push(name)
    }
  }
  return {
    owned,
    active,
    slots,
    poolLevel: clampInt(s.poolLevel, 0, MAX_POOL_LEVEL)
  }
}

/** 结契成本：{ qi, coins } */
export function contractCost(tier) {
  const t = BOND_TIERS[tier] || BOND_TIERS.COMMON
  return { qi: t.contractQi, coins: t.contractCoins }
}

/** 升星成本：第 star 星 → star+1 星 所需（按品级与当前星级递增） */
export function starUpCost(tier, currentStar) {
  const t = BOND_TIERS[tier] || BOND_TIERS.COMMON
  const s = clampInt(currentStar, 1, MAX_STAR - 1)
  const mult = Math.pow(1.55, Math.max(0, s - 1))
  return {
    qi: Math.round(t.contractQi * 0.6 * mult) + 10,
    coins: Math.round(t.contractCoins * 0.5 * mult) + 100
  }
}

/** 出战位扩展成本（当前 slots → slots+1） */
export function slotExpandCost(currentSlots) {
  const s = clampInt(currentSlots, BASE_SLOTS, MAX_SLOTS - 1)
  return Math.round(5000 * Math.pow(2.4, s - BASE_SLOTS))
}

/** 灵池扩建成本（当前等级 → +1） */
export function poolUpgradeCost(currentLevel) {
  const lv = clampInt(currentLevel, 0, MAX_POOL_LEVEL - 1)
  return Math.round(400 * Math.pow(1.7, lv))
}

/** 灵池灵气凝聚倍率：每级 +25% */
export function poolQiMul(poolLevel) {
  return round3(1 + clampInt(poolLevel, 0, MAX_POOL_LEVEL) * 0.25)
}

/** 单只灵契在某星级的加成 */
export function bondBonusOf(tier, star) {
  const t = BOND_TIERS[tier] || BOND_TIERS.COMMON
  const s = clampInt(star, 0, MAX_STAR)
  return {
    rareBoost: round5(t.perStar.rareBoost * s),
    weightMul: round4(1 + t.perStar.weightMul * s),
    coinMul: round4(1 + t.perStar.coinMul * s),
    tensionMul: round4(1 + t.perStar.tensionMul * s)
  }
}

const ZERO_FX = { rareBoost: 0, weightMul: 1, coinMul: 1, tensionMul: 1 }

/** 合并多组加成（乘区相乘、加区相加） */
function mergeFx(list) {
  const out = { rareBoost: 0, weightMul: 1, coinMul: 1, tensionMul: 1 }
  for (const fx of list) {
    if (!fx) continue
    out.rareBoost += Number(fx.rareBoost) || 0
    out.weightMul *= Number(fx.weightMul) || 1
    out.coinMul *= Number(fx.coinMul) || 1
    out.tensionMul *= Number(fx.tensionMul) || 1
  }
  return {
    rareBoost: round5(Math.min(0.5, out.rareBoost)), // 上限 50% 稀有机会
    weightMul: round4(Math.min(3, out.weightMul)),
    coinMul: round4(Math.min(5, out.coinMul)),
    tensionMul: round4(Math.max(0.5, out.tensionMul))
  }
}

/** 出战灵契加成（仅 active 列表生效） */
export function activeBondFx(bondsRaw) {
  const b = normalizeBonds(bondsRaw)
  const fx = []
  for (const name of b.active) {
    const star = b.owned[name]
    if (star != null) fx.push(bondBonusOf(FISH_TIER.get(name), star))
  }
  return mergeFx(fx)
}

/** 某玩家已达成的大成项（codex 为鱼名数组） */
export function masteredCodex(codex) {
  const set = new Set(Array.isArray(codex) ? codex : [])
  return CODEX_MASTERY.filter((m) => {
    const group = FISH_BY_TIER[m.tier] || []
    return group.every((name) => set.has(name))
  })
}

/** 图鉴大成加成 */
export function codexMasteryFx(codex) {
  return mergeFx(masteredCodex(codex).map((m) => m.bonus))
}

/**
 * 汇总 bondFx：出战灵契 + 图鉴大成（传给 castApi 的 bondFx 参数）。
 * featureState 用于读 spiritBonds；codex 为鱼名数组。
 */
export function totalBondFx(featureState, codex) {
  const bonds = featureState && featureState.spiritBonds
  return mergeFx([activeBondFx(bonds), codexMasteryFx(codex)])
}

// ---------------- 状态变更（返回新 spiritBonds，null 表示不可操作） ----------------

/** 结契一条已钓到的鱼 */
export function contractFish(bondsRaw, fishName, qi, coins) {
  const b = normalizeBonds(bondsRaw)
  const tier = FISH_TIER.get(fishName)
  if (!tier || b.owned[fishName] != null) return null
  const cost = contractCost(tier)
  if (qi < cost.qi || coins < cost.coins) return null
  b.owned[fishName] = 1
  b._cost = cost // 调用方据此扣 qi / coins
  return b
}

/** 升星 */
export function starUpFish(bondsRaw, fishName, qi, coins) {
  const b = normalizeBonds(bondsRaw)
  const tier = FISH_TIER.get(fishName)
  const cur = b.owned[fishName]
  if (!tier || cur == null || cur >= MAX_STAR) return null
  const cost = starUpCost(tier, cur)
  if (qi < cost.qi || coins < cost.coins) return null
  b.owned[fishName] = cur + 1
  b._cost = cost
  return b
}

/** 上阵 / 下阵（返回新 active 列表，null 表示不可） */
export function toggleActive(bondsRaw, fishName) {
  const b = normalizeBonds(bondsRaw)
  if (b.owned[fishName] == null) return null
  if (b.active.includes(fishName)) {
    b.active = b.active.filter((n) => n !== fishName)
    return b
  }
  if (b.active.length >= b.slots) return null
  b.active.push(fishName)
  return b
}

/** 扩展出战位 */
export function expandSlots(bondsRaw, coins) {
  const b = normalizeBonds(bondsRaw)
  if (b.slots >= MAX_SLOTS) return null
  const cost = slotExpandCost(b.slots)
  if (coins < cost) return null
  b.slots += 1
  b._cost = { coins: cost }
  return b
}

/** 灵池扩建 */
export function upgradePool(bondsRaw, coins) {
  const b = normalizeBonds(bondsRaw)
  if (b.poolLevel >= MAX_POOL_LEVEL) return null
  const cost = poolUpgradeCost(b.poolLevel)
  if (coins < cost) return null
  b.poolLevel += 1
  b._cost = { coins: cost }
  return b
}

// ---------------- utils ----------------
function clampInt(v, min, max) {
  const n = Math.round(Number(v) || 0)
  return Math.min(max, Math.max(min, n))
}
function round5(n) { return Math.round((Number(n) || 0) * 100000) / 100000 }
function round4(n) { return Math.round((Number(n) || 0) * 10000) / 10000 }
function round3(n) { return Math.round((Number(n) || 0) * 1000) / 1000 }

export default {
  MAX_STAR, BASE_SLOTS, MAX_SLOTS, MAX_POOL_LEVEL, BOND_TIERS, TIER_ORDER,
  FISH_TIER, BOND_CATALOG, CODEX_MASTERY, normalizeBonds, contractCost,
  starUpCost, slotExpandCost, poolUpgradeCost, poolQiMul, bondBonusOf,
  activeBondFx, masteredCodex, codexMasteryFx, totalBondFx,
  contractFish, starUpFish, toggleActive, expandSlots, upgradePool
}
