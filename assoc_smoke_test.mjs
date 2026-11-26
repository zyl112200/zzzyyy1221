/**
 * 钓鱼协会功能冒烟测试（Node 直跑 localEngine.js，localStorage 用内存 shim）
 * 覆盖：协会任务发布/完成/领奖、2 分钟比赛（含快进结算）、1-9 星徽章认证。
 */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

// 使用相对路径导入，保证在任意机器 / 工作目录下都能运行（原硬编码 D:/workSpace 路径在别的机器上必然失败）
const { localCall, resetLocalSave } = await import('./src/api/localEngine.js')

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
check('首波一次发布 10 条任务', tasks0.length === 10, `任务数=${tasks0.length}`)
const shanhaiCount = tasks0.filter((t) => t.tier === 'SHANHAI').length
const mythicCount = tasks0.filter((t) => t.tier === 'MYTHIC').length
check('至少 1 条山海鱼任务', shanhaiCount >= 1, `山海=${shanhaiCount}`)
check('至少 3 条神话鱼任务', mythicCount >= 3, `神话=${mythicCount}`)
check('徽章初始为 0 星', r2.data.badgeStar === 0)
check('门槛表 9 档', r2.data.badgeThresholds.length === 9, r2.data.badgeThresholds.join('/'))
check('暂无进行中比赛', r2.data.competition === null)

// 未完成不可领奖
const t0 = tasks0[0]
const rc0 = localCall('POST', '/api/assoc/task-claim', { username: 'tester', taskId: t0.id })
check('未完成任务不可领奖', rc0.code === 400)

// ---------- 2. 钓鱼比赛：报名 → 1 分钟匹配 → 100 人参赛 → 1 小时结算 ----------
const rs = localCall('POST', '/api/assoc/comp-start', { username: 'tester' })
check('比赛报名成功', rs.code === 200, rs.message)
check('报名后进入匹配阶段', rs.data.phase === 'MATCHING', rs.data.phase)
const matching = localCall('GET', '/api/assoc/info?username=tester').data.competition
check('匹配阶段展示在线报名真人', matching.phase === 'MATCHING' && matching.signupCount === 1,
  `报名=${matching.signupCount}, 列表=${matching.entries.length}`)
// 同一人重复报名不会在匹配池里出现两次
localCall('POST', '/api/assoc/comp-start', { username: 'tester' })
const dupInfo = localCall('GET', '/api/assoc/info?username=tester').data.competition
check('重复报名不产生两个参赛位', dupInfo.signupCount === 1, `报名=${dupInfo.signupCount}`)

// 匹配 1 分钟到期 → 自动开赛，报名真人 + 人机补齐到 100 人
Date.now = () => realNow() + 61 * 1000
const running = localCall('POST', '/api/assoc/comp-state', { username: 'tester' }).data.competition
check('匹配后自动开赛', running.phase === 'RUNNING', running.phase)
check('参赛人数 100', running.entries.length === 100, `entries=${running.entries.length}`)
check('真人在场、人机补齐', running.signupCount === 1 && running.botCount === 99,
  `真人=${running.signupCount}, 人机=${running.botCount}`)
check('比赛时长 1 小时', running.duration === 60 * 60 * 1000, `${running.duration / 60000} 分钟`)

// 钓一竿并成功上岸，验证比赛累计播报
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

// 1 小时到期 → 自动结算并发保底奖励
Date.now = () => realNow() + 61 * 1000 + 60 * 60 * 1000 + 1000
const rs2 = localCall('POST', '/api/assoc/comp-state', { username: 'tester' })
const done = rs2.data.competition
check('到点自动结算', rs2.code === 200 && done.finalized === true, `名次=${done.rank}`)
check('参赛保底奖励到账', !!done.reward && done.reward.shells >= 1000000,
  `第${done.rank}名 ${done.reward?.title} ${done.reward?.shells} 金币`)
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

// ---------- 4. 协会任务：新号定向钓目标鱼 → 达成本次首报 → 领奖 ----------
// 用全新账号做这一步：任务进度按用户记录，「达成」播报只在首次记录进度时触发，
// 复用前面的 tester 会因它已钓过同种鱼而拿不到播报（旧版测试就踩了这个坑）。
const rTask = localCall('POST', '/api/auth/register', { username: 'tasker', password: '123456' })
check('任务测试号注册', rTask.code === 200, rTask.message)

const info2 = localCall('GET', '/api/assoc/info?username=tasker').data
// 优先挑普通 / 稀有鱼任务，避免山海鱼概率太低导致断言在 800 竿内不稳定
const target = info2.tasks.find((t) => !t.expired && (t.tier === 'COMMON' || t.tier === 'RARE'))
  || info2.tasks.find((t) => !t.expired)
if (target) {
  // 新号只有 50 金币，先通过后台接口充值，方便批量补饵
  const list = localCall('GET', '/api/admin/users?keyword=tasker&page=1&pageSize=10').data.list
  const taskerRow = list.find((u) => u.username === 'tasker')
  localCall('POST', '/api/admin/users/update', { id: taskerRow.id, shells: 300000 })

  // 暴力钓目标鱼（成功率取决于鱼池权重，普通鱼很快；山海鱼可能钓不到则跳过领奖断言）
  let taskMsg = null, caught = false
  for (let i = 0; i < 800 && !caught; i++) {
    let c = localCall('POST', '/api/game/cast', { username: 'tasker' })
    if (c.code !== 200 && c.message.includes('鱼饵')) {
      localCall('POST', '/api/shop/buy', { username: 'tasker', itemId: 5, quantity: 500 })
      c = localCall('POST', '/api/game/cast', { username: 'tasker' })
    }
    if (c.code !== 200) break
    const s = localCall('POST', '/api/game/settle', { username: 'tasker', encounterId: c.data.encounterId, landed: true, breakType: 'NONE' })
    if (s.code === 200 && s.data.landed && s.data.fishName === target.fishName) {
      caught = true
      taskMsg = (s.data.assocMessages || []).find((m) => m.includes('协会任务达成'))
    }
  }
  if (caught) {
    check('任务达成播报', !!taskMsg, taskMsg || '')
    const cl = localCall('POST', '/api/assoc/task-claim', { username: 'tasker', taskId: target.id })
    check('任务奖励领取', cl.code === 200, cl.message)
    const cl2 = localCall('POST', '/api/assoc/task-claim', { username: 'tasker', taskId: target.id })
    check('重复领奖被拒', cl2.code === 400)
  } else {
    console.log('  ⚠️ 目标鱼 ' + target.fishName + ' 未在 800 竿内钓到（山海级属正常概率），跳过领奖断言')
  }
} else {
  console.log('  ⚠️ 无进行中任务可测')
}

// ---------- 5. 名次奖励档位：前三 / 4~10 / 11~30 / 31+ ----------
const rankers = []
for (let i = 1; i <= 31; i++) {
  const name = 'ranker' + i
  const rr = localCall('POST', '/api/auth/register', { username: name, password: '123456' })
  if (rr.code === 200) rankers.push(name)
}
check('奖励档位测试号 31 个', rankers.length === 31, `实际=${rankers.length}`)
for (const name of rankers) localCall('POST', '/api/assoc/comp-start', { username: name })
Date.now = () => realNow() + 61 * 1000
localCall('POST', '/api/assoc/comp-state', { username: rankers[0] }) // 匹配结束 → 开赛
Date.now = () => realNow() + 61 * 1000 + 60 * 60 * 1000 + 1000
const tierState = localCall('POST', '/api/assoc/comp-state', { username: rankers[0] }).data.competition
check('档位测试比赛已结算', tierState.finalized === true && tierState.realPlayerCount === 31,
  `真人=${tierState.realPlayerCount}`)
const expectedShells = (rank) =>
  rank === 1 ? 100000000 : rank === 2 ? 50000000 : rank === 3 ? 10000000
    : rank <= 10 ? 5000000 : rank <= 30 ? 3000000 : 1000000
const tierSamples = [1, 2, 3, 4, 10, 11, 30, 31]
let tiersOk = true
const tierDetail = []
for (const rank of tierSamples) {
  const info = localCall('GET', `/api/assoc/info?username=${rankers[rank - 1]}`).data
  const got = info.competition?.reward?.shells
  if (got !== expectedShells(rank)) tiersOk = false
  tierDetail.push(`#${rank}=${got}`)
}
check('名次奖励档位正确', tiersOk, tierDetail.join(' '))
Date.now = realNow

// ---------- 6. 边界：不存在的用户 / 比赛二次结算 ----------
const bad = localCall('GET', '/api/assoc/info?username=nobody')
check('未知用户返回 400', bad.code === 400)

console.log(`\n结果：${pass} 通过，${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
