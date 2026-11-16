/**
 * 局域网连通性自检（零依赖）
 * ---------------------------------------------------------------
 * 用法：npm run check     或     node check-lan.mjs
 *
 * 依次检查：
 *   1) 本机是否真的持有配置里的局域网 IP（换 WiFi / DHCP 后 IP 变了能立刻发现）
 *   2) 后端 http://<IP>:8080/api/health 是否可达
 *   3) 前端 http://<IP>:8081 是否可达（以及 /api 代理是否通）
 * 每项失败都会给出对应处理建议。
 */
import { request } from 'node:http'
import { networkInterfaces } from 'node:os'
import { BACKEND_ORIGIN, LAN_IP, WEB_PORT } from './src/config/lan.js'

const FRONT = `http://${LAN_IP}:${WEB_PORT}`

function get(url, timeout = 2500) {
  return new Promise((resolve) => {
    const req = request(url, { method: 'GET', headers: { accept: 'application/json,text/html' } }, (res) => {
      let body = ''
      res.on('data', (c) => {
        if (body.length < 400) body += c
      })
      res.on('end', () => resolve({ ok: true, status: res.statusCode, body }))
    })
    req.on('error', (e) => resolve({ ok: false, error: e.code || e.message }))
    req.setTimeout(timeout, () => {
      req.destroy()
      resolve({ ok: false, error: 'TIMEOUT' })
    })
    req.end()
  })
}

function localIps() {
  const out = []
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' || net.family === 4) out.push({ name, ip: net.address })
    }
  }
  return out
}

const results = []
function record(label, pass, detail, hint) {
  results.push({ label, pass, detail, hint })
}

console.log('============================================================')
console.log('  仙钓大陆 · 局域网连通性自检')
console.log('============================================================')

// 1) 本机 IP 是否与配置一致
const ips = localIps()
const hit = ips.find((n) => n.ip === LAN_IP)
record(
  `本机持有 ${LAN_IP}`,
  !!hit,
  hit ? `网卡：${hit.name}` : `本机 IP：${ips.map((n) => n.ip).join(', ') || '未取到'}`,
  `如果换了网络，请把 src/config/lan.js 里的 LAN_IP 改成上面列出的实际 IP，然后重启服务并重新 build`
)

// 2) 后端健康检查
const health = await get(`${BACKEND_ORIGIN}/api/health`)
let healthOk = false
if (health.ok && health.status === 200) {
  try {
    healthOk = JSON.parse(health.body).code === 200
  } catch {
    healthOk = false
  }
}
record(
  `后端 ${BACKEND_ORIGIN}/api/health`,
  healthOk,
  health.ok ? `HTTP ${health.status} ${health.body.slice(0, 80)}` : String(health.error),
  '后端没起：双击 start-backend.bat；或端口被占、环境变量 SERVER__PORT 覆盖了 8080'
)

// 3) 前端站点
const page = await get(FRONT)
record(
  `前端 ${FRONT}`,
  page.ok && page.status === 200,
  page.ok ? `HTTP ${page.status}` : String(page.error),
  '前端没起：双击 start.bat（或 npm run online）；端口被占可 node serve-lan.mjs --port 8082'
)

// 4) 前端 /api 代理是否打通
const proxied = await get(`${FRONT}/api/health`)
let proxyOk = false
if (proxied.ok && proxied.status === 200) {
  try {
    proxyOk = JSON.parse(proxied.body).code === 200
  } catch {
    proxyOk = false
  }
}
record(
  `前端 /api 代理 → 后端`,
  proxyOk,
  proxied.ok ? `HTTP ${proxied.status}` : String(proxied.error),
  '网页服务在跑但后端不可达：先修好后端；代理由 serve-lan.mjs 内置，无需额外配置'
)

console.log('')
for (const r of results) {
  console.log(`  ${r.pass ? '✅' : '❌'} ${r.label}  ${r.detail ? '| ' + r.detail : ''}`)
  if (!r.pass && r.hint) console.log(`     → ${r.hint}`)
}

const failed = results.filter((r) => !r.pass).length
console.log('')
if (failed === 0) {
  console.log('全部通过：局域网内其它设备打开 ' + FRONT + ' 即可一起玩 🎣')
  console.log('若别的设备仍打不开，请在 Windows 防火墙放行 ' + WEB_PORT + ' 与 8080 端口。')
} else {
  console.log(`${failed} 项未通过，按上面的提示处理后再跑一次。`)
}
console.log('============================================================')
process.exit(failed === 0 ? 0 : 1)
