/**
 * 新功能端到端验证（走局域网静态服务 → 同源代理 → 后端 8080）
 * 覆盖：地图目录 / 选图持久化 / 专属鱼抛竿 / 指定鱼饵 / 协会 10 任务（≥1 山海 ≥3 神话）
 *       / 钓鱼比赛在线报名、1 分钟匹配、100 人赛道 / 每日签到 / 功法目录
 *
 * 用法：node verify-features.mjs
 * 地址统一取自 src/config/lan.js，换 IP 时只改那一处。
 */
import http from 'node:http'
import { LAN_IP } from './src/config/lan.js'

const HOST = LAN_IP
const PORT = 8081

function call(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : JSON.stringify(body)
    const req = http.request({
      host: HOST, port: PORT, path, method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}
    }, (res) => {
      let buf = ''
      res.on('data', (c) => { buf += c })
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(buf) }) }
        catch { resolve({ status: res.statusCode, raw: buf.slice(0, 200) }) }
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => req.destroy(new Error('请求超时')))
    if (data) req.write(data)
    req.end()
  })
}

let pass = 0, fail = 0
function check(name, ok, extra = '') {
  if (ok) { pass++; console.log('  ✅ ' + name + (extra ? ' | ' + extra : '')) }
  else { fail++; console.log('  ❌ ' + name + (extra ? ' | ' + extra : '')) }
}

// 抛竿 / 鱼饵测试用独立账号，避免消耗体验号 spongebob 的存档；每次跑前补足鱼饵，保证脚本可重复运行
const CAST_USER = 'verify_cast'
await call('POST', '/api/auth/register', { username: CAST_USER, password: '123456' })
// 新号默认 50 金币，普通饵 10/个，买 5 个刚好够本脚本 3 次抛竿
await call('POST', '/api/shop/buy', { username: CAST_USER, itemId: 5, quantity: 5 })

console.log('=== 地图 ===')
const maps = await call('GET', '/api/game/maps')
check('后端提供地图目录', maps.json?.code === 200 && maps.json.data.length === 5,
  `地图数=${maps.json?.data?.length}`)
check('地图含专属鱼概率', maps.json?.data?.some((m) => m.exclusiveRate > 0 && m.exMin > 0),
  maps.json?.data?.map((m) => m.name).join('/'))

const me1 = await call('GET', '/api/game/me?username=spongebob')
check('档案返回当前地图', me1.json?.code === 200 && !!me1.json.data.currentMap,
  `currentMap=${me1.json?.data?.currentMap}`)

const setMap = await call('POST', '/api/game/set-map', { username: 'spongebob', mapId: 'beiyuan' })
check('切换地图成功', setMap.json?.code === 200 && setMap.json.data.currentMap === 'beiyuan',
  setMap.json?.message)
const me2 = await call('GET', '/api/game/me?username=spongebob')
check('地图切换已持久化', me2.json?.data?.currentMap === 'beiyuan', me2.json?.data?.currentMap)

const cast = await call('POST', '/api/game/cast', { username: CAST_USER, mapId: 'jibei' })
check('抛竿按指定地图返回', cast.json?.code === 200 && cast.json.data.mapId === 'jibei',
  `${cast.json?.data?.mapName} · ${cast.json?.data?.fishName}`)

console.log('\n=== 指定鱼饵 ===')
const castBait = await call('POST', '/api/game/cast', { username: CAST_USER, baitId: 5, mapId: 'linghu' })
check('指定鱼饵返回饵信息', castBait.json?.code === 200 && castBait.json.data.baitId === 5,
  `${castBait.json?.data?.baitName || castBait.json?.message}`)
check('鱼饵名称/图标齐全', !!castBait.json?.data?.baitName && !!castBait.json?.data?.baitIcon)
const castBadBait = await call('POST', '/api/game/cast', { username: CAST_USER, baitId: 999999, mapId: 'linghu' })
check('无效饵号回退默认饵不报错', castBadBait.json?.code === 200 && castBadBait.json.data.baitId != null,
  `回退=${castBadBait.json?.data?.baitName}`)

console.log('\n=== 每日签到 / 功法 ===')
const signInfo = await call('GET', '/api/signin/info?username=spongebob')
check('签到状态可查询', signInfo.json?.code === 200 && Array.isArray(signInfo.json.data.weekRewards),
  `连签=${signInfo.json?.data?.streak}`)
check('7 日奖励预览含里程碑', signInfo.json?.data?.weekRewards?.length === 7 &&
  signInfo.json.data.weekRewards[6] > signInfo.json.data.weekRewards[5])
const skillCat = await call('POST', '/api/game/skills')
check('功法目录 8 部', skillCat.json?.code === 200 && skillCat.json.data.length === 8,
  `功法数=${skillCat.json?.data?.length}`)

console.log('\n=== 协会任务 ===')
const info = await call('GET', '/api/assoc/info?username=spongebob')
check('协会数据可访问', info.json?.code === 200)
const tasks = info.json?.data?.tasks || []
check('每波一次发布 10 条任务', tasks.length === 10, `任务数=${tasks.length}`)
check('至少 1 条山海任务', tasks.filter((t) => t.tier === 'SHANHAI').length >= 1,
  `山海=${tasks.filter((t) => t.tier === 'SHANHAI').length}`)
check('至少 3 条神话任务', tasks.filter((t) => t.tier === 'MYTHIC').length >= 3,
  `神话=${tasks.filter((t) => t.tier === 'MYTHIC').length}`)

console.log('\n=== 钓鱼比赛报名 / 匹配 ===')
// 比赛是后端内存状态（一场 1 小时），若上一场仍在跑，新报名会被排进下一场而非 MATCHING。
// 此时如实提示并跳过，避免误报为功能失败；重启后端后即可完整校验。
const probe = await call('GET', '/api/assoc/info?username=' + CAST_USER)
const activeComp = probe.json?.data?.competition
if (activeComp && activeComp.phase && activeComp.phase !== 'NONE' && activeComp.phase !== 'IDLE') {
  console.log(`  ⏭️  跳过比赛报名校验：后端上场比赛仍在进行（阶段=${activeComp.phase}，剩余≈${Math.round((activeComp.remaining || 0) / 1000)}s）。重启后端后重跑可完整校验。`)
} else {
  // 注册两个真人，验证「只有在线报名的真人才进入报名池」
  const suffix = Date.now().toString(36)
  for (const name of ['race_a_' + suffix, 'race_b_' + suffix]) {
    await call('POST', '/api/auth/register', { username: name, password: '123456' })
  }
  const s1 = await call('POST', '/api/assoc/comp-start', { username: 'race_a_' + suffix })
  check('真人 A 报名成功', s1.json?.code === 200 && s1.json.data.phase === 'MATCHING', s1.json?.message)
  const s2 = await call('POST', '/api/assoc/comp-start', { username: 'race_b_' + suffix })
  check('真人 B 加入同一场匹配', s2.json?.code === 200 && s2.json.data.signupCount === 2,
    `报名人数=${s2.json?.data?.signupCount}`)
  const s3 = await call('POST', '/api/assoc/comp-start', { username: 'race_a_' + suffix })
  check('重复报名不占两个名额', s3.json?.data?.signupCount === 2, `报名人数=${s3.json?.data?.signupCount}`)

  const live = await call('GET', '/api/assoc/info?username=race_a_' + suffix)
  const comp = live.json?.data?.competition
  check('比赛处于 1 分钟匹配阶段', comp?.phase === 'MATCHING' && comp.remaining > 0 && comp.remaining <= 60000,
    `剩余=${Math.round((comp?.remaining || 0) / 1000)}s`)
  check('赛道为 100 人（真人优先，人机补齐）', comp?.totalPlayers === 100 && comp?.signupCount === 2,
    `真人=${comp?.signupCount}, 待人机补齐=${comp?.botCount}`)
  check('匹配列表只含在线报名真人', comp?.entries?.length === 2 && comp.entries.every((e) => e.isPlayer),
    `列表=${comp?.entries?.map((e) => e.name).join('/')}`)

  const dupe = await call('POST', '/api/assoc/comp-state', { username: 'race_a_' + suffix })
  check('匹配未结束时不会提前开赛', dupe.json?.data?.competition?.phase === 'MATCHING')
}

console.log(`\n结果：${pass} 通过，${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
