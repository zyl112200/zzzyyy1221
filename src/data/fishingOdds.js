/**
 * 钓鱼概率预估
 * ---------------------------------------------------------------
 * 精确复刻「在线后端 GameService.cast」的抽取算法，让首页钓况面板显示的
 * 品质概率与实际抛竿结果一致。后端逻辑见：
 *   backend/src/main/java/com/bikinibottom/service/GameService.java
 *
 * 后端 cast 的关键路径：
 *   1) exRate = 地图专属鱼概率 + 高级饵 0.05 + 幸运物 0.05（上限 1）
 *   2) random < exRate → 专属鱼：
 *        mul = exMin + random × (exMax - exMin)
 *        weight = 圆整(力量 × mul)，再被装备上限 maxCatch 截断
 *        tier  = tierByMul(weight / 力量)   ← 按「重量/力量倍数」分段
 *   3) 否则 → 普通鱼：tier = pickTier(...)  ← 按权重轮盘抽取
 *        · 装备承重够不到（minW > maxCatch）的品级直接排除
 *        · 权重 = catch_rate 表值（缺省为内置默认）
 *        · 非普通品级再乘 luckFactor × skillLuck
 *            luckFactor = 1 + 钓力×0.12 + 幸运×0.5 + 高级饵×0.35
 *            skillLuck  = 观水诀 1.6 : 1.0
 *
 * 在线版的 catch_rate 表默认 60/24/10/4/1；前端后台改的爆率只存浏览器、
 * 并不同步后端，故在线版实际爆率恒为该默认值（可用 dropRates 参数覆盖）。
 */

/** 与后端 TIERS 保持一致（minW/maxW 用于重量区间，baseWeight 为缺省爆率权重） */
export const TIERS = {
  COMMON: { code: 'COMMON', label: '普通', minW: 0.5, maxW: 8, baseWeight: 60 },
  RARE: { code: 'RARE', label: '稀有', minW: 15, maxW: 300, baseWeight: 24 },
  LEGENDARY: { code: 'LEGENDARY', label: '传说', minW: 300, maxW: 8000, baseWeight: 10 },
  MYTHIC: { code: 'MYTHIC', label: '神话', minW: 5000, maxW: 120000, baseWeight: 4 },
  SHANHAI: { code: 'SHANHAI', label: '山海', minW: 20000, maxW: 1000000, baseWeight: 1 }
}
export const TIER_ORDER = ['COMMON', 'RARE', 'LEGENDARY', 'MYTHIC', 'SHANHAI']
export const DEFAULT_DROP_RATES = { COMMON: 60, RARE: 24, LEGENDARY: 10, MYTHIC: 4, SHANHAI: 1 }

const GUANSHUI_BOOST = 1.6

/** tierByMul 分段（mul 上界，不含），与后端一致 */
const MUL_SEGMENTS = [
  { code: 'COMMON', lo: -Infinity, hi: 1 },
  { code: 'RARE', lo: 1, hi: 1.5 },
  { code: 'LEGENDARY', lo: 1.5, hi: 5 },
  { code: 'MYTHIC', lo: 5, hi: 20 },
  { code: 'SHANHAI', lo: 20, hi: Infinity }
]

const emptyTierProbs = () => ({ COMMON: 0, RARE: 0, LEGENDARY: 0, MYTHIC: 0, SHANHAI: 0 })

function tierOfMul(m) {
  if (m < 1) return 'COMMON'
  if (m < 1.5) return 'RARE'
  if (m < 5) return 'LEGENDARY'
  if (m < 20) return 'MYTHIC'
  return 'SHANHAI'
}

/**
 * 专属鱼内部各品级概率。
 * mul ~ U(lo, hi)，有效倍数 mulEff = min(mul, cap)，cap = maxCatch / 力量。
 * 超出 cap 的部分重量被截断到 maxCatch，形成落在 cap 所在品级的点质量。
 */
function exclusiveTierProbs(exMin, exMax, cap) {
  const out = emptyTierProbs()
  const lo = Math.min(exMin, exMax)
  const hi = Math.max(exMin, exMax)

  if (hi <= lo) {
    out[tierOfMul(Math.min(lo, cap))] = 1
    return out
  }

  const capEff = Math.max(0, cap)
  if (capEff >= hi) {
    // 装备足够强，专属鱼不会被截断：倍数在 [lo, hi] 均匀分布
    const span = hi - lo
    for (const seg of MUL_SEGMENTS) {
      const a = Math.max(lo, seg.lo)
      const b = Math.min(hi, seg.hi)
      if (b > a) out[seg.code] += (b - a) / span
    }
  } else if (capEff > lo) {
    // 部分截断：[lo, capEff] 均匀 + (capEff, hi] 折叠到 capEff 所在品级
    const span = hi - lo
    const contMass = (capEff - lo) / span
    for (const seg of MUL_SEGMENTS) {
      const a = Math.max(lo, seg.lo)
      const b = Math.min(capEff, seg.hi)
      if (b > a) out[seg.code] += contMass * ((b - a) / (capEff - lo))
    }
    out[tierOfMul(capEff)] += (hi - capEff) / span
  } else {
    // 装备上限极低，所有专属鱼都被截断到 capEff
    out[tierOfMul(capEff)] = 1
  }
  return out
}

/** 普通鱼 pickTier：按权重轮盘抽取的各品级概率 */
function normalTierProbs({ maxCatch, rodPower, luck, premium, guanshui, dropRates }) {
  const luckFactor = 1 + rodPower * 0.12 + (luck ? 0.5 : 0) + (premium ? 0.35 : 0)
  const skillLuck = guanshui ? GUANSHUI_BOOST : 1.0
  const weights = {}
  let total = 0
  for (const code of TIER_ORDER) {
    const t = TIERS[code]
    if (t.minW > maxCatch) continue // 装备承重根本够不到这个品级
    let base = dropRates[code] != null ? Number(dropRates[code]) : t.baseWeight
    if (!isFinite(base) || base < 0) base = t.baseWeight
    if (code !== 'COMMON') base *= luckFactor * skillLuck
    weights[code] = base
    total += base
  }
  const out = emptyTierProbs()
  for (const code of TIER_ORDER) {
    out[code] = total > 0 ? (weights[code] || 0) / total : 0
  }
  return out
}

const round1 = (v) => Math.round(v * 10) / 10

/**
 * 计算当前配置下各品质概率与可钓重量区间。
 * @param {object} opts
 * @param {number} opts.strength   力量（专属鱼重量基数，后端 = 根骨）
 * @param {number} opts.maxCatch   装备可钓重量上限（斤）
 * @param {number} opts.rodPower   已装备钓竿钓力
 * @param {boolean} opts.luck      是否拥有幸运物
 * @param {boolean} opts.premium   当前鱼饵是否高级饵（power > 0）
 * @param {boolean} opts.guanshui  是否修炼观水诀
 * @param {number} opts.exBaseRate 当前地图专属鱼基础概率（0~1）
 * @param {number} opts.exMin      当前地图专属鱼倍数下限
 * @param {number} opts.exMax      当前地图专属鱼倍数上限
 * @param {object} opts.dropRates  爆率权重表（在线版用默认值）
 */
export function calcFishingOdds(opts = {}) {
  const {
    strength = 100,
    maxCatch = 800,
    rodPower = 0,
    luck = false,
    premium = false,
    guanshui = false,
    exBaseRate = 0,
    exMin = 1,
    exMax = 1,
    dropRates = DEFAULT_DROP_RATES
  } = opts

  const s = Math.max(1, Number(strength) || 100)
  const cap = Math.max(1, Number(maxCatch) || 800)

  // 专属鱼现身率：地图基础 + 高级饵/幸运各 +5%（上限 100%）
  let exRate = Math.min(1, Math.max(0, Number(exBaseRate) || 0))
  if (premium) exRate = Math.min(1, exRate + 0.05)
  if (luck) exRate = Math.min(1, exRate + 0.05)

  const capMul = cap / s
  const ex = exclusiveTierProbs(Number(exMin) || 1, Number(exMax) || 1, capMul)
  const normal = normalTierProbs({
    maxCatch: cap,
    rodPower: Number(rodPower) || 0,
    luck: !!luck,
    premium: !!premium,
    guanshui: !!guanshui,
    dropRates
  })

  const tiers = TIER_ORDER.map((code) => {
    const t = TIERS[code]
    return {
      code,
      label: t.label,
      prob: exRate * ex[code] + (1 - exRate) * normal[code],
      exProb: ex[code],
      normalProb: normal[code],
      weightMin: round1(Math.min(t.minW, cap)),
      weightMax: round1(Math.min(t.maxW, cap))
    }
  })

  return {
    strength: s,
    maxCatch: cap,
    rodPower: Number(rodPower) || 0,
    luck: !!luck,
    premium: !!premium,
    guanshui: !!guanshui,
    exRate,
    exBaseRate: Math.min(1, Math.max(0, Number(exBaseRate) || 0)),
    tiers,
    exclusiveWeight: {
      min: round1(Math.min(s * (Number(exMin) || 1), cap)),
      max: round1(Math.min(s * (Number(exMax) || 1), cap))
    },
    normal,
    exclusive: ex
  }
}
