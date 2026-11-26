// 仙钓大陆 · 更多玩法数据层（Node 安全：无 PNG / DOM / import.meta 依赖）
// -------------------------------------------------------------------
// 四大长期养成玩法：无尽塔 / 灵脉 / 轮回 / 战令，全部挂在
// user.feature.advance 下（沿用洞天 feature JSON 存档，无数据库迁移）。
//
// 资源结算约定：
//   · 金币：通过 feature.earnedTotal 差额结算（正=发放，负=扣费）
//   · 灵气：通过 feature.pool 结算
//   · 道韵 / 战令经验 / 道印 / 精力：advance 内部资源，不额外走金币通道
// 操作函数统一返回 { next, coins, qi, msg }（不可操作返回 null），
// 由 feature.js 的 wrapper 负责把 coins/qi 折算进 earnedTotal / pool。
//
// 永久加成汇总 advanceFx(featureState) 返回与 bondFx 同构的
// { rareBoost, weightMul, coinMul, tensionMul }，前端合并进 bondFx 传给
// castApi，本地引擎与后端同构 clamp 后生效。

export const ABYSS_MAX_STAMINA = 10
export const VEIN_MAX_LEVEL = 30
export const VEIN_CAP_HOURS = 12
export const PASS_MAX_LEVEL = 50
export const SEAL_TYPES = ['coin', 'rare', 'weight', 'tension']

export const SEAL_META = {
  coin: { name: '聚宝道印', icon: '🪙', desc: '金币收益 +3% / 级' },
  rare: { name: '寻珍道印', icon: '✨', desc: '稀有几率 +0.4% / 级' },
  weight: { name: '擎天道印', icon: '🐋', desc: '鱼重倍率 +2% / 级' },
  tension: { name: '定风波印', icon: '🛡', desc: '张力倍率 -1% / 级（更稳）' }
}

// 战令每日任务模板（key 对应 advance.pass.daily）
export const PASS_DAILY = [
  { id: 'catchFish', name: '钓起 10 条灵鱼', need: 10, exp: 60, coins: 400 },
  { id: 'abyssWins', name: '通关无尽塔 3 层', need: 3, exp: 80, coins: 600 },
  { id: 'collectVein', name: '收取灵脉 1 次', need: 1, exp: 40, coins: 300 }
]

function pad(n) { return String(n).padStart(2, '0') }
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, Number(v) || 0)) }
function clampInt(v, lo, hi) { return Math.round(clamp(v, lo, hi)) }
function round(n, p = 4) { const m = Math.pow(10, p); return Math.round((Number(n) || 0) * m) / m }

/** 状态规范化：所有字段都有安全默认值 */
export function normalizeAdvance(raw, now = Date.now()) {
  const s = raw && typeof raw === 'object' ? raw : {}
  const today = todayKey(new Date(now))

  // ---- 无尽塔 ----
  const ab = s.abyss && typeof s.abyss === 'object' ? s.abyss : {}
  const abyssDate = ab.date === today ? today : today
  let floor = clampInt(ab.floor, 0, 1e7)
  let stamina = clampInt(ab.stamina, 0, ABYSS_MAX_STAMINA)
  let attempts = clampInt(ab.attempts, 0, 1e6)
  if (ab.date !== today) { stamina = ABYSS_MAX_STAMINA; attempts = 0 }

  // ---- 灵脉 ----
  const vn = s.vein && typeof s.vein === 'object' ? s.vein : {}
  let lastTick = Number(vn.lastTick)
  if (!Number.isFinite(lastTick) || lastTick > now) lastTick = now
  const vein = {
    level: clampInt(vn.level, 1, VEIN_MAX_LEVEL),
    accumulated: Math.max(0, Number(vn.accumulated) || 0),
    accumulatedQi: Math.max(0, Number(vn.accumulatedQi) || 0),
    lastTick,
    lastCollect: Number(vn.lastCollect) || 0,
    totalCollected: Math.max(0, Number(vn.totalCollected) || 0)
  }

  // ---- 轮回 / 道印 ----
  const rc = s.reincarnation && typeof s.reincarnation === 'object' ? s.reincarnation : {}
  const seals = {}
  for (const k of SEAL_TYPES) seals[k] = clampInt(rc.seals && rc.seals[k], 0, 1e6)
  const reincarnation = {
    cycle: clampInt(rc.cycle, 0, 1e6),
    daoYun: Math.max(0, Number(rc.daoYun) || 0),
    pendingSeals: clampInt(rc.pendingSeals, 0, 1e6),
    seals,
    totalDaoYun: Math.max(0, Number(rc.totalDaoYun) || 0)
  }

  // ---- 战令 ----
  const ps = s.pass && typeof s.pass === 'object' ? s.pass : {}
  const daily = { catchFish: 0, abyssWins: 0, collectVein: 0 }
  if (ps.date === today && ps.daily && typeof ps.daily === 'object') {
    for (const k of Object.keys(daily)) daily[k] = clampInt(ps.daily[k], 0, 1e6)
  }
  const pass = {
    exp: Math.max(0, Number(ps.exp) || 0),
    level: clampInt(ps.level, 1, PASS_MAX_LEVEL),
    date: today,
    daily,
    dailyClaimed: Array.isArray(ps.dailyClaimed) && ps.date === today
      ? ps.dailyClaimed.filter((x) => typeof x === 'string') : []
  }

  return {
    version: 1,
    abyss: { floor, best: Math.max(floor, clampInt(ab.best, 0, 1e7)), attempts, stamina, date: abyssDate },
    vein,
    reincarnation,
    pass
  }
}

// ============================================================
//  加成（乘区相乘、加区相加；数值温和， clothed 由 cast 端统一 clamp）
// ============================================================
const ZERO_FX = { rareBoost: 0, weightMul: 1, coinMul: 1, tensionMul: 1 }

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
    rareBoost: round(Math.min(0.5, out.rareBoost), 5),
    weightMul: round(Math.min(3, out.weightMul)),
    coinMul: round(Math.min(5, out.coinMul)),
    tensionMul: round(Math.max(0.5, out.tensionMul))
  }
}

/** 无尽塔层数加成：每 10 层 +2% 金币 / +0.5% 鱼重 */
export function abyssFx(advance) {
  const a = advance && advance.abyss
  const tiers = a ? Math.floor(clampInt(a.floor, 0, 1e7) / 10) : 0
  return mergeFx([{ rareBoost: 0, weightMul: 1 + tiers * 0.005, coinMul: 1 + tiers * 0.02, tensionMul: 1 }])
}

/** 轮回道印加成 */
export function sealFx(advance) {
  const rc = advance && advance.reincarnation
  const s = rc && rc.seals ? rc.seals : {}
  return mergeFx([{
    rareBoost: (clampInt(s.rare, 0, 1e6)) * 0.004,
    weightMul: 1 + (clampInt(s.weight, 0, 1e6)) * 0.02,
    coinMul: 1 + (clampInt(s.coin, 0, 1e6)) * 0.03,
    tensionMul: 1 - (clampInt(s.tension, 0, 1e6)) * 0.01
  }])
}

/** 战令里程碑加成：每 5 级各 +1% */
export function passFx(advance) {
  const p = advance && advance.pass
  const tiers = p ? Math.floor(clampInt(p.level, 1, PASS_MAX_LEVEL) / 5) : 0
  return mergeFx([{ rareBoost: tiers * 0.001, weightMul: 1 + tiers * 0.01, coinMul: 1 + tiers * 0.01, tensionMul: 1 - tiers * 0.001 }])
}

/** 汇总「更多玩法」全部永久加成（与 bondFx 同构） */
export function advanceFx(featureState) {
  const adv = featureState && featureState.advance
  return mergeFx([abyssFx(adv), sealFx(adv), passFx(adv)])
}

// ============================================================
//  通用：合并两组 bondFx 同构加成（供 HomeView 把 advanceFx 并入 bondFx）
// ============================================================
export function mergeBondFx(a, b) { return mergeFx([a, b]) }

// ============================================================
//  无尽塔
// ============================================================
/** 第 floor+1 层敌人战力（指数增长，体现「肝」） */
export function abyssEnemyPower(floor) {
  return Math.round(100 * Math.pow(1.13, Math.max(0, floor)))
}
/** 挑战成功率（战力检定） */
export function abyssWinRate(power, floor) {
  const ep = abyssEnemyPower(floor)
  const p = Math.max(1, Number(power) || 1)
  return round(clamp(p / (p + ep * 0.8), 0.08, 0.96), 4)
}
/** 通关一层奖励：金币 + 道韵 */
export function abyssReward(floor) {
  const f = Math.max(0, floor)
  const coins = Math.round(80 * Math.pow(f + 1, 1.25))
  let daoYun = 8 + f * 2
  const milestone = (f + 1) % 10 === 0
  if (milestone) return { coins: coins * 5, daoYun: daoYun * 10, milestone: true }
  return { coins, daoYun, milestone: false }
}
/** 精力购买成本（按已购次数递增；每日次数可用 10 - stamina 近似） */
export function staminaCost(bought) {
  return Math.round(300 * Math.pow(1.8, Math.max(0, bought)))
}

/** 挑战无尽塔：opts = { power, now, rng } */
export function abyssChallenge(advance, opts = {}) {
  const now = opts.now == null ? Date.now() : Number(opts.now)
  const st = normalizeAdvance(advance, now)
  const a = st.abyss
  if (a.stamina <= 0) return null
  const floor = a.floor
  const rate = abyssWinRate(opts.power, floor)
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random
  const win = rng() < rate
  a.stamina -= 1
  a.attempts += 1
  a.date = todayKey(new Date(now))
  const out = { next: st, coins: 0, qi: 0, win, floor, rate }
  if (win) {
    const rw = abyssReward(floor)
    a.floor = floor + 1
    a.best = Math.max(a.best, a.floor)
    // 道韵入轮回池
    st.reincarnation.daoYun += rw.daoYun
    st.reincarnation.totalDaoYun += rw.daoYun
    // 战令任务进度
    st.pass.daily.abyssWins += 1
    out.coins = rw.coins
    out.msg = `通关第 ${a.floor} 层！获得 ${rw.coins} 金币、${rw.daoYun} 道韵${rw.milestone ? '（里程碑！）' : ''}`
  } else {
    out.msg = `挑战第 ${floor + 1} 层失败（胜率 ${Math.round(rate * 100)}%），战力不足时先去钓鱼提升力量吧`
  }
  return out
}

/** 购买精力：opts = { bought, now }；bought 为今日已购买次数 */
export function buyStamina(advance, opts = {}) {
  const st = normalizeAdvance(advance, opts.now)
  const a = st.abyss
  if (a.stamina >= ABYSS_MAX_STAMINA) return null
  const cost = staminaCost(clampInt(opts.bought, 0, 1e6))
  a.stamina = ABYSS_MAX_STAMINA
  return { next: st, coins: -cost, qi: 0, msg: `精力已回满（-${cost} 金币）` }
}

// ============================================================
//  灵脉（挂机）
// ============================================================
export function veinRate(level) {
  const lv = clampInt(level, 1, VEIN_MAX_LEVEL)
  return { coinsPerMin: lv * 8, qiPerMin: lv * 2 }
}
export function veinUpgradeCost(level) {
  const lv = clampInt(level, 1, VEIN_MAX_LEVEL - 1)
  return Math.round(1000 * Math.pow(1.5, lv - 1))
}
/** 推进灵脉累积到 now（纯内部结算，不改金币/灵气余额） */
export function settleVein(advance, now = Date.now()) {
  const st = normalizeAdvance(advance, now)
  const v = st.vein
  const elapsedMin = Math.max(0, (now - v.lastTick) / 60000)
  if (elapsedMin <= 0) return st
  const capped = Math.min(elapsedMin, VEIN_CAP_HOURS * 60)
  const rate = veinRate(v.level)
  v.accumulated += Math.floor(capped * rate.coinsPerMin)
  v.accumulatedQi += Math.floor(capped * rate.qiPerMin)
  v.lastTick = now
  return st
}
/** 收取灵脉：把累积的金币/灵气结算给玩家 */
export function collectVein(advance, now = Date.now()) {
  const st = settleVein(advance, now)
  const v = st.vein
  const coins = Math.floor(v.accumulated)
  const qi = Math.floor(v.accumulatedQi)
  if (coins <= 0 && qi <= 0) return null
  v.accumulated = 0
  v.accumulatedQi = 0
  v.lastCollect = now
  v.totalCollected += coins
  st.pass.daily.collectVein += 1
  return { next: st, coins, qi, msg: `收取灵脉：${coins} 金币、${qi} 灵气` }
}
/** 升级灵脉 */
export function upgradeVein(advance, now = Date.now()) {
  const st = settleVein(advance, now)
  const v = st.vein
  if (v.level >= VEIN_MAX_LEVEL) return null
  const cost = veinUpgradeCost(v.level)
  v.level += 1
  return { next: st, coins: -cost, qi: 0, msg: `灵脉升至 ${v.level} 级，产出提升！` }
}

// ============================================================
//  轮回 / 道印
// ============================================================
/** 轮回所需道韵 */
export function reincarnateCost(cycle) {
  return Math.round(400 * Math.pow(1.5, clampInt(cycle, 0, 1e6)))
}
/** 轮回所需最低塔层 */
export function reincarnateFloor(cycle) {
  return clampInt(cycle, 0, 1e6) * 12
}
export function reincarnateReady(advance) {
  const st = advance && advance.reincarnation
  if (!st) return { ready: false, need: 0, floor: 0 }
  const need = reincarnateCost(st.cycle)
  const floorNeed = reincarnateFloor(st.cycle)
  const floor = advance.abyss ? advance.abyss.floor : 0
  return { ready: st.daoYun >= need && floor >= floorNeed, need, floorNeed, daoYun: st.daoYun, floor }
}
/** 执行轮回：消耗道韵，获得 1 道印点 */
export function reincarnate(advance, now = Date.now()) {
  const st = normalizeAdvance(advance, now)
  const rc = st.reincarnation
  const need = reincarnateCost(rc.cycle)
  const floorNeed = reincarnateFloor(rc.cycle)
  const floor = st.abyss.floor
  if (rc.daoYun < need || floor < floorNeed) return null
  rc.daoYun -= need
  rc.cycle += 1
  rc.pendingSeals += 1
  return { next: st, coins: 0, qi: 0, msg: `第 ${rc.cycle} 轮轮回完成！获得 1 点道印，可分配到永久加成` }
}
/** 分配道印点到某类 */
export function allocateSeal(advance, type, now = Date.now()) {
  const st = normalizeAdvance(advance, now)
  const rc = st.reincarnation
  if (!SEAL_TYPES.includes(type) || rc.pendingSeals <= 0) return null
  rc.seals[type] += 1
  rc.pendingSeals -= 1
  return { next: st, coins: 0, qi: 0, msg: `${SEAL_META[type].name} 提升至 ${rc.seals[type]} 级！` }
}

// ============================================================
//  战令
// ============================================================
export function passExpNeed(level) {
  return Math.round(100 * clampInt(level, 1, PASS_MAX_LEVEL))
}
/** 战令任务领奖 */
export function claimPassDaily(advance, id, now = Date.now()) {
  const st = normalizeAdvance(advance, now)
  const p = st.pass
  const tpl = PASS_DAILY.find((t) => t.id === id)
  if (!tpl || p.dailyClaimed.includes(id)) return null
  if ((p.daily[id] || 0) < tpl.need) return null
  p.dailyClaimed.push(id)
  p.exp += tpl.exp
  // 经验转等级（可连升）
  let leveled = 0
  while (p.level < PASS_MAX_LEVEL && p.exp >= passExpNeed(p.level)) {
    p.exp -= passExpNeed(p.level)
    p.level += 1
    leveled += 1
  }
  return {
    next: st, coins: tpl.coins, qi: 0,
    msg: `领取「${tpl.name}」：+${tpl.exp} 战令经验、+${tpl.coins} 金币${leveled ? `，战令升至 ${p.level} 级！` : ''}`
  }
}

/** 记录钓鱼进度（供 HomeView 结算成功后调用；仅推进每日计数，不发奖） */
export function progressPassCatch(advance, count = 1, now = Date.now()) {
  const st = normalizeAdvance(advance, now)
  st.pass.daily.catchFish += Math.max(0, Math.round(count))
  return st
}

export default {
  ABYSS_MAX_STAMINA, VEIN_MAX_LEVEL, VEIN_CAP_HOURS, PASS_MAX_LEVEL, SEAL_TYPES, SEAL_META, PASS_DAILY,
  todayKey, normalizeAdvance, abyssFx, sealFx, passFx, advanceFx, mergeBondFx,
  abyssEnemyPower, abyssWinRate, abyssReward, staminaCost, abyssChallenge, buyStamina,
  veinRate, veinUpgradeCost, settleVein, collectVein, upgradeVein,
  reincarnateCost, reincarnateFloor, reincarnateReady, reincarnate, allocateSeal,
  passExpNeed, claimPassDaily, progressPassCatch
}
