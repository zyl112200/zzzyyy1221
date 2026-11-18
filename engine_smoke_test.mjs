// 无头冒烟测试：直接驱动 src/api/localEngine.js 跑完整游戏闭环
// 在 Node 下运行（localEngine 自带 localStorage 失败回退到内存）
import { localCall, adminLogin, resetLocalSave } from './src/api/localEngine.js'

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✅', name, extra) }
  else { fail++; console.log('  ❌', name, extra) }
}
const call = (m, u, b) => localCall(m, u, b)

console.log('\n=== 1) 注册 / 登录 ===')
let r = call('POST', '/api/auth/register', { username: 'tester1', password: '123456' })
ok('注册成功', r.code === 200, JSON.stringify(r.data?.username))
r = call('POST', '/api/auth/login', { username: 'tester1', password: '123456' })
ok('登录成功', r.code === 200)
r = call('POST', '/api/auth/login', { username: 'tester1', password: 'wrong' })
ok('错误密码被拒', r.code === 400)
r = call('POST', '/api/auth/register', { username: 'tester1', password: '123456' })
ok('重复注册被拒', r.code === 400)

console.log('\n=== 2) 玩家档案 ===')
r = call('GET', '/api/game/me?username=tester1')
ok('me 返回档案', r.code === 200 && r.data.inventory.length > 0)
ok('新手送初级钓竿', r.data.equippedRodName !== '无')
ok('新手有 5 个普通鱼饵', r.data.totalBait === 5)

console.log('\n=== 3) 抛竿 / 结算 ===')
r = call('POST', '/api/game/cast', { username: 'tester1' })
ok('抛竿成功', r.code === 200, `tier=${r.data?.tier} w=${r.data?.weight}`)
const enc = r.data
ok('咬钩鱼有重量', enc.weight > 0)
ok('结算参数齐全', enc.encounterId && enc.rewardShells >= 0)
r = call('POST', '/api/game/settle', { username: 'tester1', encounterId: enc.encounterId, landed: true, breakType: 'NONE' })
ok('成功上岸入账', r.code === 200 && r.data.landed === true)
ok('金币增加', r.data.shells > 0, `shells=${r.data.shells}`)
// 重复结算同一 encounter 应被拒
let r2 = call('POST', '/api/game/settle', { username: 'tester1', encounterId: enc.encounterId, landed: true })
ok('重复结算被拒', r2.code === 400)

console.log('\n=== 4) 断线 / 断竿 ===')
r = call('POST', '/api/game/cast', { username: 'tester1' })
const enc2 = r.data
r = call('POST', '/api/game/settle', { username: 'tester1', encounterId: enc2.encounterId, landed: false, breakType: 'LINE' })
ok('断线结算成功', r.code === 200 && r.data.landed === false)
// 暴走断竿
r = call('POST', '/api/game/cast', { username: 'tester1' })
const enc3 = r.data
r = call('POST', '/api/game/settle', { username: 'tester1', encounterId: enc3.encounterId, landed: false, breakType: 'ROD' })
ok('断竿结算成功', r.code === 200, r.data.rodBroken === true ? '鱼竿损毁' : '鱼竿保留')

console.log('\n=== 5) 力量成长（钓到超过自身上限 10% 的鱼 → 力量 +10%）===')
r = call('GET', '/api/game/me?username=spongebob')
ok('spongebob 初始力量=100', r.data.power === 100, `power=${r.data.power}`)

// 连钓直到出现力量成长：只有重量 > 力量×1.1 才成长，且固定 +10%
let grown = null
for (let i = 0; i < 80 && !grown; i++) {
  let c = call('POST', '/api/game/cast', { username: 'spongebob' })
  if (c.code !== 200 && String(c.message).includes('鱼饵')) {
    call('POST', '/api/shop/buy', { username: 'spongebob', itemId: 5, quantity: 200 })
    c = call('POST', '/api/game/cast', { username: 'spongebob' })
  }
  if (c.code !== 200) break
  const s = call('POST', '/api/game/settle', {
    username: 'spongebob',
    encounterId: c.data.encounterId,
    landed: true,
    breakType: 'NONE'
  })
  if (s.code === 200 && s.data.powerGain > 0) grown = s.data
}
ok('钓到超上限 10% 的鱼后力量成长', !!grown,
  grown ? `+${grown.powerGain}（${grown.powerGainPct}% / ${grown.powerKind}）→ ${grown.power}` : '80 竿内未触发')
if (grown) {
  ok('成长后力量更高', grown.power > 100, `power=${grown.power}`)
  ok('成长比例固定 10%', grown.powerGainPct === 10, `${grown.powerGainPct}%`)
  ok('力量按当前值增长（100→110）', grown.power === 110, `power=${grown.power}`)
  r = call('GET', '/api/game/me?username=spongebob')
  ok('档案力量已落盘', r.data.power === grown.power, `me.power=${r.data.power}`)
}
call('POST', '/api/auth/register', { username: 'freshpower', password: '123456' })
r = call('GET', '/api/game/me?username=freshpower')
ok('新号力量=100', r.data.power === 100)

console.log('\n=== 6) 钓场地图 ===')
r = call('GET', '/api/game/maps')
ok('地图目录 5 张', r.code === 200 && r.data.length === 5)
ok('地图含专属鱼概率', r.code === 200 && r.data.every((m) => typeof m.exclusiveRate === 'number'))
// 指定地图抛竿：返回的 mapId 应与请求一致
r = call('POST', '/api/game/cast', { username: 'spongebob', mapId: 'jibei' })
ok('指定「极北之地」抛竿', r.code === 200 && r.data.mapId === 'jibei', `mapId=${r.data?.mapId}`)

console.log('\n=== 7) 商店 / 背包 ===')
r = call('GET', '/api/shop/items')
ok('商店 11 件', r.code === 200 && r.data.length === 11)
// spongebob 资金充足，用它测购买与装备
r = call('GET', '/api/game/me?username=spongebob')
const before = r.data.shells
r = call('POST', '/api/shop/buy', { username: 'spongebob', itemId: 2, quantity: 1 })
ok('购买银质钓竿', r.code === 200, `shells ${before}->${r.data.shells}`)
// 买鱼线并装备
r = call('POST', '/api/shop/buy', { username: 'spongebob', itemId: 9, quantity: 1 })
ok('购买螺纹钢阻拦索', r.code === 200)
const me = call('GET', '/api/game/me?username=spongebob').data
const lineUi = me.inventory.find(i => i.itemId === 9)
r = call('POST', '/api/game/equip', { username: 'spongebob', userItemId: lineUi.userItemId })
ok('装备鱼线生效', r.code === 200 && r.data.equippedLineName === '螺纹钢航母阻拦索')
ok('承重 = max(竿,线)', r.data.lineStrength === 100000, `lineStrength=${r.data.lineStrength}`)
// 校验全新账户（仅 50 金币）买不起 800 金币的黄金钓竿（正确拦截）
call('POST', '/api/auth/register', { username: 'poor3', password: '123456' })
r = call('POST', '/api/shop/buy', { username: 'poor3', itemId: 3, quantity: 1 })
ok('资金不足购买被拒', r.code === 400)

console.log('\n=== 8) 后台用户管理 ===')
r = adminLogin({ username: 'admin', password: 'admin123' })
ok('管理员登录', r.code === 200 && r.data.permission === 0)
r = adminLogin({ username: 'spongebob', password: '123456' })
ok('普通玩家进后台被拒(403)', r.code === 403)
r = call('GET', '/api/admin/users?page=1&pageSize=10')
ok('用户列表', r.code === 200 && r.data.total >= 3, `total=${r.data.total}`)
r = call('POST', '/api/admin/users', { username: 'newadmin2', email: 'n2@x.world', password: 'abcdef', permission: 0, shells: 10, strength: 10, goldStones: 0, powerRealm: 1 })
ok('新建用户', r.code === 200)
const createdId = r.data.id
r = call('POST', '/api/admin/users/update', { id: createdId, shells: 999, goldStones: 5 })
ok('编辑用户', r.code === 200 && r.data.shells === 999)
r = call('POST', '/api/admin/users/reset-password', { id: createdId, newPassword: 'newpass' })
ok('重置密码', r.code === 200)
r = call('POST', '/api/admin/users/delete', { id: createdId })
ok('删除用户', r.code === 200)
// 不能删除最后一名管理员
const admins = call('GET', '/api/admin/users?permission=0').data.list
r = call('POST', '/api/admin/users/delete', { id: admins[0].id })
ok('保护最后管理员', r.code === 400)

console.log('\n=== 9) AI 助手 ===')
r = call('POST', '/api/game/ai-dialogs')
ok('AI 预设列表', r.code === 200 && r.data.length >= 8, `count=${r.data?.length}`)
r = call('POST', '/api/game/ai-chat', { username: 'tester1', message: '怎么玩' })
ok('AI 命中关键词', r.code === 200 && r.data.reply.length > 0)
r = call('POST', '/api/game/ai-chat', { username: 'tester1', message: '随便说点啥 xyz' })
ok('AI 兜底回复', r.code === 200)

console.log('\n=== 10) 鱼饵切换 ===')
r = call('POST', '/api/game/baits', { username: 'tester1' })
ok('鱼饵列表', r.code === 200 && Array.isArray(r.data))

console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 ===`)
process.exit(fail > 0 ? 1 : 0)
