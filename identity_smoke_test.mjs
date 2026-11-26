/**
 * 实名认证 / 防沉迷 / 验证码 冒烟测试（Node 直接运行）
 * 运行：node identity_smoke_test.mjs
 */
import {
  generateCode, createChallenge, codeMatches, isExpired, drawSpec, noiseSpec
} from './src/data/captcha.js'
import {
  validateIdCard, parseIdCard, ageOf, isAdult, maskName, maskIdCard,
  normalizeRealname, buildRealnameRecord, inCurfew, checkPlayGate,
  remainingMinutes, localDateKey, isWeekend, addPlayTime, ANTI_ADDICTION
} from './src/data/identity.js'

let pass = 0
let fail = 0
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log('  ✓ ' + name) }
  else { fail++; console.log('  ✗ ' + name + (detail ? '  -> ' + detail : '')) }
}

console.log('\n=== 图形验证码 ===')
const code = generateCode(4, 12345)
check('生成 4 位验证码', code.length === 4, code)
check('验证码只含合法字符', /^[A-HJ-NP-Z2-9]{4}$/.test(code), code)
const seeded2 = generateCode(4, 12345)
check('同种子可复现', seeded2 === code)
const ch = createChallenge({ length: 4, seed: 99, now: 1000, ttl: 5000 })
check('挑战含 token/code', !!ch.token && !!ch.code && ch.code.length === 4)
check('挑战有效期正确', ch.expiresAt === 6000)
check('验证码忽略大小写匹配', codeMatches('ab1x', 'AB1X'))
check('验证码错误不匹配', !codeMatches('ABCD', 'WXYZ'))
check('空输入不匹配', !codeMatches('', 'ABCD'))
check('未过期判定', !isExpired(ch, 2000))
check('已过期判定', isExpired(ch, 7000))
const spec = drawSpec('ABCD', 42)
check('绘制参数长度=字符数', spec.length === 4)
check('旋转角在范围内', spec.every((s) => s.rotate >= -18 && s.rotate <= 18))
check('字号在范围内', spec.every((s) => s.fontSize >= 22 && s.fontSize <= 32))
const noise = noiseSpec(118, 40, 7)
check('干扰线 3 条', noise.lines.length === 3)
check('噪点 28 个', noise.dots.length === 28)

console.log('\n=== 身份证校验（GB 11643 校验位）===')
// 用真实校验位算法生成测试号：11010119900307 + 校验位
function idWithChecksum(body17) {
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const c = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(body17[i]) * w[i]
  return body17 + c[sum % 11]
}
const adultBody = '11010119900307' + '123' // 1990 成年
const adultId = idWithChecksum(adultBody)
check('成年身份证校验通过', validateIdCard(adultId).valid, adultId)
const childBody = '11010120150607' + '123' // 2015 未成年
const childId = idWithChecksum(childBody)
check('未成年身份证校验通过', validateIdCard(childId).valid, childId)
check('校验位错误被拒', !validateIdCard(adultId.slice(0, 17) + (adultId[17] === '0' ? '1' : '0')).valid)
check('位数不足被拒', !validateIdCard('1101011990030712').valid)
check('非法出生日期被拒', !validateIdCard(idWithChecksum('11010119901307123')).valid)
check('含字母被拒', !validateIdCard('ABCDEFGHIJKLMNOPQR').valid)

console.log('\n=== 出生日期 / 年龄 / 成年判定 ===')
const parsed = parseIdCard(adultId)
check('提取出生年份', parsed.birthYear === 1990)
check('提取出生月日', parsed.birthMonth === 3 && parsed.birthDay === 7)
check('性别解析（第17位奇男）', parsed.gender === 'male' || parsed.gender === 'female')
const fixedNow = new Date(2026, 10, 26)
check('周岁计算正确', ageOf(1990, 3, 7, fixedNow) === 36)
check('成年判定 >=18', isAdult(1990, 3, 7, fixedNow) === true)
check('未成年判定 <18', isAdult(2015, 6, 7, fixedNow) === false)
check('生日当天算成年', isAdult(2008, 11, 26, fixedNow) === true)
check('生日前一天未满', isAdult(2008, 11, 27, fixedNow) === false)

console.log('\n=== 脱敏 ===')
check('姓名脱敏保留姓', maskName('张三丰') === '张**')
check('单字姓名不脱敏', maskName('张') === '张')
check('身份证脱敏前6后4', maskIdCard(adultId) === adultId.slice(0, 6) + '********' + adultId.slice(-4))

console.log('\n=== 实名记录构建 ===')
const built = buildRealnameRecord('张三丰', adultId, 1000)
check('成年实名构建成功', built.ok && built.data.adult === true)
check('实名记录已脱敏', built.data.nameMasked === '张**' && built.data.idMasked.includes('*'))
check('实名记录不含完整身份证', !JSON.stringify(built.data).includes(adultId))
const builtChild = buildRealnameRecord('李四', childId, 1000)
check('未成年实名 adult=false', builtChild.ok && builtChild.data.adult === false)
check('空姓名被拒', !buildRealnameRecord('', adultId).ok)
check('错误身份证被拒', !buildRealnameRecord('张三', adultId.slice(0, 17) + '0').ok)

console.log('\n=== 防沉迷门禁 ===')
check('22点处于宵禁', inCurfew(new Date(2026, 10, 26, 22, 0)))
check('早上8点不在宵禁', !inCurfew(new Date(2026, 10, 26, 8, 0)))
check('凌晨2点处于宵禁', inCurfew(new Date(2026, 10, 26, 2, 0)))
// 未实名
const g1 = checkPlayGate(normalizeRealname(null), { date: '', minutes: 0 }, fixedNow)
check('未实名拒绝', !g1.allowed && g1.code === 'NEED_REALNAME')
// 成年不限
const g2 = checkPlayGate(built.data, { date: localDateKey(fixedNow), minutes: 999 }, fixedNow)
check('成年不受时长限制', g2.allowed && g2.code === 'ADULT')
// 未成年宵禁（工作日晚上）
const night = new Date(2026, 10, 26, 22, 30)
const g3 = checkPlayGate(builtChild.data, { date: localDateKey(night), minutes: 0 }, night)
check('未成年宵禁拒绝', !g3.allowed && g3.code === 'CURFEW')
// 未成年白天但时长用尽（工作日 90 分钟）
const day = new Date(2026, 10, 26, 10, 0) // 2026-11-26 是周四
check('工作日判定', !isWeekend(day))
const g4 = checkPlayGate(builtChild.data, { date: localDateKey(day), minutes: 90 }, day)
check('未成年时长用尽拒绝', !g4.allowed && g4.code === 'TIME_UP')
const g5 = checkPlayGate(builtChild.data, { date: localDateKey(day), minutes: 30 }, day)
check('未成年时长未满允许', g5.allowed)
check('剩余时长=60', remainingMinutes(builtChild.data, { date: localDateKey(day), minutes: 30 }, day) === 60)
// 节假日 180 分钟
const weekend = new Date(2026, 10, 28, 10, 0) // 周六
check('周末判定', isWeekend(weekend))
check('节假日上限 180', remainingMinutes(builtChild.data, { date: localDateKey(weekend), minutes: 0 }, weekend) === 180)

console.log('\n=== 在线时长累计 ===')
const t0 = { date: '2026-11-26', minutes: 10 }
const t1 = addPlayTime(t0, 120, fixedNow)
check('累计 2 分钟', t1.minutes === 12, JSON.stringify(t1))
const t2 = addPlayTime({ date: '2026-01-01', minutes: 99 }, 60, fixedNow)
check('跨天清零重算', t2.date === localDateKey(fixedNow) && t2.minutes === 1)

console.log(`\n========== 合计 ${pass + fail} 项：通过 ${pass}，失败 ${fail} ==========`)
process.exit(fail > 0 ? 1 : 0)
