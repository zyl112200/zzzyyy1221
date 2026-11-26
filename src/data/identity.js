/**
 * 实名认证 / 防沉迷核心数据层（Node-safe，无 DOM 依赖）
 * ------------------------------------------------------------------
 * 重要说明（合规边界）：
 *   1. 真正的实名核验必须对接公安权威接口（姓名+身份证二要素），
 *      本项目为个人开源演示，无法也不应伪造权威核验。
 *   2. 本模块只做「格式校验 + 校验位算法 + 出生日期提取 + 成年判定」，
 *      并只持久化脱敏信息（姓名掩码 + 身份证掩码 + 成年标志），
 *      绝不落盘完整身份证号。
 *   3. 防沉迷规则参考国家新闻出版署《关于防止未成年人沉迷网络游戏的通知》：
 *      · 未成年人每日 22:00 - 次日 8:00 不得登录；
 *      · 法定节假日每日 3 小时，其它时间 1.5 小时（此处采用更严格的通用值，可配置）；
 *      · 达到阈值强制下线，并记录当日累计在线时长。
 *   4. 人脸识别同样为浏览器本地演示，抓帧不上传、不做人证比对。
 */

// 身份证校验位权重与校验码（GB 11643-1999）
const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const CHECK_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

/** 防沉迷默认配置（小时） */
export const ANTI_ADDICTION = {
  minorNightStart: 22, // 22:00 起禁止
  minorNightEnd: 8,    // 次日 8:00 才允许
  minorDailyMinutes: 90, // 非节假日每日 1.5 小时
  minorHolidayMinutes: 180, // 节假日每日 3 小时
  warningMinutes: 60   // 临近提示（剩余 30 分钟）
}

/** 校验 18 位身份证号（含校验位），返回 { valid, reason } */
export function validateIdCard(id) {
  const s = String(id || '').trim().toUpperCase()
  if (!/^\d{17}[\dX]$/.test(s)) return { valid: false, reason: '身份证号需为 18 位数字（末位可为 X）' }
  // 出生日期合法性
  const y = Number(s.slice(6, 10))
  const m = Number(s.slice(10, 12))
  const d = Number(s.slice(12, 14))
  const birth = new Date(y, m - 1, d)
  if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d) {
    return { valid: false, reason: '身份证号中的出生日期不合法' }
  }
  const now = new Date()
  if (birth > now) return { valid: false, reason: '出生日期不能晚于今天' }
  // 校验位
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(s[i]) * WEIGHTS[i]
  const expect = CHECK_CODES[sum % 11]
  if (s[17] !== expect) return { valid: false, reason: '身份证校验位不正确，请核对号码' }
  return { valid: true, reason: '' }
}

/** 从身份证号提取出生日期与性别（第 17 位奇男偶女） */
export function parseIdCard(id) {
  const s = String(id || '').trim().toUpperCase()
  if (!/^\d{17}[\dX]$/.test(s)) return null
  return {
    birthYear: Number(s.slice(6, 10)),
    birthMonth: Number(s.slice(10, 12)),
    birthDay: Number(s.slice(12, 14)),
    gender: Number(s[16]) % 2 === 1 ? 'male' : 'female'
  }
}

/** 按出生日期计算周岁（精确到日） */
export function ageOf(birthYear, birthMonth, birthDay, now = new Date()) {
  let age = now.getFullYear() - birthYear
  if (now.getMonth() + 1 < birthMonth || (now.getMonth() + 1 === birthMonth && now.getDate() < birthDay)) {
    age--
  }
  return age
}

/** 成年判定（>= 18 周岁） */
export function isAdult(birthYear, birthMonth, birthDay, now = new Date()) {
  return ageOf(birthYear, birthMonth, birthDay, now) >= 18
}

/** 姓名脱敏：保留姓，其余用 *（单字不脱敏） */
export function maskName(name) {
  const s = String(name || '').trim()
  if (!s) return ''
  if (s.length === 1) return s
  return s[0] + '*'.repeat(s.length - 1)
}

/** 身份证脱敏：保留前 6 后 4，中间用 * */
export function maskIdCard(id) {
  const s = String(id || '').trim().toUpperCase()
  if (s.length !== 18) return s ? s.slice(0, 2) + '****' + s.slice(-2) : ''
  return s.slice(0, 6) + '********' + s.slice(-4)
}

/**
 * 规范化实名状态存档（只存脱敏字段，不存完整身份证）
 */
export function normalizeRealname(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  return {
    verified: !!r.verified,
    nameMasked: String(r.nameMasked || ''),
    idMasked: String(r.idMasked || ''),
    adult: r.adult === true,
    birthYear: typeof r.birthYear === 'number' ? r.birthYear : null,
    age: typeof r.age === 'number' ? r.age : null,
    method: String(r.method || 'idcard'), // idcard | face
    faceVerified: !!r.faceVerified,
    verifiedAt: typeof r.verifiedAt === 'number' ? r.verifiedAt : null
  }
}

/**
 * 依据姓名+身份证生成脱敏实名记录（不落盘完整号码）。
 * 返回 { ok, data | reason }
 */
export function buildRealnameRecord(name, idCard, now = Date.now()) {
  const nm = String(name || '').trim()
  if (!nm) return { ok: false, reason: '请输入真实姓名' }
  const check = validateIdCard(idCard)
  if (!check.valid) return { ok: false, reason: check.reason }
  const parsed = parseIdCard(idCard)
  const adult = isAdult(parsed.birthYear, parsed.birthMonth, parsed.birthDay)
  return {
    ok: true,
    data: normalizeRealname({
      verified: true,
      nameMasked: maskName(nm),
      idMasked: maskIdCard(idCard),
      adult,
      birthYear: parsed.birthYear,
      age: ageOf(parsed.birthYear, parsed.birthMonth, parsed.birthDay),
      method: 'idcard',
      verifiedAt: now
    })
  }
}

/**
 * 判断当前时刻是否处于未成年人宵禁时段。
 * @param {Date} now
 * @param {object} cfg
 */
export function inCurfew(now = new Date(), cfg = ANTI_ADDICTION) {
  const h = now.getHours()
  return h >= cfg.minorNightStart || h < cfg.minorNightEnd
}

/**
 * 防沉迷登录门禁：未实名 / 未成年宵禁 / 当日时长用尽时拒绝。
 * @param {object} realname normalizeRealname 的结果
 * @param {object} playState 当日游玩状态 { date:'YYYY-MM-DD', minutes:number }
 * @param {object} now
 * @returns {{allowed:boolean, reason:string, code:string}}
 */
export function checkPlayGate(realname, playState, now = new Date(), cfg = ANTI_ADDICTION) {
  const rn = normalizeRealname(realname)
  if (!rn.verified) {
    return { allowed: false, code: 'NEED_REALNAME', reason: '请先完成实名认证再入仙门' }
  }
  if (rn.adult) {
    return { allowed: true, code: 'ADULT', reason: '' }
  }
  if (inCurfew(now, cfg)) {
    return { allowed: false, code: 'CURFEW', reason: '仙门宵禁：未成年人 22:00 - 次日 8:00 不得登录，早些歇息吧' }
  }
  const dateKey = localDateKey(now)
  const minutes = playState && playState.date === dateKey ? Number(playState.minutes) || 0 : 0
  const isHoliday = isWeekend(now)
  const limit = isHoliday ? cfg.minorHolidayMinutes : cfg.minorDailyMinutes
  if (minutes >= limit) {
    return { allowed: false, code: 'TIME_UP', reason: `今日修行已满 ${limit} 分钟，请明日再来` }
  }
  return { allowed: true, code: 'OK', reason: '' }
}

/** 当日剩余时长（分钟），成年返回 -1 表示不限 */
export function remainingMinutes(realname, playState, now = new Date(), cfg = ANTI_ADDICTION) {
  const rn = normalizeRealname(realname)
  if (!rn.verified || rn.adult) return -1
  const dateKey = localDateKey(now)
  const minutes = playState && playState.date === dateKey ? Number(playState.minutes) || 0 : 0
  const limit = isWeekend(now) ? cfg.minorHolidayMinutes : cfg.minorDailyMinutes
  return Math.max(0, limit - minutes)
}

/** 本地日期 key YYYY-MM-DD */
export function localDateKey(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 是否周末（演示：按周六周日作为节假日） */
export function isWeekend(now = new Date()) {
  const day = now.getDay()
  return day === 0 || day === 6
}

/**
 * 累计在线时长：把 seconds 累加到当日记录，跨天自动清零。
 * @returns {{date:string, minutes:number}}
 */
export function addPlayTime(playState, seconds, now = new Date()) {
  const dateKey = localDateKey(now)
  const base = playState && playState.date === dateKey ? Number(playState.minutes) || 0 : 0
  return { date: dateKey, minutes: Math.round(base + (Number(seconds) || 0) / 60) }
}
