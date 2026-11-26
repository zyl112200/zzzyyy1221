/**
 * 图形验证码数据层（Node-safe，无 DOM 依赖）
 * ------------------------------------------------------------------
 * 借鉴开源项目 vue3-captcha-canvas / fox-captcha 的绘制思路：
 *   随机字符 + 旋转 + 干扰线 + 噪点。核心算法抽到本模块，
 *   浏览器端由 CaptchaImage.vue 用 canvas 绘制，Node 端可直接单测。
 *
 * 验证码是一次性、有时效的：生成后 5 分钟有效，校验后立即失效。
 */

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉 I/O/0/1 等易混字符
const DEFAULT_TTL = 5 * 60 * 1000 // 5 分钟

/** 简单可复现的伪随机（便于测试注入种子），生产用 Math.random */
function makeRandom(seed) {
  if (seed == null) return Math.random
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** 生成验证码答案：默认 4 位大写字母/数字混合 */
export function generateCode(length = 4, seed = null) {
  const rnd = makeRandom(seed)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CHARSET[Math.floor(rnd() * CHARSET.length)]
  }
  return code
}

/**
 * 生成一次验证码挑战（不依赖 DOM）。
 * @returns {{token:string, code:string, createdAt:number, expiresAt:number, length:number}}
 */
export function createChallenge({ length = 4, ttl = DEFAULT_TTL, seed = null, now = Date.now() } = {}) {
  const code = generateCode(length, seed)
  const token = 'c' + now.toString(36) + Math.floor((seed != null ? seed : Math.random()) * 1e6).toString(36)
  return {
    token,
    code,
    createdAt: now,
    expiresAt: now + ttl,
    length
  }
}

/** 校验输入是否与答案一致（忽略大小写与首尾空格） */
export function codeMatches(input, code) {
  if (input == null || code == null) return false
  return String(input).trim().toUpperCase() === String(code).trim().toUpperCase()
}

/** 是否已过期 */
export function isExpired(challenge, now = Date.now()) {
  return !challenge || typeof challenge.expiresAt !== 'number' || now > challenge.expiresAt
}

/**
 * 生成 canvas 绘制参数（供 CaptchaImage.vue 使用，也便于测试绘制配置的合法性）
 * 每条字符包含：字符、旋转角度(-18~18deg)、y 偏移、颜色、字号。
 */
export function drawSpec(code, seed = null) {
  const rnd = makeRandom(seed)
  const colors = ['#f6e2a8', '#d4af37', '#e8d4ff', '#b388ff', '#ffe9a8']
  const chars = String(code || '').split('')
  return chars.map((ch) => ({
    ch,
    rotate: Math.round((rnd() * 36 - 18) * 10) / 10,
    dy: Math.round((rnd() * 8 - 4) * 10) / 10,
    color: colors[Math.floor(rnd() * colors.length)],
    fontSize: Math.round(22 + rnd() * 10)
  }))
}

/** 干扰线数量与噪点数量（绘制用） */
export function noiseSpec(width, height, seed = null) {
  const rnd = makeRandom(seed)
  const lines = []
  const lineCount = 3
  for (let i = 0; i < lineCount; i++) {
    lines.push({
      x1: rnd() * width,
      y1: rnd() * height,
      x2: rnd() * width,
      y2: rnd() * height,
      color: `rgba(${180 + Math.floor(rnd() * 60)}, ${150 + Math.floor(rnd() * 80)}, 255, ${(0.25 + rnd() * 0.35).toFixed(2)})`
    })
  }
  const dots = []
  const dotCount = 28
  for (let i = 0; i < dotCount; i++) {
    dots.push({
      x: rnd() * width,
      y: rnd() * height,
      r: 0.6 + rnd() * 1.2,
      color: `rgba(255, 240, 190, ${(0.25 + rnd() * 0.5).toFixed(2)})`
    })
  }
  return { lines, dots }
}
