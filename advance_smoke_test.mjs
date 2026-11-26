// 更多玩法（无尽塔 / 灵脉 / 轮回 / 战令）数据层冒烟测试
// 运行：node advance_smoke_test.mjs
import assert from 'node:assert/strict'
import {
  normalizeAdvance, abyssFx, sealFx, passFx, advanceFx, mergeBondFx,
  abyssEnemyPower, abyssWinRate, abyssReward, staminaCost,
  abyssChallenge, buyStamina, veinRate, veinUpgradeCost, settleVein, collectVein, upgradeVein,
  reincarnateCost, reincarnateFloor, reincarnateReady, reincarnate, allocateSeal,
  passExpNeed, claimPassDaily, progressPassCatch, todayKey
} from './src/data/advance.js'
import {
  normalizeFeature, advAbyssChallenge, advCollectVein, advUpgradeVein,
  advReincarnate, advAllocateSeal, advClaimPassDaily, advSettleVein
} from './src/data/feature.js'

let pass = 0
function ok(name, fn) { fn(); pass++; console.log(`  ✓ ${name}`) }
function near(a, b, eps = 1e-6) { assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`) }

console.log('== 1. 规范化与默认值 ==')
ok('空状态规范化字段齐全', () => {
  const a = normalizeAdvance(null, 1700000000000)
  assert.equal(a.abyss.floor, 0)
  assert.equal(a.abyss.stamina, 10)
  assert.equal(a.vein.level, 1)
  assert.equal(a.reincarnation.cycle, 0)
  assert.deepEqual(a.pass.daily, { catchFish: 0, abyssWins: 0, collectVein: 0 })
})
ok('每日重置精力与任务', () => {
  const raw = { abyss: { date: '2000-01-01', stamina: 1, attempts: 9, floor: 12 },
    pass: { date: '2000-01-01', daily: { catchFish: 8 }, dailyClaimed: ['catchFish'] } }
  const a = normalizeAdvance(raw, Date.now())
  assert.equal(a.abyss.stamina, 10)
  assert.equal(a.abyss.attempts, 0)
  assert.equal(a.abyss.floor, 12) // 层数不清零
  assert.equal(a.pass.daily.catchFish, 0)
  assert.deepEqual(a.pass.dailyClaimed, [])
})

console.log('== 2. 无尽塔 ==')
ok('敌人战力指数增长', () => {
  assert.equal(abyssEnemyPower(0), 100)
  assert.ok(abyssEnemyPower(10) > abyssEnemyPower(0))
  assert.ok(abyssEnemyPower(20) > abyssEnemyPower(10) * 3)
})
ok('胜率随战力上升、随层数下降', () => {
  assert.ok(abyssWinRate(1000, 0) > abyssWinRate(100, 0))
  assert.ok(abyssWinRate(1000, 0) > abyssWinRate(1000, 30))
  assert.ok(abyssWinRate(100000, 0) <= 0.96)
  assert.ok(abyssWinRate(1, 50) >= 0.08)
})
ok('里程碑层奖励 5~10 倍', () => {
  const normal = abyssReward(8)   // 第 9 层
  const mile = abyssReward(9)     // 第 10 层
  assert.equal(mile.milestone, true)
  assert.ok(mile.coins > normal.coins * 4)
})
ok('挑战成功推进层数与道韵（rng=0 必胜）', () => {
  let a = normalizeAdvance(null, 1700000000000)
  const r = abyssChallenge(a, { power: 100000, now: 1700000000000, rng: () => 0 })
  assert.equal(r.win, true)
  assert.equal(r.next.abyss.floor, 1)
  assert.equal(r.next.abyss.stamina, 9)
  assert.ok(r.next.reincarnation.daoYun > 0)
  assert.ok(r.coins > 0)
})
ok('挑战失败不推进层数（rng=0.99 必败）', () => {
  let a = normalizeAdvance(null, 1700000000000)
  const r = abyssChallenge(a, { power: 1, now: 1700000000000, rng: () => 0.99 })
  assert.equal(r.win, false)
  assert.equal(r.next.abyss.floor, 0)
  assert.equal(r.next.abyss.stamina, 9)
})
ok('精力耗尽无法挑战', () => {
  const a = normalizeAdvance({ abyss: { stamina: 0, date: todayKey() } }, Date.now())
  assert.equal(abyssChallenge(a, { power: 9999, rng: () => 0 }), null)
})
ok('精力购买成本递增', () => {
  assert.ok(staminaCost(2) > staminaCost(0))
})

console.log('== 3. 灵脉 ==')
ok('灵脉产出随等级提升', () => {
  assert.ok(veinRate(10).coinsPerMin > veinRate(1).coinsPerMin)
  assert.ok(veinUpgradeCost(5) > veinUpgradeCost(1))
})
ok('离线累积按时间与等级计算', () => {
  const now = 1700000000000
  const base = normalizeAdvance(null, now)
  base.vein.lastTick = now - 60 * 60 * 1000 // 1 小时前
  const settled = settleVein(base, now)
  near(settled.vein.accumulated, veinRate(1).coinsPerMin * 60)
  near(settled.vein.accumulatedQi, veinRate(1).qiPerMin * 60)
})
ok('离线累积有 12 小时上限', () => {
  const now = 1700000000000
  const base = normalizeAdvance(null, now)
  base.vein.lastTick = now - 48 * 60 * 60 * 1000 // 48 小时前
  const settled = settleVein(base, now)
  near(settled.vein.accumulated, veinRate(1).coinsPerMin * 12 * 60)
})
ok('收取清空累积并结算金币/灵气', () => {
  const now = 1700000000000
  const base = normalizeAdvance(null, now)
  base.vein.lastTick = now - 60 * 60 * 1000
  const r = collectVein(base, now)
  assert.ok(r.coins > 0 && r.qi > 0)
  assert.equal(r.next.vein.accumulated, 0)
  assert.equal(r.next.pass.daily.collectVein, 1)
})
ok('无产出时收取返回 null', () => {
  const now = 1700000000000
  assert.equal(collectVein(normalizeAdvance(null, now), now), null)
})
ok('升级灵脉扣金币、提升等级', () => {
  const now = 1700000000000
  const r = upgradeVein(normalizeAdvance(null, now), now)
  assert.equal(r.next.vein.level, 2)
  assert.equal(r.coins, -veinUpgradeCost(1))
})

console.log('== 4. 轮回 / 道印 ==')
ok('轮回成本与层数门槛递增', () => {
  assert.ok(reincarnateCost(2) > reincarnateCost(0))
  assert.equal(reincarnateFloor(0), 0)
  assert.ok(reincarnateFloor(3) > reincarnateFloor(1))
})
ok('条件不足无法轮回', () => {
  const a = normalizeAdvance(null, Date.now())
  assert.equal(reincarnate(a, Date.now()), null)
})
ok('条件满足完成轮回并得道印点', () => {
  const now = Date.now()
  const a = normalizeAdvance({
    reincarnation: { daoYun: reincarnateCost(0) + 10, cycle: 0 },
    abyss: { floor: reincarnateFloor(0), date: todayKey() }
  }, now)
  assert.equal(reincarnateReady(a).ready, true)
  const r = reincarnate(a, now)
  assert.equal(r.next.reincarnation.cycle, 1)
  assert.equal(r.next.reincarnation.pendingSeals, 1)
})
ok('分配道印提升等级与加成', () => {
  const a = normalizeAdvance({ reincarnation: { pendingSeals: 2 } }, Date.now())
  const r = allocateSeal(a, 'coin', Date.now())
  assert.equal(r.next.reincarnation.seals.coin, 1)
  assert.equal(r.next.reincarnation.pendingSeals, 1)
  assert.ok(sealFx(r.next).coinMul > 1)
})
ok('无道印点无法分配', () => {
  assert.equal(allocateSeal(normalizeAdvance(null, Date.now()), 'rare', Date.now()), null)
})

console.log('== 5. 战令 ==')
ok('经验需求随等级提升', () => {
  assert.equal(passExpNeed(1), 100)
  assert.ok(passExpNeed(10) > passExpNeed(1))
})
ok('钓鱼进度累加', () => {
  const a = normalizeAdvance(null, Date.now())
  const b = progressPassCatch(a, 10, Date.now())
  assert.equal(b.pass.daily.catchFish, 10)
})
ok('领取任务得经验金币并自动升级', () => {
  const now = Date.now()
  const a = normalizeAdvance({
    pass: { date: todayKey(), daily: { catchFish: 10 } }
  }, now)
  const r = claimPassDaily(a, 'catchFish', now)
  assert.ok(r.coins > 0)
  assert.equal(r.next.pass.exp, 60) // 60 < 100，未升级
  assert.ok(r.next.pass.dailyClaimed.includes('catchFish'))
})
ok('重复领取返回 null', () => {
  const now = Date.now()
  const a = normalizeAdvance({ pass: { date: todayKey(), daily: { catchFish: 10 }, dailyClaimed: ['catchFish'] } }, now)
  assert.equal(claimPassDaily(a, 'catchFish', now), null)
})
ok('经验足够自动连升', () => {
  const now = Date.now()
  const a = normalizeAdvance({ pass: { date: todayKey(), level: 1, exp: 250, daily: { abyssWins: 3 } } }, now)
  const r = claimPassDaily(a, 'abyssWins', now)
  // exp 250+80=330 → 升到 3 级（100+200=300 消耗）余 30
  assert.equal(r.next.pass.level, 3)
  near(r.next.pass.exp, 30)
})

console.log('== 6. 加成汇总 ==')
ok('各系统加成倍率语义正确', () => {
  const a = normalizeAdvance({ abyss: { floor: 20 }, reincarnation: { seals: { coin: 2, rare: 1, weight: 3, tension: 2 } }, pass: { level: 10 } }, Date.now())
  assert.ok(abyssFx(a).coinMul > 1)
  assert.ok(sealFx(a).coinMul > 1)
  assert.ok(passFx(a).coinMul > 1)
  const fx = advanceFx({ advance: a })
  assert.ok(fx.coinMul > 1 && fx.weightMul > 1 && fx.rareBoost > 0)
})
ok('加成有 clamp 上限', () => {
  const a = normalizeAdvance({ abyss: { floor: 1e7 }, reincarnation: { seals: { coin: 1e6, rare: 1e6 } }, pass: { level: 50 } }, Date.now())
  const fx = advanceFx({ advance: a })
  assert.ok(fx.coinMul <= 5)
  assert.ok(fx.rareBoost <= 0.5)
})
ok('mergeBondFx 合并两组加成', () => {
  const m = mergeBondFx({ rareBoost: 0.1, weightMul: 1.2, coinMul: 1.5, tensionMul: 0.9 }, { rareBoost: 0.05, weightMul: 1.1, coinMul: 1.2, tensionMul: 0.95 })
  near(m.rareBoost, 0.15)
  near(m.weightMul, 1.32)
  near(m.coinMul, 1.8)
})

console.log('== 7. feature wrapper 结算 ==')
ok('normalizeFeature 保留 advance 字段', () => {
  const f = normalizeFeature(null)
  assert.ok(f.advance && f.advance.abyss)
})
ok('无尽塔 wrapper 结算金币到 earnedTotal', () => {
  let f = normalizeFeature(null)
  const before = f.earnedTotal
  const next = advAbyssChallenge(f, { power: 100000, now: Date.now(), rng: () => 0 })
  assert.ok(next.earnedTotal > before)
  assert.equal(next.advance.abyss.floor, 1)
})
ok('灵脉收取 wrapper 结算金币与灵气', () => {
  const now = Date.now()
  let f = normalizeFeature(null)
  f.advance.vein.lastTick = now - 60 * 60 * 1000
  f = advSettleVein(f, now)
  const beforeCoin = f.earnedTotal
  const beforeQi = f.pool
  const next = advCollectVein(f, now)
  assert.ok(next.earnedTotal > beforeCoin)
  assert.ok(next.pool > beforeQi)
})
ok('升级灵脉 wrapper 扣金币（earnedTotal 减少）', () => {
  const f = normalizeFeature(null)
  const next = advUpgradeVein(f, Date.now())
  assert.ok(next.earnedTotal < f.earnedTotal)
})
ok('轮回 + 分配道印 wrapper 链路', () => {
  const now = Date.now()
  let f = normalizeFeature(null)
  f.advance.reincarnation.daoYun = reincarnateCost(0)
  f.advance.abyss.floor = reincarnateFloor(0)
  f = normalizeFeature(f)
  let next = advReincarnate(f, now)
  assert.equal(next.advance.reincarnation.cycle, 1)
  next = advAllocateSeal(next, 'weight', now)
  assert.equal(next.advance.reincarnation.seals.weight, 1)
})

console.log(`\n✅ 全部通过：${pass} 项断言`)
