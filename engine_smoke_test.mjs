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
ok('贝壳增加', r.data.shells > 0, `shells=${r.data.shells}`)
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

console.log('\n=== 5) 根骨 / 境界 ===')
// spongebob 有 200 金石可测
r = call('GET', '/api/game/me?username=spongebob')
ok('spongebob 初始根骨=10', r.data.strength === 10)
r = call('POST', '/api/game/train', { username: 'spongebob' })
ok('根骨 +5', r.code === 200 && r.data.strength === 15, `gold=${r.data.goldStones}`)
r = call('POST', '/api/game/realm-up', { username: 'spongebob' })
ok('境界突破', r.code === 200 && r.data.powerRealm === 2, `nextCost=${r.data.nextRealmCost}`)
r = call('POST', '/api/game/realm-up', { username: 'spongebob' })
ok('连续突破可继续', r.code === 200 && r.data.powerRealm === 3)

console.log('\n=== 6) 钓鱼功法 ===')
r = call('GET', '/api/game/skills')
ok('功法目录 8 种', r.code === 200 && r.data.length === 8)
r = call('POST', '/api/game/cultivate', { username: 'spongebob', skillId: 'jingxin' })
ok('修炼静心诀', r.code === 200, `lv=${r.data?.skills?.jingxin}`)
// 全新账户（0 金石）修炼应被拒
call('POST', '/api/auth/register', { username: 'poor2', password: '123456' })
r = call('POST', '/api/game/cultivate', { username: 'poor2', skillId: 'jingxin' })
ok('无资源修炼被拒', r.code === 400)

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
// 校验全新账户（仅 50 贝壳）买不起 800 贝壳的黄金钓竿（正确拦截）
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
ok('AI 预设列表', r.code === 200 && r.data.length === 8)
r = call('POST', '/api/game/ai-chat', { username: 'tester1', message: '怎么玩' })
ok('AI 命中关键词', r.code === 200 && r.data.reply.length > 0)
r = call('POST', '/api/game/ai-chat', { username: 'tester1', message: '随便说点啥 xyz' })
ok('AI 兜底回复', r.code === 200)

console.log('\n=== 10) 鱼饵切换 ===')
r = call('POST', '/api/game/baits', { username: 'tester1' })
ok('鱼饵列表', r.code === 200 && Array.isArray(r.data))

console.log(`\n=== 结果: ${pass} 通过, ${fail} 失败 ===`)
process.exit(fail > 0 ? 1 : 0)
