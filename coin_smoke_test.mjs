// 金币合并回归测试：单一货币、旧存档迁移、奖励与文案
// Node 下运行：node coin_smoke_test.mjs
import { localCall, resetLocalSave } from './src/api/localEngine.js'

let pass = 0, fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✅', name, extra) }
  else { fail++; console.log('  ❌', name, extra) }
}

console.log('\n=== 1) 新号只有金币 ===')
resetLocalSave()
let r = localCall('POST', '/api/auth/register', { username: 'cointester', password: '123456' })
ok('注册成功', r.code === 200)
ok('初始金币 50', r.data.shells === 50, `shells=${r.data.shells}`)
ok('金石兼容字段为 0', r.data.goldStones === 0)
r = localCall('GET', '/api/game/me?username=cointester')
ok('档案金币字段正确', r.data.shells === 50 && r.data.goldStones === 0)

console.log('\n=== 2) 抛竿与结算只产金币 ===')
r = localCall('POST', '/api/game/cast', { username: 'cointester' })
ok('抛竿成功', r.code === 200)
const enc = r.data
ok('金石奖励恒为 0', enc.rewardGold === 0, `rewardGold=${enc.rewardGold}`)
ok('金币奖励为正', enc.rewardShells > 0, `reward=${enc.rewardShells}`)
r = localCall('POST', '/api/game/settle', {
  username: 'cointester', encounterId: enc.encounterId, landed: true, breakType: 'NONE'
})
ok('结算成功', r.code === 200 && r.data.landed === true)
ok('金币入账等于奖励', r.data.shells === 50 + enc.rewardShells, `shells=${r.data.shells}`)
ok('结算后金石仍为 0', r.data.goldStones === 0)
ok('结算文案只提金币', r.data.message.includes('金币') && !r.data.message.includes('金石'), r.data.message)

console.log('\n=== 3) 旧存档：金石一次性折算为金币 ===')
const DB_KEY = 'bikini_local_db_v3'
let store = {
  [DB_KEY]: JSON.stringify({
    version: 4,
    nextUserId: 2,
    nextUserItemId: 1,
    users: [{
      id: 1, username: 'legacy', email: 'legacy@x.world', password: '123456',
      permission: 1, shells: 100, goldStones: 50, power: 100, currentMap: 'linghu'
    }],
    userItems: []
  })
}
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
  clear: () => { store = {} }
}
const legacyEngine = await import('./src/api/localEngine.js?coinTest=' + Date.now())
r = legacyEngine.localCall('GET', '/api/game/me?username=legacy')
ok('旧号金币 = 原金币 + 原金石', r.code === 200 && r.data.shells === 150, `shells=${r.data?.shells}`)
ok('旧号金石归零', r.data.goldStones === 0)
const saved = JSON.parse(store[DB_KEY])
ok('迁移结果已写回存档', saved.version === 7 && saved.users[0].shells === 150, `version=${saved.version}`)
// 模拟重新打开页面：再读一次不应重复折算
r = legacyEngine.localCall('GET', '/api/game/me?username=legacy')
ok('重新读取不会重复折算', r.data.shells === 150, `shells=${r.data.shells}`)

console.log(`\n结果：${pass} 通过，${fail} 失败`)
if (fail) process.exitCode = 1
