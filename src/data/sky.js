// 天时灵汐：十二时辰 × 五天象
// ---------------------------------------------------------------
// 天时按「本地时间」确定性计算，同一时刻刷新出的天象完全一致；抛竿瞬间
// 由引擎锁定 weatherKey + shichenIndex，前端用 skyFromParts 还原，保证
// 画面显示与结算加成不会因跨时辰边界而错位。
//
// 与后端 SkyUtil / 本地引擎 localEngine.js 同构：
//   · skyAt(date?)        -> 当前天象（含展示字段与 effects）
//   · skyEffects(key, i)  -> 纯数值加成（rareBoost / weightMul / coinMul / tensionMul / waitMul）
//   · skyFromParts(key,i) -> 由 weatherKey + shichenIndex 还原完整天象对象
//   · skyEffectText(fx)   -> 把 effects 渲染成一句中文说明
//
// 天象（weather）决定主加成，时辰（shichen）提供细微波动与文案，二者相乘。

// 十二时辰：index 0~11，每个时辰 2 小时
export const SHICHEN = [
  { name: '子时', span: '23:00–01:00', hourOmen: '夜半灵气归于渊，深水巨物潜行。' },
  { name: '丑时', span: '01:00–03:00', hourOmen: '鸡鸣之前，水面最静，鱼漂轻点。' },
  { name: '寅时', span: '03:00–05:00', hourOmen: '平旦之初，阳气微动，灵鱼开始觅食。' },
  { name: '卯时', span: '05:00–07:00', hourOmen: '日出东方，霞光映水，鱼群浮头。' },
  { name: '辰时', span: '07:00–09:00', hourOmen: '食时已至，水草间饵食丰盛。' },
  { name: '巳时', span: '09:00–11:00', hourOmen: '隅中阳盛，鱼避强光，深潜石底。' },
  { name: '午时', span: '11:00–13:00', hourOmen: '日中火旺，烈日当空，咬钩稀少。' },
  { name: '未时', span: '13:00–15:00', hourOmen: '日昃西斜，暑气渐消，鱼游回浅滩。' },
  { name: '申时', span: '15:00–17:00', hourOmen: '哺时西风起，浪推饵动，咬钩转旺。' },
  { name: '酉时', span: '17:00–19:00', hourOmen: '日落西山，暮色四合，鱼群抢食。' },
  { name: '戌时', span: '19:00–21:00', hourOmen: '黄昏既隐，灵汐初涨，异鱼频现。' },
  { name: '亥时', span: '21:00–23:00', hourOmen: '人定夜深，万籁俱寂，巨物出没。' }
]

// 五天象：key 用于跨端传递，weight 为出现权重
export const WEATHERS = [
  {
    key: 'clear', name: '晴', icon: '☀', color: '#ffd77a', weight: 34,
    omen: '晴空万里，灵湖波光粼粼。',
    effects: { rareBoost: 0, weightMul: 1.0, coinMul: 1.0, tensionMul: 1.0, waitMul: 1.0 }
  },
  {
    key: 'cloudy', name: '多云', icon: '⛅', color: '#cbd6e6', weight: 26,
    omen: '云影浮动，水色忽明忽暗。',
    effects: { rareBoost: 0.02, weightMul: 1.05, coinMul: 1.02, tensionMul: 0.98, waitMul: 0.95 }
  },
  {
    key: 'wind', name: '起风', icon: '🌬', color: '#9fd8d0', weight: 18,
    omen: '风生水起，浪推浮漂，咬钩更急。',
    effects: { rareBoost: 0.04, weightMul: 1.1, coinMul: 1.05, tensionMul: 1.12, waitMul: 0.82 }
  },
  {
    key: 'rain', name: '细雨', icon: '🌧', color: '#8fb8e8', weight: 15,
    omen: '细雨入湖，灵气升腾，稀有灵鱼频出。',
    effects: { rareBoost: 0.08, weightMul: 1.18, coinMul: 1.12, tensionMul: 1.08, waitMul: 0.9 }
  },
  {
    key: 'moon', name: '月华', icon: '🌙', color: '#b9a7ff', weight: 7,
    omen: '月华满天，太阴灵汐盈溢，山海异种临渊。',
    effects: { rareBoost: 0.14, weightMul: 1.3, coinMul: 1.25, tensionMul: 1.18, waitMul: 0.78 }
  }
]

export const WEATHER_MAP = new Map(WEATHERS.map((w) => [w.key, w]))

/** 由小时得到时辰 index（0~11） */
export function shichenIndexOf(date = new Date()) {
  const h = date.getHours()
  // 子时跨 23:00–01:00 → index 0
  return Math.floor(((h + 1) % 24) / 2)
}

/** 由 weatherKey + shichenIndex 确定性计算天象数值加成 */
export function skyEffects(weatherKey, shichenIndex) {
  const w = WEATHER_MAP.get(weatherKey) || WEATHERS[0]
  const i = Number.isFinite(Number(shichenIndex)) ? Number(shichenIndex) : 0
  // 时辰波动：以 0 为中心 ±0.06，正午(6)/子夜(0)加成更高
  const middayBoost = i === 0 || i === 6 ? 0.04 : i === 5 ? -0.03 : 0
  const wave = middayBoost + (((i * 7) % 5) - 2) * 0.01
  const base = w.effects
  return {
    rareBoost: Math.max(0, base.rareBoost + wave * 0.5),
    weightMul: round3(base.weightMul * (1 + wave)),
    coinMul: round3(base.coinMul * (1 + wave * 0.6)),
    tensionMul: round3(base.tensionMul * (1 + wave * 0.8)),
    waitMul: round3(base.waitMul * (1 - wave * 0.5))
  }
}

/** 当前天象（按本地时间确定性） */
export function skyAt(date = new Date()) {
  const shichenIndex = shichenIndexOf(date)
  // 天象按「日期 + 时辰」确定：同一天同一时辰恒定，跨时辰按权重轮转
  const daySeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const weatherKey = weatherKeyFor(daySeed, shichenIndex)
  return skyFromParts(weatherKey, shichenIndex)
}

/** 由 weatherKey + shichenIndex 构造完整展示对象 */
export function skyFromParts(weatherKey, shichenIndex) {
  const w = WEATHER_MAP.get(weatherKey) || WEATHERS[0]
  const i = Number.isFinite(Number(shichenIndex)) ? Number(shichenIndex) : 0
  const sc = SHICHEN[i] || SHICHEN[0]
  const effects = skyEffects(w.key, i)
  return {
    weatherKey: w.key,
    shichenIndex: i,
    weather: w.name,
    icon: w.icon,
    color: w.color,
    shichen: sc.name,
    span: sc.span,
    omen: w.omen,
    hourOmen: sc.hourOmen,
    effects
  }
}

/** 按种子 + 时辰从权重表确定天象（确定性，无随机） */
function weatherKeyFor(daySeed, shichenIndex) {
  const seed = Math.abs(daySeed * 13 + shichenIndex * 97)
  const total = WEATHERS.reduce((s, w) => s + w.weight, 0)
  let r = seed % total
  for (const w of WEATHERS) {
    r -= w.weight
    if (r < 0) return w.key
  }
  return WEATHERS[0].key
}

/** 把 effects 渲染成中文说明 */
export function skyEffectText(effects = {}) {
  const parts = []
  const pct = (v, label, invert) => {
    if (!v || Math.abs(v - 1) < 0.001) return
    const up = v > 1
    const good = invert ? !up : up
    parts.push(`${label}${Math.round(Math.abs(v - 1) * 100)}%${good ? '↑' : '↓'}`)
  }
  if (effects.rareBoost) parts.push(`稀有几率 +${Math.round(effects.rareBoost * 100)}%`)
  pct(effects.weightMul, '鱼重')
  pct(effects.coinMul, '收益')
  pct(effects.waitMul, '等待', true)
  pct(effects.tensionMul, '张力', true)
  return parts.length ? parts.join(' · ') : '风平浪静，诸事如常'
}

function round3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

export default { SHICHEN, WEATHERS, skyAt, skyEffects, skyFromParts, skyEffectText }
