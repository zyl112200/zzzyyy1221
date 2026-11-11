/**
 * 钓鱼协会功能冒烟测试（Node 直跑 localEngine.js，localStorage 用内存 shim）
 * 覆盖：协会任务发布/完成/领奖、2 分钟比赛（含快进结算）、1-9 星徽章认证。
 */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

const { localCall, resetLocalSave } = await import('file:///D:/workSpace/zzzyyy1221/src/api/localEngine.js')

let pass = 0, fail = 0
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ✅ ' + name + (extra ? ' | ' + extra : '')) }
  else { fail++; console.log('  ❌ ' + name + (extra ? ' | ' + extra : '')) }
}
const realNow = Date.now.bind(Date)

// ---------- 1. 注册 + 协会初始信息（nextTaskAt=0 应立即发布首个任务） ----------
resetLocalSave()
const r1 = localCall('POST', '/api/auth/register', { username: 'tester', password: '123456' })
check('注册成功', r1.code === 200)

const r2 = localCall('GET', '/api/assoc/info?username=tester')
check('协会信息可访问', r2.code === 200)
const tasks0 = r2.data.tasks
check('首波任务已发布', tasks0.length >= 1, `任务数=${tasks0.length}, fish=${tasks0[0]?.fishName}`)
check('徽章初始为 0 星', r2.data.badgeStar === 0)
check('门槛表 9 档', r2.data.badgeThresholds.length === 9, r2.data.badgeThresholds.join('/'))
check('暂无进行中比赛', r2.data.competition === null)

// 未完成不可领奖
const t0 = tasks0[0]
const rc0 = localCall('POST', '/api/assoc/task-claim', { username: 'tester', taskId: t0.id })
check('未完成任务不可领奖', rc0.code === 400)

// ---------- 2. 钓鱼比赛：开赛 → 钓获累计 → 快进 2 分钟自动结算 ----------
const rs = localCall('POST', '/api/assoc/comp-start', { username: 'tester' })
check('比赛报名成功', rs.code === 200, rs.message)
const dup = localCall('POST', '/api/assoc/comp-start', { username: 'tester' })
check('比赛中重复报名被拒', dup.code === 400)

// 钓一竿并成功上岸（开局 5 个鱼饵 + 自动装备初级竿）
let castMsg = null
for (let i = 0; i < 6 && !castMsg; i++) {
  const c = localCall('POST', '/api/game/cast', { username: 'tester' })
  if (c.code !== 200) break
  const s = localCall('POST', '/api/game/settle', { username: 'tester', encounterId: c.data.encounterId, landed: true, breakType: 'NONE' })
  if (s.code === 200 && s.data.landed) {
    castMsg = (s.data.assocMessages || []).find((m) => m.includes('比赛中'))
  }
}
check('比赛中钓获累计播报', !!castMsg, castMsg || '（6 竿内未上岸，跳过）')

// 快进 2 分钟触发自动结算
Date.now = () => realNow() + 3 * 60 * 1000
const rs2 = localCall('POST', '/api/assoc/comp-state', { username: 'tester' })
check('到点自动结算', rs2.code === 200 && rs2.data.competition?.finalized === true,
  `名次=${rs2.data.competition?.rank}, 奖励=${rs2.data.competition?.reward ? '有' : '无'}`)
check('比赛记录已留存', rs2.data.compRecords.length === 1)
check('重置时间源', (Date.now = realNow, true))

// ---------- 3. 徽章认证：充值 → 买顶级竿/线 → 钓 ≥1000 斤 ----------
localCall('POST', '/api/admin/users/update', { id: 4, shells: 300000 })
localCall('POST', '/api/shop/buy', { username: 'tester', itemId: 11, quantity: 1 })  // 深渊海神竿
localCall('POST', '/api/shop/buy', { username: 'tester', itemId: 9, quantity: 1 })   // 螺纹钢航母阻拦索
// 装备新竿与线（取背包中对应道具）
const me = localCall('GET', '/api/game/me?username=tester').data
for (const it of me.inventory) {
  if (it.name === '深渊海神竿' || it.name === '螺纹钢航母阻拦索') {
    localCall('POST', '/api/game/equip', { username: 'tester', userItemId: it.userItemId })
  }
}

let landedHeavy = null
// 备足鱼饵，钓空了就自动补货
localCall('POST', '/api/shop/buy', { username: 'tester', itemId: 5, quantity: 500 })
for (let i = 0; i < 400 && !landedHeavy; i++) {
  let c = localCall('POST', '/api/game/cast', { username: 'tester' })
  if (c.code !== 200 && c.message.includes('鱼饵')) {
    localCall('POST', '/api/shop/buy', { username: 'tester', itemId: 5, quantity: 500 })
    c = localCall('POST', '/api/game/cast', { username: 'tester' })
  }
  if (c.code !== 200) { console.log('   cast 失败:', c.message); break }
  const s = localCall('POST', '/api/game/settle', { username: 'tester', encounterId: c.data.encounterId, landed: true, breakType: 'NONE' })
  if (s.code === 200 && s.data.landed && s.data.weight >= 1000) landedHeavy = s.data
}
check('钓到 ≥1000 斤巨物', !!landedHeavy, landedHeavy ? `${landedHeavy.fishName} ${landedHeavy.weight} 斤` : '（400 竿内未出，概率问题）')
if (landedHeavy) {
  const msgs = landedHeavy.assocMessages || []
  check('徽章认证播报', msgs.some((m) => m.includes('星专属徽章')), msgs.join(' / '))
  const info = localCall('GET', '/api/assoc/info?username=tester').data
  check('协会页面徽章 ≥1 星', info.badgeStar >= 1, `${info.badgeStar}星, 最重=${info.maxCaughtWeight}斤`)
  check('下一星门槛提示', info.nextBadgeTarget === info.badgeThresholds[info.badgeStar])
}

// ---------- 4. 协会任务：定向钓目标鱼 → 领奖 ----------
const info2 = localCall('GET', '/api/assoc/info?username=tester').data
const target = info2.tasks.find((t) => !t.expired)
if (target) {
  // 暴力钓目标鱼（成功率取决于鱼池权重，普通鱼很快；山海鱼可能钓不到则跳过领奖断言）
  let taskMsg = null, caught = false
  for (let i = 0; i < 800 && !caught; i++) {
    let c = localCall('POST', '/api/game/cast', { username: 'tester' })
    if (c.code !== 200 && c.message.includes('鱼饵')) {
      localCall('POST', '/api/shop/buy', { username: 'tester', itemId: 5, quantity: 500 })
      c = localCall('POST', '/api/game/cast', { username: 'tester' })
    }
    if (c.code !== 200) break
    const s = localCall('POST', '/api/game/settle', { username: 'tester', encounterId: c.data.encounterId, landed: true, breakType: 'NONE' })
    if (s.code === 200 && s.data.landed && s.data.fishName === target.fishName) {
      caught = true
      taskMsg = (s.data.assocMessages || []).find((m) => m.includes('协会任务达成'))
    }
  }
  if (caught) {
    check('任务达成播报', !!taskMsg, taskMsg || '')
    const cl = localCall('POST', '/api/assoc/task-claim', { username: 'tester', taskId: target.id })
    check('任务奖励领取', cl.code === 200, cl.message)
    const cl2 = localCall('POST', '/api/assoc/task-claim', { username: 'tester', taskId: target.id })
    check('重复领奖被拒', cl2.code === 400)
  } else {
    console.log('  ⚠️ 目标鱼 ' + target.fishName + ' 未在 800 竿内钓到（山海级属正常概率），跳过领奖断言')
  }
} else {
  console.log('  ⚠️ 无进行中任务可测')
}

// ---------- 5. 边界：不存在的用户 / 比赛二次结算 ----------
const bad = localCall('GET', '/api/assoc/info?username=nobody')
check('未知用户返回 400', bad.code === 400)

console.log(`\n结果：${pass} 通过，${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
