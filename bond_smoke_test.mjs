/**
 * 仙钓道途 · 灵契系统回归测试（Node 直跑数据层）
 * 覆盖：目录完整、结契门槛、升星成本、上阵/出战位、灵池扩建、
 *       图鉴大成、bondFx 汇总、存档规范化、灵气凝聚倍率。
 */
import assert from 'node:assert/strict'
import {
  normalizeFeature, applyCatch, bondContract, bondStarUp, bondToggleActive,
  bondExpandSlots, bondUpgradePool, fishTierOf
} from './src/data/feature.js'
import {
  BOND_CATALOG, FISH_TIER, CODEX_MASTERY, MAX_STAR, MAX_SLOTS,
  contractCost, starUpCost, slotExpandCost, poolUpgradeCost, poolQiMul,
  bondBonusOf, activeBondFx, codexMasteryFx, masteredCodex, totalBondFx,
  normalizeBonds
} from './src/data/bonds.js'

let pass = 0, fail = 0
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓', name) }
  catch (e) { fail++; console.log('  ✗', name, '->', e.message) }
}

console.log('== 灵契数据层测试 ==')

t('鱼种目录完整（41 种）且品级映射齐全', () => {
  assert.equal(BOND_CATALOG.length, 41)
  for (const f of BOND_CATALOG) {
    assert.equal(FISH_TIER.get(f.name), f.tier, f.name + ' 品级映射')
  }
})

t('结契成本按品级递增', () => {
  const c = contractCost
  assert.ok(c('COMMON').coins < c('RARE').coins)
  assert.ok(c('RARE').coins < c('LEGENDARY').coins)
  assert.ok(c('LEGENDARY').coins < c('MYTHIC').coins)
  assert.ok(c('MYTHIC').coins < c('SHANHAI').coins)
})

t('升星成本随星级递增', () => {
  const a = starUpCost('RARE', 1), b = starUpCost('RARE', 5)
  assert.ok(b.qi > a.qi && b.coins > a.coins)
})

t('必须先钓到才能结契', () => {
  let st = normalizeFeature(null)
  assert.equal(bondContract(st, '鲲', ['小丑鱼']), null, '未解锁鱼不可结契')
})

t('结契/升星扣灵气与金币差额', () => {
  let st = normalizeFeature(null)
  for (let i = 0; i < 30; i++) st = applyCatch(st, { tier: 'LEGENDARY', weight: 500, coins: 200, landed: true })
  const qi0 = st.pool, ear0 = st.earnedTotal
  const next = bondContract(st, '小丑鱼', ['小丑鱼'])
  assert.ok(next, '可结契')
  assert.equal(next.spiritBonds.owned['小丑鱼'], 1)
  assert.ok(next.pool < qi0, '扣灵气')
  assert.ok(next.earnedTotal < ear0, '扣金币（earnedTotal 负差额）')
  const up = bondStarUp(next, '小丑鱼')
  assert.equal(up.spiritBonds.owned['小丑鱼'], 2)
  assert.ok(up.pool < next.pool)
})

t('灵气不足时结契失败', () => {
  let st = normalizeFeature(null)
  st.pool = 0
  assert.equal(bondContract(st, '鲲', ['鲲']), null)
})

t('上阵受出战位限制，可下阵', () => {
  let st = normalizeFeature(null)
  st.pool = 5000 // 充足灵气以结契约 3 只不同品级灵契
  st = bondContract(st, '小丑鱼', ['小丑鱼'])
  st = bondContract(st, '鲲', ['鲲'])
  st = bondContract(st, '凤凰', ['凤凰'])
  st = bondToggleActive(st, '小丑鱼')
  st = bondToggleActive(st, '鲲')
  assert.equal(st.spiritBonds.active.length, 2)
  assert.equal(bondToggleActive(st, '凤凰'), null, '第三只无法上阵（仅 2 位）')
  st = bondToggleActive(st, '小丑鱼')
  assert.ok(!st.spiritBonds.active.includes('小丑鱼'), '下阵成功')
})

t('扩展出战位', () => {
  let st = normalizeFeature(null)
  st.earnedTotal = 1000000
  st = bondExpandSlots(st)
  assert.equal(st.spiritBonds.slots, 3)
  assert.ok(st.earnedTotal < 1000000)
})

t('灵池扩建提升灵气凝聚倍率', () => {
  assert.ok(poolQiMul(0) < poolQiMul(1))
  assert.ok(poolQiMul(1) < poolQiMul(10))
  let st = normalizeFeature(null)
  st.earnedTotal = 1000000
  st = bondUpgradePool(st)
  assert.equal(st.spiritBonds.poolLevel, 1)
  // 相同钓获，扩建后凝聚更多灵气
  let a = normalizeFeature(null)
  let b = normalizeFeature(null)
  b.spiritBonds.poolLevel = 5
  a = applyCatch(a, { tier: 'COMMON', weight: 100, coins: 50, landed: true })
  b = applyCatch(b, { tier: 'COMMON', weight: 100, coins: 50, landed: true })
  assert.ok(b.pool > a.pool, '扩建后灵气更多')
})

t('单只灵契加成随星级提升', () => {
  const s1 = bondBonusOf('SHANHAI', 1)
  const s10 = bondBonusOf('SHANHAI', 10)
  assert.ok(s10.coinMul > s1.coinMul)
  assert.ok(s10.weightMul > s1.weightMul)
  assert.ok(s10.tensionMul < s1.tensionMul, '张力倍率越低越好')
})

t('出战加成仅统计上阵灵契', () => {
  const bonds = normalizeBonds({ owned: { '小丑鱼': 10, '鲲': 10 }, active: ['鲲'] })
  const fx = activeBondFx(bonds)
  const onlyKun = bondBonusOf('MYTHIC', 10)
  assert.equal(fx.coinMul, onlyKun.coinMul, '仅鲲生效')
})

t('图鉴大成：集齐普通 5 种', () => {
  const commons = ['小丑鱼', '热带鱼', '河豚', '沙丁鱼', '鲭鱼']
  assert.equal(masteredCodex(commons).length, 1)
  assert.ok(codexMasteryFx(commons).coinMul > 1)
  assert.equal(masteredCodex(['小丑鱼']).length, 0)
})

t('bondFx 汇总 = 出战 + 大成', () => {
  let st = normalizeFeature(null)
  st.spiritBonds = normalizeBonds({ owned: { '小丑鱼': 10 }, active: ['小丑鱼'] })
  const codex = ['小丑鱼', '热带鱼', '河豚', '沙丁鱼', '鲭鱼']
  const fx = totalBondFx(st, codex)
  const expectCoin = bondBonusOf('COMMON', 10).coinMul * codexMasteryFx(codex).coinMul
  assert.equal(fx.coinMul, Math.round(expectCoin * 10000) / 10000)
})

t('bondFx 异常值在规范化中夹紧', () => {
  const fx = normalizeBonds({ owned: { '鲲': 999 }, active: ['鲲', '鲲'], slots: 99, poolLevel: -5 })
  assert.equal(fx.owned['鲲'], MAX_STAR)
  assert.equal(fx.slots, MAX_SLOTS)
  assert.equal(fx.active.length, 1, '去重')
  assert.equal(fx.poolLevel, 0)
})

t('存档往返：spiritBonds 保留', () => {
  let st = normalizeFeature(null)
  st.spiritBonds = normalizeBonds({ owned: { '凤凰': 7 }, active: ['凤凰'], slots: 3, poolLevel: 4 })
  const restored = normalizeFeature(JSON.parse(JSON.stringify(st)))
  assert.deepEqual(restored.spiritBonds, st.spiritBonds)
})

console.log(`\n结果：${pass} 通过，${fail} 失败`)
process.exit(fail ? 1 : 0)
