/**
 * 实名认证 / 防沉迷 / 验证码 接口封装
 * 本地引擎与后端同构：本地模式读写 localStorage，在线模式走 /api/identity/*。
 */
import { localCall } from './localEngine.js'

/** 读取本机实名状态（脱敏） */
export async function loadRealname() {
  const res = await localCall('GET', '/api/identity/realname?username=' + encodeURIComponent(currentUser()))
  return res.code === 200 ? res.data : null
}

/** 保存实名状态（仅脱敏字段）——隐私数据，固定走本地引擎，不上传后端 */
export function saveRealname(data) {
  return Promise.resolve(localCall('POST', '/api/identity/realname', { username: currentUser(), data }))
}

/** 读取当日游玩时长 */
export async function loadPlayState() {
  const res = await localCall('GET', '/api/identity/playtime?username=' + encodeURIComponent(currentUser()))
  return res.code === 200 ? res.data : { date: '', minutes: 0 }
}

/** 累计游玩时长（秒）——固定走本地引擎 */
export function addPlayTime(seconds) {
  return Promise.resolve(localCall('POST', '/api/identity/playtime', { username: currentUser(), seconds }))
}

/** 登录门禁校验（实名 / 宵禁 / 时长） */
export async function checkLoginGate() {
  return localCall('POST', '/api/identity/gate', { username: currentUser() })
}

/** 提交验证码挑战（仅本地引擎需要登记；后端模式可忽略） */
export function registerCaptcha(challenge) {
  try { localCall('POST', '/api/captcha/register', challenge) } catch { /* 忽略 */ }
}

function currentUser() {
  try {
    const s = JSON.parse(localStorage.getItem('bikini_session') || 'null')
    return s && s.username ? s.username : ''
  } catch {
    return ''
  }
}
