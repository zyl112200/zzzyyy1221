// 概率预估模块测试：直接驱动 src/data/fishingOdds.js
import { calcFishingOdds, DEFAULT_DROP_RATES } from './src/data/fishingOdds.js'

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✅', name, extra) }
  else { fail++; console.log('  ❌', name, extra) }
}
const sum = (tiers) => tiers.reduce((s, t) => s + t.prob, 0)

console.log('\n=== 1) 初始配置（灵湖 / 力量100 / 初级竿 maxCatch800）===')
let r = calcFishingOdds({ strength: 100, maxCatch: 800, rodPower: 1, exBaseRate: 0, exMin: 1, exMax: 1 })
ok('概率总和 ≈ 1', Math.abs(sum(r.tiers) - 1) < 1e-9, sum(r.tiers).toFixed(6))
ok('专属鱼率 = 0', r.exRate === 0)
// pickTier 按 minW>maxCatch 过滤：神话(5000)/山海(20000) 在 maxCatch=800 时被排除
// 剩余权重：普通60, 稀有24*1.12, 传说10*1.12
const lf = 1 + 1 * 0.12
const tot = 60 + (24 + 10) * lf
ok('普通鱼概率=60/tot', Math.abs(r.tiers[0].prob - 60 / tot) < 1e-9, r.tiers[0].prob.toFixed(4))
ok('传说概率=10*lf/tot', Math.abs(r.tiers[2].prob - 10 * lf / tot) < 1e-9, r.tiers[2].prob.toFixed(4))
ok('神话/山海=0（装备承重不够，被 pickTier 排除）', r.tiers[3].prob === 0 && r.tiers[4].prob === 0)
console.log('   ' + r.tiers.map((t) => `${t.label} ${(t.prob * 100).toFixed(1)}%`).join(' | '))

console.log('\n=== 2) 升级鱼竿后才可能出神话/山海（maxCatch=5000000）===')
const big = calcFishingOdds({ strength: 100000, maxCatch: 5000000, rodPower: 9, exBaseRate: 0 })
ok('神话概率 > 0', big.tiers[3].prob > 0, (big.tiers[3].prob * 100).toFixed(3) + '%')
ok('山海概率 > 0', big.tiers[4].prob > 0, (big.tiers[4].prob * 100).toFixed(4) + '%')

console.log('\n=== 3) 蓬莱 exRate=0.85 / exMin20 / exMax120 / 力量100000 ===')
r = calcFishingOdds({ strength: 100000, maxCatch: 5000000, rodPower: 9, exBaseRate: 0.85, exMin: 20, exMax: 120 })
ok('概率总和 ≈ 1', Math.abs(sum(r.tiers) - 1) < 1e-9, sum(r.tiers).toFixed(6))
ok('专属鱼率 = 0.85', Math.abs(r.exRate - 0.85) < 1e-9)
ok('专属鱼倍数全 ≥20 → 全山海', Math.abs(r.exclusive.SHANHAI - 1) < 1e-9, r.exclusive.SHANHAI.toFixed(4))
ok('山海概率 ≥ 0.85', r.tiers[4].prob >= 0.85 - 1e-9, (r.tiers[4].prob * 100).toFixed(2) + '%')
console.log('   ' + r.tiers.map((t) => `${t.label} ${(t.prob * 100).toFixed(2)}%`).join(' | '))

console.log('\n=== 4) 高级饵 + 幸运物 各 +5% ===')
r = calcFishingOdds({ strength: 100, maxCatch: 800, rodPower: 1, exBaseRate: 0.3, exMin: 1.2, exMax: 4, premium: true, luck: true })
ok('专属鱼率 = 0.30+0.05+0.05 = 0.40', Math.abs(r.exRate - 0.4) < 1e-9, r.exRate.toFixed(4))

console.log('\n=== 5) 观水诀 提升稀有及以上 ===')
const noGs = calcFishingOdds({ strength: 100, maxCatch: 800, rodPower: 1, exBaseRate: 0 })
const gs = calcFishingOdds({ strength: 100, maxCatch: 800, rodPower: 1, exBaseRate: 0, guanshui: true })
ok('观水诀使普通概率下降', gs.tiers[0].prob < noGs.tiers[0].prob)
ok('观水诀使传说概率上升', gs.tiers[2].prob > noGs.tiers[2].prob,
  `${(noGs.tiers[2].prob * 100).toFixed(2)}% → ${(gs.tiers[2].prob * 100).toFixed(2)}%`)

console.log('\n=== 6) 装备上限过滤（maxCatch=10 排除稀有及以上 minW>10）===')
r = calcFishingOdds({ strength: 100, maxCatch: 10, rodPower: 1, exBaseRate: 0 })
ok('概率总和 ≈ 1', Math.abs(sum(r.tiers) - 1) < 1e-9, sum(r.tiers).toFixed(6))
ok('稀有概率=0（minW15>10）', r.tiers[1].prob === 0)
ok('普通概率=1', Math.abs(r.tiers[0].prob - 1) < 1e-9)

console.log('\n=== 7) 专属鱼截断：maxCatch 小于 力量×exMax ===')
// 力量100, exMin1~exMax10, maxCatch=200 → capMul=2，>2 的倍数折叠到 LEGENDARY 段(1.5~5)
r = calcFishingOdds({ strength: 100, maxCatch: 200, rodPower: 1, exBaseRate: 1, exMin: 1, exMax: 10 })
ok('概率总和 ≈ 1', Math.abs(sum(r.tiers) - 1) < 1e-9, sum(r.tiers).toFixed(6))
ok('神话/山海=0（倍数最高截断到2）', r.tiers[3].prob === 0 && r.tiers[4].prob === 0)
ok('稀有+传说=1', Math.abs(r.tiers[1].prob + r.tiers[2].prob - 1) < 1e-9)

console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 ===`)
process.exit(fail ? 1 : 0)
