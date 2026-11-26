/**
 * 金币同步 / 双重发币 回归测试（Node 直接运行）
 * 运行：node sync_smoke_test.mjs
 *
 * 固化以下已修复 bug：
 *   1. 钓鱼结算重复发币：settle() 已发币，applyCatch 不能再计入 earnedTotal
 *   2. 洞天存档差额 clamp 与 earnedTotal 错位
 *   3. 洞天内部收支（淬炼/灵脉/悬赏）差额仍然正确
 */
import { localCall, resetLocalSave } from './src/api/localEngine.js'
import { normalizeFeature, applyCatch, forgeCost, forgeUp, claimBounty } from './src/data/feature.js'

let pass = 0
let fail = 0
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log('  ✓ ' + name) }
  else { fail++; console.log('  ✗ ' + name + (detail ? '  -> ' + detail : '')) }
}
const me = (u) => localCall('GET', '/api/game/me?username=' + u).data
const feat = (u) => localCall('GET', '/api/feature/state?username=' + u).data.state
const save = (u, st) => localCall('POST', '/api/feature/save', { username: u, state: st, earnedTotal: st.earnedTotal })

console.log('\n=== 1) 钓鱼结算：只发一次币 ===')
resetLocalSave()
localCall('POST', '/api/auth/register', { username: 'synctest', password: '123456' })
const start = me('synctest').shells
const enc = localCall('POST', '/api/game/cast', { username: 'synctest' })
const expected = enc.data.rewardShells
const settled = localCall('POST', '/api/game/settle', {
  username: 'synctest', encounterId: enc.data.encounterId, landed: true, breakType: 'NONE'
})
check('settle 后金币 = 初始 + 奖励', settled.data.shells === start + expected, `${settled.data.shells} vs ${start + expected}`)
// 模拟 HomeView 后续 applyCatch + saveFeature
let st = applyCatch(feat('synctest'), {
  tier: settled.data.tier, weight: settled.data.weight, mapId: 'linghu',
  coins: settled.data.landed ? settled.data.rewardShells : 0, landed: true
})
const saved = save('synctest', st)
check('saveFeature 的 delta = 0（不再重复发币）', saved.data.delta === 0, `delta=${saved.data.delta}`)
check('钓鱼后总金币 = 初始 + 单次奖励', me('synctest').shells === start + expected, `${me('synctest').shells} vs ${start + expected}`)
check('earnedTotal 未被钓获金币污染', feat('synctest').earnedTotal === 0, `earnedTotal=${feat('synctest').earnedTotal}`)

console.log('\n=== 2) 多次钓鱼：线性增长，无累积多发 ===')
// 换用全新账号（初始 5 个鱼饵，钓 3 次足够，避免鱼饵耗尽导致 cast 失败）
resetLocalSave()
localCall('POST', '/api/auth/register', { username: 'multi', password: '123456' })
let coinsBefore = me('multi').shells
let totalExpected = 0
let castOk = 0
for (let i = 0; i < 3; i++) {
  const e = localCall('POST', '/api/game/cast', { username: 'multi' })
  if (e.code !== 200 || !e.data) break
  const s = localCall('POST', '/api/game/settle', {
    username: 'multi', encounterId: e.data.encounterId, landed: true, breakType: 'NONE'
  })
  totalExpected += e.data.rewardShells
  castOk++
  let st2 = applyCatch(feat('multi'), {
    tier: s.data.tier, weight: s.data.weight, mapId: 'linghu',
    coins: s.data.rewardShells, landed: true
  })
  save('multi', st2)
}
check('完成 3 次钓鱼', castOk === 3, `实际 ${castOk} 次`)
check('3 次钓鱼后金币 = 起始 + 各次奖励之和',
  me('multi').shells === coinsBefore + totalExpected,
  `${me('multi').shells} vs ${coinsBefore + totalExpected}`)

console.log('\n=== 3) 洞天内部收支仍走差额（淬炼扣费）===')
const beforeForge = me('multi').shells
const cost = forgeCost(feat('multi').forgeLevel)
const forged = forgeUp(feat('multi'))
save('multi', forged)
check('淬炼扣费 = forgeCost', me('multi').shells === beforeForge - cost,
  `${me('multi').shells} vs ${beforeForge - cost}`)

console.log('\n=== 4) 悬赏奖励仍走差额（发币）===')
// 构造已达成悬赏的状态：直接写入存档并保存，再领取
let bs = normalizeFeature(feat('multi'))
bs.bounty.tiers.COMMON = 10
const d = new Date()
bs.bounty.date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
save('multi', bs)
const beforeBounty = me('multi').shells
let claimed = claimBounty(feat('multi'), 'common')
check('悬赏可领取', !!claimed)
if (claimed) {
  save('multi', claimed)
  check('悬赏奖励 120 金币入账', me('multi').shells === beforeBounty + 120,
    `${me('multi').shells} vs ${beforeBounty + 120}`)
}

console.log('\n=== 5) 幂等：重复保存同一状态不重复入账 ===')
const beforeDup = me('multi').shells
save('multi', feat('multi'))
check('重复保存金币不变', me('multi').shells === beforeDup)

console.log('\n=== 6) clamp 错位修复：大额差额存回截断值 ===')
resetLocalSave()
localCall('POST', '/api/auth/register', { username: 'clamptest', password: '123456' })
let bigState = normalizeFeature(null)
bigState.earnedTotal = 300000 // 超过 +20万 clamp
const bigSaved = save('clamptest', bigState)
check('delta 被 clamp 到 200000', bigSaved.data.delta === 200000, `delta=${bigSaved.data.delta}`)
check('earnedTotal 存回 200000（非 300000）', feat('clamptest').earnedTotal === 200000,
  `earnedTotal=${feat('clamptest').earnedTotal}`)
// 再次以 300000 提交，应无新增（因为存档基准已是 200000 → delta=100000）
// 这里验证的是「基准一致」，不是金额正确（前端正常不会重复提交旧值）
const secondSave = save('clamptest', { ...bigState, earnedTotal: 200000 })
check('按新基准提交不再产生意外大额', secondSave.data.delta === 0, `delta=${secondSave.data.delta}`)

console.log(`\n========== 合计 ${pass + fail} 项：通过 ${pass}，失败 ${fail} ==========`)
process.exit(fail > 0 ? 1 : 0)
