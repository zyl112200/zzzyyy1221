<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import SignInDialog from '../components/SignInDialog.vue'
import GameIcon from '../components/GameIcon.vue'
import { getSession } from '../store/session'
import { meApi, castApi, settleApi, baitsApi, mapsApi, setMapApi } from '../api/game'
import { aiCelebrate } from '../store/aiAssistant'
import { FISH_SPRITES } from '../data/fishSprites'
import { rodSprite } from '../data/rodSprites'
import { MAPS, MAP_MAP, DEFAULT_MAP } from '../data/maps'
import { icon } from '../data/icons'
import { calcFishingOdds } from '../data/fishingOdds'
import { skyAt, skyFromParts, skyEffectText } from '../data/sky.js'
import { FORTUNE_MAP } from '../data/fortune.js'
import { applyCatch, normalizeFeature, blessingOf, forgeBonus } from '../data/feature.js'
import { loadFeature, saveFeature } from '../api/featureApi.js'

const session = getSession()
const username = session ? session.username : ''

const profile = reactive({
  username,
  shells: 0,
  goldStones: 0,
  power: 100,          // 总力量（基础 × (1+修为%)）
  basePower: 100,      // 基础力量
  cultivation: 0,      // 修为百分比（无上限）
  currentMap: DEFAULT_MAP,
  equippedRodId: null,
  equippedRodName: '无',
  equippedRodPower: 0,
  equippedLineName: '无',
  lineStrength: 0,
  maxCatchWeight: 0,
  totalBait: 0,
  luckOwned: false,
  skills: [],          // 已修炼功法 id 列表（功法阁）
  inventory: []
})

// ---------------- 天时灵汐 / 仙缘奇遇 / 本命法宝 ----------------
// 天时按本地时间确定性刷新；抛竿后改用引擎返回的时辰+天象分量，保证画面与结算完全一致。
const skyNow = ref(skyAt())
const castSky = ref(null)
const activeSky = computed(() => castSky.value || skyNow.value)
const fortuneNow = computed(() => FORTUNE_MAP.get(encounter.value && encounter.value.fortuneId) || null)
const featureState = ref(null)
const blessing = computed(() => blessingOf(featureState.value))
// 环境张力：天时 × 奇遇 × 本命法宝（三者都以倍率作用在搏鱼张力上升速度上）
const envTensionMul = computed(() => {
  const skyFx = activeSky.value.effects || {}
  const f = fortuneNow.value || {}
  return (skyFx.tensionMul || 1) * (f.tensionMul || 1) * forgeBonus(blessing.value).tensionMul
})
const envWaitMul = computed(() => (activeSky.value.effects || {}).waitMul || 1)
let skyTimer = null

// phases: idle | casting | waiting | bite | fight | result
const phase = ref('idle')
const encounter = ref(null)
const result = ref(null)
const recent = ref([])
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null

// 切换鱼饵
const baits = ref([])
const selectedBaitId = ref(null)
const selectedBait = computed(() => baits.value.find((b) => b.itemId === selectedBaitId.value) || null)
const hasBait = computed(() => baits.value.length > 0)

// 地图选择（不同地图的专属鱼概率与建议力量不同）
const maps = ref([])
const selectedMapId = ref(null)
const showMap = ref(false)
const showOdds = ref(false)
const selectedMap = computed(() => maps.value.find((m) => m.id === selectedMapId.value) || null)
// 视觉主题始终取本地完整配置：后端地图目录只提供数值，不含场景图
const sceneMap = computed(() => MAP_MAP.get(selectedMapId.value) || MAP_MAP.get(profile.currentMap) || MAP_MAP.get(DEFAULT_MAP))
const sceneImage = computed(() => (sceneMap.value && sceneMap.value.scene) || '')
const sceneTheme = computed(() => (sceneMap.value && sceneMap.value.theme) || DEFAULT_MAP)
const mapThumb = (m) => {
  const local = MAP_MAP.get(m.id)
  return icon((local && local.icon) || m.icon)
}
const mapSwitchName = ref('')
let mapSwitchTimer = null

// 水族箱：把玩家已钓到的鱼放进湖里巡游，收集得越多、湖里越热闹。
// 未解锁任何鱼时用默认鱼影兜底；位置/大小由鱼名哈希决定，保证每次渲染稳定不跳动。
const DEFAULT_AMBIENT = [
  FISH_SPRITES.qingyu, FISH_SPRITES.shadingyu, FISH_SPRITES.hetun, FISH_SPRITES.xiaochouyu
]
function hashOf(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
const ambientFish = computed(() => {
  const caught = Array.isArray(profile.codex) ? profile.codex : []
  const sprites = caught.map((name) => FISH_SPRITES[name]).filter(Boolean)
  const pool = sprites.length ? sprites : DEFAULT_AMBIENT
  // 最多 8 尾，避免画面过密；已钓鱼优先，不足再用默认鱼补足到至少 4 尾
  const list = pool.slice(0, 8)
  while (list.length < 4) list.push(DEFAULT_AMBIENT[list.length % DEFAULT_AMBIENT.length])
  return list.map((sprite, i) => {
    const h = hashOf((caught[i] || '') + i)
    return {
      sprite,
      left: (8 + (h % 78)) + '%',
      top: (64 + ((h >> 3) % 24)) + '%',
      size: 40 + ((h >> 6) % 26),
      delay: '-' + (h % 24) + 's',
      dur: (15 + ((h >> 9) % 14)) + 's',
      reverse: (h & 1) === 1
    }
  })
})

// 钓况预估：按在线后端 cast 算法实时计算各品质概率与可钓重量
// 随地图 / 鱼饵 / 幸运物 / 装备变化即时刷新，与实际抛竿一致
const odds = computed(() => {
  const m = selectedMap.value || {}
  return calcFishingOdds({
    strength: profile.power,
    maxCatch: profile.maxCatchWeight || 800,
    rodPower: profile.equippedRodPower || 0,
    luck: !!profile.luckOwned,
    premium: (selectedBait.value && selectedBait.value.power > 0) || false,
    guanshui: Array.isArray(profile.skills) && profile.skills.includes('guanshui'),
    exBaseRate: m.exclusiveRate || 0,
    exMin: m.exMin != null ? m.exMin : 1,
    exMax: m.exMax != null ? m.exMax : 1
  })
})

async function loadMaps() {
  try {
    const res = await mapsApi()
    if (res.code === 200 && Array.isArray(res.data) && res.data.length) {
      maps.value = res.data
    } else {
      // 在线后端未提供地图目录时，退回前端内置配置，保证选图面板可用
      maps.value = MAPS
    }
  } catch (e) {
    maps.value = MAPS
  }
  // 默认选中当前所在地图
  if (!maps.value.find((m) => m.id === selectedMapId.value)) {
    selectedMapId.value = profile.currentMap || DEFAULT_MAP
  }
}

/** 选图：本地即时切换，并持久化到后端 / 本地引擎，供「当前所在」与抛竿默认地图使用 */
async function selectMap(m) {
  // 建议力量不足的钓场：给出明确风险提示（保留挑战自由，但不再"假锁"无反馈）
  if (m.recommendPower && profile.power < m.recommendPower) {
    const need = fmtWeight(m.recommendPower)
    const go = window.confirm(
      `「${m.name}」建议力量 ≥ ${need}，你当前仅 ${fmtWeight(profile.power)}。\n` +
      `境界不足时巨物更易挣断鱼线、收线更吃力。仍要前往挑战吗？`
    )
    if (!go) return
  }
  selectedMapId.value = m.id
  showMap.value = false
  profile.currentMap = m.id
  showToast(`已抵达「${m.name}」，钓场画面已切换`)
  mapSwitchName.value = m.name
  clearTimeout(mapSwitchTimer)
  mapSwitchTimer = setTimeout(() => { mapSwitchName.value = '' }, 1600)
  try {
    const res = await setMapApi(username, m.id)
    if (res.code === 200 && res.data) profile.currentMap = res.data.currentMap || m.id
  } catch { /* 断网也不影响本地选图 */ }
}

async function loadBaits() {
  try {
    const res = await baitsApi(username)
    if (res.code === 200) {
      baits.value = res.data || []
      // 当前选择无效（用完/不存在）时自动选第一个
      if (!baits.value.find((b) => b.itemId === selectedBaitId.value)) {
        selectedBaitId.value = baits.value.length ? baits.value[0].itemId : null
      }
    }
  } catch (e) {
    /* 鱼饵列表加载失败不阻断钓鱼 */
  }
}

// 搏鱼状态
const tension = ref(0)
const progress = ref(0)
const holding = ref(false)
const berserk = ref(false)
const flash = ref(false)
const burst = ref(null)

let rafHandle = null
let lastTs = 0
let waitTimer = null
let biteTimer = null
let pullAcc = 0
let pullInterval = 1.6
let berserkRolled = false

// ---------------- 物理震动（屏幕抖动 + 手机振动） ----------------
// 鱼会朝某个方向冲刺，屏幕抖动方向与手机震动节奏都跟随这个方向
const shakeX = ref(0)
const shakeY = ref(0)
let shakeAmp = 0        // 当前震动强度（px），随时间指数衰减
let shakeDirX = 1       // 鱼当前冲刺方向（单位向量）
let shakeDirY = 0
let shakeSeed = 0
let berserkFlipAcc = 0  // 暴走换向计时
let berserkFlipGap = 0.2

const pageStyle = computed(() => ({
  transform: shakeX.value || shakeY.value ? `translate(${shakeX.value}px, ${shakeY.value}px)` : undefined
}))

/** 手机振动能力（桌面浏览器不支持时自动降级为纯屏幕抖动） */
const canVibrate = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
const vibEnabled = ref(localStorage.getItem('fish_vibrate') !== '0')
function vibrate(pattern) {
  if (!vibEnabled.value || !canVibrate) return
  try { navigator.vibrate(pattern) } catch { /* 部分浏览器需要用户手势后才可用 */ }
}
function stopVibrate() {
  if (!canVibrate) return
  try { navigator.vibrate(0) } catch { /* ignore */ }
}
function toggleVibrate() {
  vibEnabled.value = !vibEnabled.value
  localStorage.setItem('fish_vibrate', vibEnabled.value ? '1' : '0')
  if (vibEnabled.value) vibrate(60)
  else stopVibrate()
  showToast(vibEnabled.value ? '震动已开启' : '震动已关闭')
}

/** 随机一条鱼的冲刺方向：8 方向（左右、上下、四个斜向） */
function randomFishDir() {
  const dirs = [
    { x: 1, y: 0 }, { x: -1, y: 0 },
    { x: 0, y: -1 }, { x: 0, y: 1 },
    { x: 0.7, y: -0.7 }, { x: -0.7, y: -0.7 },
    { x: 0.7, y: 0.7 }, { x: -0.7, y: 0.7 }
  ]
  const d = dirs[(Math.random() * dirs.length) | 0]
  shakeDirX = d.x
  shakeDirY = d.y
}

/**
 * 鱼发力：屏幕朝鱼移动方向猛震 + 手机短震
 * @param amp  震动幅度（px）
 * @param vib  振动节奏，单次数值或 [震,停,震…] 数组
 */
function kick(amp = 8, vib = 40) {
  randomFishDir()
  shakeAmp = Math.max(shakeAmp, amp)
  shakeSeed = Math.random() * 1000
  // 鱼也朝这个方向猛冲
  fishVelX += shakeDirX * amp * 4.5
  fishVelY += shakeDirY * amp * 1.6
  vibrate(vib)
}

/** 暴走专属狂野震动节奏（随机组合，长短交替） */
function berserkVibe() {
  const vibes = [
    [120, 40, 160], [60, 30, 60, 30, 140], [180, 60, 220],
    [40, 20, 40, 20, 40, 20, 120], [90, 40, 90, 40, 200]
  ]
  return vibes[(Math.random() * vibes.length) | 0]
}

// ---------------- 水中可见的鱼（立绘游动 / 挣扎） ----------------
// 位置为场景归一化坐标（0~1），left/top 百分比定位，transform 负责朝向/摆动/大小
const fishPos = reactive({ x: 0.22, y: 0.7, face: 1, wig: 0 })
let fishVelX = 0
let fishVelY = 0
let swimRaf = null

const fishSprite = computed(() => {
  const enc = encounter.value
  return enc ? FISH_SPRITES[enc.fishName] || null : null
})
const burstSprite = computed(() => {
  const b = burst.value
  return b ? FISH_SPRITES[b.name] || null : null
})
/** 当前装备鱼竿的写实立绘（钓鱼场景与 HUD 共用） */
const equippedRodSprite = computed(() => {
  const id = profile.equippedRodId
  return (id && rodSprite(id)) || rodSprite(1) // 未装备时回退到写实初级钓竿，避免卡通 SVG
})
/** 体型随重量对数增长：1 斤小鱼 ~0.8，百万斤巨物 ~2.6 */
const fishScale = computed(() => {
  const w = encounter.value ? encounter.value.weight : 1
  const s = 0.55 + Math.log10(Math.max(0.5, w) + 1) * 0.34
  return Math.min(2.6, Math.max(0.6, s))
})
const fishStyle = computed(() => ({
  left: (fishPos.x * 100).toFixed(2) + '%',
  top: (fishPos.y * 100).toFixed(2) + '%',
  width: Math.round(195 * fishScale.value) + 'px',
  transform: `translate(-50%, -50%) scaleX(${fishPos.face}) rotate(${fishPos.wig.toFixed(1)}deg)`
}))

/** 等待 / 咬钩阶段的巡游动画（此时搏鱼 RAF 尚未启动） */
function swimLoop(ts) {
  if (phase.value !== 'waiting' && phase.value !== 'bite') return
  const t = ts / 1000
  const biting = phase.value === 'bite'
  const tx = 0.5 + Math.sin(t * (biting ? 1.6 : 0.7)) * (biting ? 0.14 : 0.3)
  const ty = (biting ? 0.66 : 0.68) + Math.sin(t * 1.3) * 0.08
  fishPos.x += (tx - fishPos.x) * 0.025
  fishPos.y += (ty - fishPos.y) * 0.025
  const dir = Math.cos(t * (biting ? 1.6 : 0.7))
  if (Math.abs(dir) > 0.15) fishPos.face = dir > 0 ? 1 : -1
  fishPos.wig = Math.sin(t * (biting ? 12 : 8)) * (biting ? 9 : 6)
  swimRaf = requestAnimationFrame(swimLoop)
}

function stopSwim() {
  if (swimRaf) cancelAnimationFrame(swimRaf)
  swimRaf = null
}

function resetFish() {
  fishPos.x = 0.22
  fishPos.y = 0.7
  fishPos.face = 1
  fishPos.wig = 0
  fishVelX = 0
  fishVelY = 0
}

const BOB = { x: 800, y: 642 }

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2600)
}

// ---------------- 音效（WebAudio，无需素材） ----------------
let audioCtx = null
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)() } catch { audioCtx = null }
  }
  return audioCtx
}
function beep(freq, dur = 0.08, type = 'sine', vol = 0.05, slideTo = null) {
  const ctx = ensureAudio()
  if (!ctx) return
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, ctx.currentTime)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur)
  g.gain.setValueAtTime(vol, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
  o.connect(g).connect(ctx.destination)
  o.start()
  o.stop(ctx.currentTime + dur)
}
const sfxCast = () => beep(320, 0.22, 'sawtooth', 0.04, 90)
const sfxBite = () => { beep(660, 0.07, 'square', 0.06); setTimeout(() => beep(880, 0.08, 'square', 0.06), 90) }
const sfxSnap = () => beep(150, 0.35, 'sawtooth', 0.09, 50)
const sfxWin = () => { beep(523, 0.1); setTimeout(() => beep(659, 0.1), 100); setTimeout(() => beep(784, 0.18), 200) }

// ---------------- 数据 ----------------
async function loadProfile() {
  try {
    const res = await meApi(username)
    if (res.code === 200) {
      Object.assign(profile, res.data)
      loadBaits()
      loadMaps()
    } else {
      showToast(res.message || '加载失败')
    }
  } catch (e) {
    showToast(e.message || '后端未启动，请先启动后端')
  }
}

// ---------------- 钓竿 / 鱼线几何（SVG） ----------------
// 写实鱼竿立绘的定位参数（SVG 1600×900 坐标系）。
// 立绘主体 1024×1024：握把在左下、竿尖在右上；水平翻转后置于右下，竿尖朝水面中央。
const ROD_GEO = {
  x: 880, y: 380, size: 820,    // 图片左上角与边长（右下手持视角）
  tipX: 0.07, tipY: 0.10,       // 翻转后竿尖在图片内的比例位置
  gripX: 0.90, gripY: 0.90,     // 翻转后握把（旋转支点）在图片内的比例位置
  bendDeg: 8                    // 搏鱼最大下压旋转角
}
const rodFlipX = ROD_GEO.x * 2 + ROD_GEO.size  // 水平镜像位移（绕图片中轴）
const rodGrip = {
  x: ROD_GEO.x + ROD_GEO.size * ROD_GEO.gripX,
  y: ROD_GEO.y + ROD_GEO.size * ROD_GEO.gripY
}

/** 搏鱼时鱼竿绕握把下压的角度（度） */
const rodBendDeg = computed(() => {
  const t = Math.min(1, tension.value / 100)
  return phase.value === 'fight' ? -t * ROD_GEO.bendDeg : 0
})

/** 写实立绘的 SVG transform（水平翻转 + 绕握把下压） */
const rodImageTransform = computed(() =>
  `rotate(${rodBendDeg.value.toFixed(2)} ${rodGrip.x} ${rodGrip.y}) translate(${rodFlipX} 0) scale(-1 1)`
)

/** 写实立绘模式下竿尖的屏幕坐标；无立绘时沿用原 SVG 竿尖 */
const rodTip = computed(() => {
  const t = Math.min(1, tension.value / 100)
  const bend = phase.value === 'fight' ? t : 0
  if (equippedRodSprite.value) {
    // 翻转后竿尖基准位置，再绕握把旋转 bendDeg
    const bx = ROD_GEO.x + ROD_GEO.size * ROD_GEO.tipX
    const by = ROD_GEO.y + ROD_GEO.size * ROD_GEO.tipY
    const a = rodBendDeg.value * Math.PI / 180
    const dx = bx - rodGrip.x
    const dy = by - rodGrip.y
    return {
      x: rodGrip.x + dx * Math.cos(a) - dy * Math.sin(a),
      y: rodGrip.y + dx * Math.sin(a) + dy * Math.cos(a)
    }
  }
  return { x: 1185 - bend * 95, y: 458 + bend * 190 }
})
const rodPath = computed(() => {
  const tip = rodTip.value
  return `M 1512 902 C 1408 792, 1302 618, ${tip.x} ${tip.y}`
})
const inWater = computed(() => ['waiting', 'bite', 'fight'].includes(phase.value))
const linePath = computed(() => {
  const tip = rodTip.value
  const t = Math.min(1, tension.value / 100)
  const mx = (tip.x + BOB.x) / 2
  const my = (tip.y + BOB.y) / 2 + 70 * (1 - t)
  return `M ${tip.x} ${tip.y} Q ${mx} ${my} ${BOB.x} ${BOB.y}`
})

// ---------------- 抛竿流程 ----------------
function clearTimers() {
  clearTimeout(waitTimer)
  clearTimeout(biteTimer)
  waitTimer = null
  biteTimer = null
}

async function cast() {
  if (phase.value !== 'idle' && phase.value !== 'result') return
  if (!hasBait.value || profile.totalBait <= 0) {
    showToast('鱼饵用完啦，去仙市买点鱼饵')
    return
  }
  ensureAudio()
  clearTimers()
  result.value = null
  encounter.value = null
  phase.value = 'casting'
  tension.value = 0
  progress.value = 0
  berserk.value = false
  berserkRolled = false
  shakeAmp = 0
  shakeX.value = 0
  shakeY.value = 0
  resetFish()
  stopVibrate()
  sfxCast()

  try {
    const res = await castApi(username, selectedBaitId.value, selectedMapId.value, blessing.value)
    if (res.code !== 200) {
      showToast(res.message || '抛竿失败')
      phase.value = 'idle'
      loadBaits()
      return
    }
    encounter.value = res.data
    // 锁定这一竿的天时（用引擎返回值重建，跨时辰边界也不会与结算数值错位）
    castSky.value = res.data.skyKey != null
      ? skyFromParts(res.data.skyKey, res.data.shichenIndex)
      : skyAt()
    profile.totalBait = res.data.totalBait
    profile.shells = res.data.shells
    profile.goldStones = res.data.goldStones
    loadBaits()
    if (fortuneNow.value) showToast(`【仙缘·${fortuneNow.value.name}】${fortuneNow.value.desc}`)
    // 抛竿动画后进入等待
    waitTimer = setTimeout(() => {
      phase.value = 'waiting'
      resetFish()
      stopSwim()
      swimRaf = requestAnimationFrame(swimLoop)
      scheduleBite()
    }, 850)
  } catch (e) {
    showToast(e.message || '后端开小差了')
    phase.value = 'idle'
  }
}

function scheduleBite() {
  const heavy = encounter.value ? encounter.value.difficulty : 0.2
  const sb = skillBonus.value
  const delay = (1100 + Math.random() * 2200 + heavy * 300) * sb.waitMul * envWaitMul.value
  waitTimer = setTimeout(() => {
    if (phase.value !== 'waiting') return
    phase.value = 'bite'
    sfxBite()
    vibrate(90)
    // 潮汐真诀可延长提竿命中窗口
    biteTimer = setTimeout(() => {
      if (phase.value === 'bite') {
        settleOutcome(false, 'ESCAPE')
      }
    }, 2200 + sb.biteAdd)
  }, delay)
}

function strike() {
  if (phase.value !== 'bite') return
  clearTimeout(biteTimer)
  biteTimer = null
  startFight()
}

// ---------------- 搏鱼核心 ----------------
function startFight() {
  phase.value = 'fight'
  stopSwim()
  tension.value = 22
  progress.value = 0
  berserk.value = false
  berserkRolled = false
  holding.value = false
  pullAcc = 0
  pullInterval = 1.5 + Math.random() * 1.1
  berserkFlipAcc = 0
  berserkFlipGap = 0.2
  shakeAmp = 0
  shakeX.value = 0
  shakeY.value = 0
  // 中钩瞬间鱼被拉向浮漂附近
  fishPos.x = 0.5 + (Math.random() - 0.5) * 0.2
  fishPos.y = 0.68
  fishVelX = (Math.random() - 0.5) * 30
  fishVelY = -8
  lastTs = 0
  cancelAnimationFrame(rafHandle)
  rafHandle = requestAnimationFrame(loop)
}

function loop(ts) {
  if (phase.value !== 'fight') return
  if (!lastTs) lastTs = ts
  let dt = (ts - lastTs) / 1000
  lastTs = ts
  if (dt > 0.12) dt = 0.12
  if (dt <= 0) { rafHandle = requestAnimationFrame(loop); return }

  const enc = encounter.value
  const diff = enc ? enc.difficulty : 0.2
  const power = enc ? enc.rodPower : 1

  const sb = skillBonus.value
  let reelSpeed = 30 / (0.75 + diff * 0.55) * (0.9 + power * 0.03) * sb.reelMul
  let tensionRise = 16 * (0.6 + diff * 0.42) * sb.tensionMul * envTensionMul.value
  let tensionDrop = 34
  let pullStrength = 7 * (0.5 + diff * 0.5)

  if (berserk.value) {
    reelSpeed *= 0.74
    tensionRise *= 1.5
    pullStrength *= 1.8
  }

  if (holding.value) {
    // 张力处于安全区时收线更快
    const safe = tension.value >= 30 && tension.value <= 78
    progress.value += reelSpeed * dt * (safe ? 1.15 : 0.95)
    tension.value += tensionRise * dt
  } else {
    tension.value -= tensionDrop * dt
    progress.value -= 0.35 * dt
  }

  // 鱼的周期性挣扎：朝随机方向猛冲，屏幕跟随震动 + 手机短震
  pullAcc += dt
  if (pullAcc >= pullInterval) {
    pullAcc = 0
    pullInterval = 1.2 + Math.random() * 1.3
    tension.value += pullStrength * (0.7 + Math.random() * 0.7)
    if (berserk.value) kick(10 + Math.random() * 6, [70, 30, 110])
    else kick(5 + Math.random() * 4, 40)
    beep(90, 0.12, 'triangle', 0.03)
  }

  if (berserk.value) {
    // 暴走持续施压
    tension.value += pullStrength * 0.55 * dt
    // 暴走狂震：鱼频繁换向乱冲，屏幕朝当前方向猛震 + 手机狂野节奏
    berserkFlipAcc += dt
    if (berserkFlipAcc >= berserkFlipGap) {
      berserkFlipAcc = 0
      berserkFlipGap = 0.14 + Math.random() * 0.2
      kick(9 + Math.random() * 8, berserkVibe())
      beep(60 + Math.random() * 60, 0.08, 'sawtooth', 0.04)
    }
  }

  // 临界暴走：接近水面时触发
  if (!berserkRolled && progress.value >= 78) {
    berserkRolled = true
    if (Math.random() < (enc ? enc.berserkChance : 0.3)) {
      berserk.value = true
      kick(14, [200, 60, 260])
      beep(70, 0.5, 'sawtooth', 0.08, 40)
    }
  }

  if (tension.value >= 100) {
    tension.value = 100
    onSnap()
    return
  }
  if (tension.value < 0) tension.value = 0
  if (progress.value >= 100) {
    progress.value = 100
    onLanded()
    return
  }
  if (progress.value < 0) progress.value = 0

  // 屏幕震动衰减：抖动方向始终跟随鱼当前冲刺方向（沿方向往复 + 垂直微抖）
  shakeAmp *= Math.exp(-7 * dt)
  if (shakeAmp > 0.2) {
    const t = ts / 1000 + shakeSeed
    const along = Math.sin(t * 42) * shakeAmp
    const across = Math.sin(t * 67) * shakeAmp * 0.35
    shakeX.value = shakeDirX * along - shakeDirY * across
    shakeY.value = shakeDirY * along + shakeDirX * across
  } else {
    shakeX.value = 0
    shakeY.value = 0
  }

  // 鱼的游动挣扎：跟随冲刺方向猛冲 + 阻尼 + 边界反弹 + 缓慢巡游
  fishVelX += Math.sin(ts / 1000 * 1.6 + shakeSeed) * 10 * dt
  fishVelX *= Math.exp(-2.4 * dt)
  fishVelY *= Math.exp(-2.6 * dt)
  fishPos.x += fishVelX * dt * 0.012
  fishPos.y += fishVelY * dt * 0.008
  if (fishPos.x < 0.14) { fishPos.x = 0.14; fishVelX = Math.abs(fishVelX) }
  if (fishPos.x > 0.86) { fishPos.x = 0.86; fishVelX = -Math.abs(fishVelX) }
  if (fishPos.y < 0.52) { fishPos.y = 0.52; fishVelY = Math.abs(fishVelY) }
  if (fishPos.y > 0.84) { fishPos.y = 0.84; fishVelY = -Math.abs(fishVelY) }
  if (fishVelX > 4) fishPos.face = 1
  else if (fishVelX < -4) fishPos.face = -1
  fishPos.wig = Math.sin(ts / 1000 * (berserk.value ? 16 : 9)) * (berserk.value ? 14 : 7)

  rafHandle = requestAnimationFrame(loop)
}

function onSnap() {
  stopLoop()
  holding.value = false
  flash.value = true
  setTimeout(() => { flash.value = false }, 420)
  sfxSnap()
  vibrate([260, 80, 300])
  // 暴走后更容易挣断鱼竿
  const rodBreak = berserk.value && Math.random() < 0.6
  settleOutcome(false, rodBreak ? 'ROD' : 'LINE')
}

function onLanded() {
  stopLoop()
  holding.value = false
  vibrate([60, 50, 60, 50, 180])
  settleOutcome(true, 'NONE')
}

function stopLoop() {
  cancelAnimationFrame(rafHandle)
  rafHandle = null
  stopSwim()
  shakeAmp = 0
  shakeX.value = 0
  shakeY.value = 0
  stopVibrate()
}

function startHold() {
  if (phase.value !== 'fight') return
  holding.value = true
}

function stopHold() {
  holding.value = false
}

// ---------------- 结算 ----------------
async function settleOutcome(landed, breakType) {
  if (!encounter.value) return
  const enc = encounter.value
  clearTimers()
  stopLoop()
  phase.value = 'settling'
  try {
    const res = await settleApi(username, enc.encounterId, landed, breakType)
    if (res.code === 200) {
      result.value = res.data
      profile.shells = res.data.shells
      profile.goldStones = res.data.goldStones
      profile.power = res.data.power            // 总力量（含修为）
      profile.basePower = res.data.basePower
      profile.cultivation = res.data.cultivation
      recent.value.unshift({
        icon: res.data.fishIcon,
        name: res.data.fishName,
        weight: res.data.weight,
        tier: res.data.tier,
        landed: res.data.landed
      })
      if (recent.value.length > 5) recent.value.pop()
      if (res.data.landed) {
        sfxWin()
        burst.value = { icon: res.data.fishIcon, name: res.data.fishName }
        setTimeout(() => { burst.value = null }, 1400)
      }
      // 钓到神话 / 山海级稀有鱼：自动唤起 AI 助手播报祝贺
      if (res.data.celebrateMessage) {
        setTimeout(() => aiCelebrate(res.data.celebrateMessage), 600)
      }
      // 钓鱼协会播报：任务达成 / 比赛累计 / 徽章认证
      const assocMsgs = res.data.assocMessages || []
      assocMsgs.forEach((m, i) => setTimeout(() => showToast(m), 500 + i * 1800))
      // 洞天福地：把这一竿写进当日悬赏手札，奇遇道行同步入账（在线 / 离线同构）
      try {
        const base = await loadFeature(username, true)
        const st = applyCatch(base, {
          tier: res.data.tier,
          weight: res.data.weight,
          mapId: enc.mapId || profile.currentMap || 'linghu',
          coins: res.data.landed ? (res.data.rewardShells || 0) : 0,
          landed: !!res.data.landed,
          fortuneId: enc.fortuneId || null
        })
        featureState.value = st
        await saveFeature(username, st)
      } catch (e) { /* 统计写入失败不影响本次钓鱼结算 */ }
    } else {
      showToast(res.message || '结算失败')
    }
  } catch (e) {
    showToast(e.message || '结算失败')
  }
  phase.value = 'result'
  await loadProfile()
}

function closeResult() {
  phase.value = 'idle'
  result.value = null
  encounter.value = null
  tension.value = 0
  progress.value = 0
  berserk.value = false
  stopSwim()
  resetFish()
  stopVibrate()
}

// ---------------- 钓鱼功法（功法阁修炼后在此生效） ----------------
// 后端 cast/settle 已按 skills 计算稀有率与收益加成；这里补上搏鱼手感类加成，
// 让静心诀 / 卸力诀 / 四季钓经 / 潮汐真诀在前端抛竿与拉扯时同样真实生效。
const skillBonus = computed(() => {
  const s = Array.isArray(profile.skills) ? profile.skills : []
  return {
    reelMul: s.includes('xieli') ? 1.18 : 1,     // 卸力诀：收线 +18%
    tensionMul: s.includes('jingxin') ? 0.85 : 1, // 静心诀：张力上升 -15%
    waitMul: s.includes('siji') ? 0.75 : 1,       // 四季钓经：等待 -25%
    biteAdd: s.includes('chaoxi') ? 600 : 0       // 潮汐真诀：命中窗口 +0.6s
  }
})

// ---------------- 展示辅助 ----------------
function tierLabel(t) {
  return { COMMON: '普通', RARE: '稀有', LEGENDARY: '传说', MYTHIC: '神话', SHANHAI: '山海' }[t] || '普通'
}
function tierClass(t) {
  return 'tier-' + String(t || 'COMMON').toLowerCase()
}
function fmtWeight(w) {
  if (w == null) return '-'
  return w >= 10000 ? (w / 10000).toFixed(1) + ' 万斤' : w + ' 斤'
}

onMounted(() => {
  loadProfile()
  loadMaps()
  // 洞天状态（本命法宝等级 → 抛竿 blessing）；失败也不影响钓鱼
  loadFeature(username).then((s) => { featureState.value = s }).catch(() => {})
  // 天时每 30 秒刷新，跨时辰自动换象
  skyTimer = setInterval(() => { skyNow.value = skyAt() }, 30000)
})
onBeforeUnmount(() => {
  clearTimers()
  stopLoop()
  stopSwim()
  clearTimeout(toastTimer)
  clearTimeout(mapSwitchTimer)
  clearInterval(skyTimer)
  stopVibrate()
})
</script>

<template>
  <div class="fishing-page" :class="{ 'is-berserk': berserk && phase === 'fight' }" :style="pageStyle">
    <TopBar :shells="profile.shells" :gold-stones="profile.goldStones" :power="profile.power" :cultivation="profile.cultivation" />

    <!-- ================= 场景（写实钓场：随当前地图整页切换） ================= -->
    <div class="scene" :class="`theme-${sceneTheme}`">
      <div class="scene-photo" :key="sceneImage" :style="{ backgroundImage: `url(${sceneImage})` }"></div>
      <div class="scene-tint"></div>

      <!-- 环境鱼影：湖面始终有鱼在游，不需要等到抛竿 -->
      <div class="ambient-school" aria-hidden="true">
        <img
          v-for="(f, i) in ambientFish"
          :key="i"
          class="ambient-fish"
          :class="{ rev: f.reverse }"
          :src="f.sprite"
          alt=""
          draggable="false"
          :style="{
            left: f.left, top: f.top, width: f.size + 'px',
            animationDuration: f.dur, animationDelay: f.delay
          }"
        />
      </div>

      <!-- 水中的鱼：等待时巡游，咬钩时逼近浮漂，搏鱼时挣扎乱窜 -->
      <div
        v-if="inWater && encounter"
        class="fish-sprite"
        :class="[`ph-${phase}`, { frantic: berserk && phase === 'fight' }]"
        :style="fishStyle"
      >
        <img v-if="fishSprite" :src="fishSprite" :alt="encounter.fishName" draggable="false" />
        <span v-else class="fish-emoji">{{ encounter.fishIcon }}</span>
      </div>

      <!-- 第一人称钓竿 + 鱼线 -->
      <svg class="rig" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="rodGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="#5d4037" />
            <stop offset="55%" stop-color="#8d6e63" />
            <stop offset="100%" stop-color="#d7ccc8" />
          </linearGradient>
          <linearGradient id="handleGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="#263238" />
            <stop offset="100%" stop-color="#546e7a" />
          </linearGradient>
        </defs>

        <!-- 鱼线 -->
        <path v-if="inWater" class="fishing-line" :d="linePath" fill="none" />

        <!-- 浮漂 -->
        <g v-if="inWater" class="bobber" :class="{ dip: phase === 'bite' }">
          <ellipse cx="800" cy="652" rx="30" ry="8" fill="rgba(255,255,255,.35)" />
          <circle cx="800" cy="642" r="10" fill="#e53935" />
          <circle cx="800" cy="633" r="8" fill="#fff" />
        </g>
        <g v-if="inWater" class="ripples">
          <circle cx="800" cy="648" r="14" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" />
          <circle cx="800" cy="648" r="14" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2" />
        </g>

        <!-- 鱼竿：优先显示当前装备的写实立绘（随装备切换、搏鱼下压），无立绘时回退通用 SVG -->
        <image
          v-if="equippedRodSprite"
          class="rod-sprite"
          :href="equippedRodSprite"
          :x="ROD_GEO.x" :y="ROD_GEO.y"
          :width="ROD_GEO.size" :height="ROD_GEO.size"
          :transform="rodImageTransform"
          preserveAspectRatio="xMidYMid meet"
        />
        <template v-else>
          <path :d="rodPath" fill="none" stroke="url(#rodGrad)" stroke-width="13" stroke-linecap="round" />
          <path :d="rodPath" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3" stroke-linecap="round" />
          <path d="M 1512 902 L 1442 812" fill="none" stroke="url(#handleGrad)" stroke-width="26" stroke-linecap="round" />
          <circle cx="1468" cy="852" r="26" fill="#37474f" stroke="#90a4ae" stroke-width="4" />
          <circle cx="1468" cy="852" r="9" fill="#cfd8dc" />
        </template>
      </svg>

      <div class="vignette" :class="{ danger: tension > 72 && phase === 'fight', berserk: berserk && phase === 'fight' }"></div>
      <div class="flash" v-if="flash"></div>

      <!-- 上钩的水花 / 成功跃鱼 -->
      <div class="burst" v-if="burst">
        <div class="burst-fish" :class="{ pic: !!burstSprite }">
          <img v-if="burstSprite" :src="burstSprite" :alt="burst.name" draggable="false" />
          <template v-else>{{ burst.icon }}</template>
        </div>
        <div class="splash s1"></div>
        <div class="splash s2"></div>
        <div class="splash s3"></div>
      </div>
    </div>

    <!-- ================= HUD ================= -->
    <div class="hud">
      <div class="hud-card">
        <div class="row map-row">
          <GameIcon :name="(sceneMap && sceneMap.icon) || 'map'" :size="18" />
          <span class="nm">{{ (sceneMap && sceneMap.name) || '灵湖' }}</span>
          <span class="badge">当前钓场</span>
        </div>
        <div class="row">
          <GameIcon name="hook" :size="18" />
          <span class="nm">{{ profile.equippedRodName }}</span>
          <span class="badge">钓力 {{ profile.equippedRodPower }}</span>
        </div>
        <div class="row sub">
          <GameIcon name="line" :size="18" />
          <span class="nm">{{ profile.equippedLineName }}</span>
          <span class="badge">承重 {{ fmtWeight(profile.lineStrength) }}</span>
        </div>
        <div class="row sub">
          <GameIcon :name="selectedBait ? selectedBait.icon : 'baitWorm'" :size="18" />
          <span class="nm">{{ selectedBait ? selectedBait.name : '鱼饵' }} × {{ profile.totalBait }}</span>
          <span class="badge">可钓 {{ fmtWeight(profile.maxCatchWeight) }}</span>
        </div>
        <div class="row sub cult" title="修为单独加成在基础力量上，基础力量提升后按同样百分比重算，无上限">
          <GameIcon name="cultivation" :size="18" />
          <span class="nm">修为 {{ profile.cultivation || 0 }}%</span>
          <span class="badge">{{ profile.basePower }} → {{ profile.power }}</span>
        </div>
        <button class="vib-toggle" :class="{ off: !vibEnabled }" @click="toggleVibrate" :title="canVibrate ? (vibEnabled ? '关闭震动' : '开启震动') : '当前设备不支持振动，仅屏幕抖动'">
          <GameIcon name="vibrate" :size="14" /> 震动 {{ vibEnabled ? '开' : '关' }}
        </button>
      </div>

      <!-- 天时罗盘：十二时辰 × 五天象，加成真实作用于这一竿 -->
      <div class="sky-card" :style="{ '--sky': activeSky.color }">
        <div class="sk-head">
          <span class="sk-icon">{{ activeSky.icon }}</span>
          <b>{{ activeSky.shichen }} · {{ activeSky.weather }}</b>
          <span class="sk-span">{{ activeSky.span }}</span>
        </div>
        <div class="sk-omen">{{ activeSky.omen }}</div>
        <div class="sk-hour">{{ activeSky.hourOmen }}</div>
        <div class="sk-fx">{{ skyEffectText(activeSky.effects) }}</div>
        <div class="sk-bless" v-if="blessing > 0">本命钓竿 {{ blessing }} 重 · 收益 +{{ Math.round((forgeBonus(blessing).coinMul - 1) * 100) }}%</div>
      </div>

      <div class="recent" v-if="recent.length">
        <div class="recent-item" v-for="(r, i) in recent" :key="i" :class="tierClass(r.tier)">
          <GameIcon class="ri" :name="r.name" :size="16" />
          <span class="rn">{{ r.name }}</span>
          <span class="rw">{{ fmtWeight(r.weight) }}</span>
          <span class="rs" :class="{ ok: r.landed, no: !r.landed }">{{ r.landed ? '入护' : '跑鱼' }}</span>
        </div>
      </div>
    </div>

    <!-- 目标鱼信息 -->
    <div class="target" v-if="encounter && (phase === 'bite' || phase === 'fight')">
      <span class="tier" :class="tierClass(encounter.tier)">{{ tierLabel(encounter.tier) }}</span>
      <span class="tname"><GameIcon :name="encounter.fishName" :size="17" /> {{ encounter.fishName }}</span>
      <span class="tweight">{{ fmtWeight(encounter.weight) }}</span>
      <span class="trisk">断线风险 {{ Math.round(encounter.breakRisk * 100) }}%</span>
      <span class="trealm" v-if="(encounter.realmBonusPct || 0) > 0"><GameIcon name="star" :size="14" /> 境界 +{{ encounter.realmBonusPct }}%</span>
    </div>

    <!-- 切图提示 -->
    <div class="map-switch-banner" :key="mapSwitchName" v-if="mapSwitchName">
      <GameIcon name="map" :size="22" /> 抵达 {{ mapSwitchName }} · 已切换钓场
    </div>

    <!-- 暴走横幅 -->
    <div class="berserk-banner" v-if="berserk && phase === 'fight'">灵兽暴走！稳住鱼竿！</div>

    <!-- 仙缘奇遇横幅：这一竿触发的机缘 / 劫数 -->
    <div class="fortune-banner" v-if="fortuneNow && ['waiting', 'bite', 'fight'].includes(phase)" :class="fortuneNow.tone">
      <span class="fbi">{{ fortuneNow.icon }}</span>
      <div class="fbt">
        <b>仙缘 · {{ fortuneNow.name }}</b>
        <small>{{ fortuneNow.desc }}</small>
      </div>
    </div>

    <!-- ================= 底部操作 ================= -->
    <div class="controls">
      <template v-if="phase === 'idle' || phase === 'result'">
        <div class="bait-bar" v-if="baits.length">
          <span class="bait-label"><GameIcon name="baitWorm" :size="16" /> 鱼饵</span>
          <button
            v-for="b in baits"
            :key="b.itemId"
            class="bait-chip"
            :class="{ active: b.itemId === selectedBaitId, premium: b.power > 0 }"
            @click="selectedBaitId = b.itemId"
          >
            <GameIcon class="bc-icon" :name="b.icon" :size="20" />
            <span class="bc-name">{{ b.name }}</span>
            <span class="bc-qty">×{{ b.quantity }}</span>
          </button>
        </div>
        <button class="cast-btn" @click="cast" :disabled="profile.totalBait <= 0 || !selectedBaitId">
          {{ profile.totalBait > 0 ? '凝神抛竿' : '鱼饵不足，去仙市' }}
        </button>
        <p class="tip">当前鱼饵：{{ selectedBait ? selectedBait.name : '无' }} · 每次抛竿消耗 1 个 · 按住收线，松开泄力</p>
      </template>

      <div v-else-if="phase === 'casting'" class="status">抛竿中…</div>

      <div v-else-if="phase === 'waiting'" class="status">
        静心凝神，等待灵鱼咬钩<span class="dots"><i>.</i><i>.</i><i>.</i></span>
      </div>

      <div v-else-if="phase === 'bite'" class="bite-wrap">
        <div class="bite-alert">咬钩了！</div>
        <button class="strike-btn" @click="strike">提竿！</button>
      </div>

      <div v-else-if="phase === 'fight'" class="fight-ui">
        <div class="meters">
          <div class="meter">
            <div class="m-label"><span>鱼线张力</span><span :class="{ hot: tension > 78 }">{{ Math.round(tension) }}%</span></div>
            <div class="track tension-track">
              <div class="safe-zone"></div>
              <div class="fill tension-fill" :class="{ hot: tension > 78 }" :style="{ width: Math.min(100, tension) + '%' }"></div>
            </div>
          </div>
          <div class="meter">
            <div class="m-label"><span>收线进度</span><span>{{ Math.round(progress) }}%</span></div>
            <div class="track">
              <div class="fill progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
          </div>
        </div>
        <button
          class="reel-btn"
          :class="{ holding }"
          @pointerdown.prevent="startHold"
          @pointerup.prevent="stopHold"
          @pointerleave="stopHold"
          @pointercancel="stopHold"
        >
          {{ holding ? '收线中…松手可泄力' : '按住收线' }}
        </button>
      </div>

      <div v-else-if="phase === 'settling'" class="status">结算中…</div>
    </div>

    <!-- 地图选择悬浮按钮 -->
    <button class="map-fab" @click="showMap = !showMap" title="选择钓点地图">
      <GameIcon name="map" :size="23" /><span class="fab-label">地图</span>
    </button>

    <!-- 钓鱼协会入口悬浮按钮 -->
    <router-link class="assoc-fab" to="/assoc" title="钓鱼协会（任务 / 比赛 / 认证徽章）">
      <GameIcon name="trophy" :size="23" /><span class="fab-label">协会</span>
    </router-link>

    <!-- 钓况预估悬浮按钮 -->
    <button class="odds-fab" @click="showOdds = !showOdds; showMap = false" title="钓况预估（可钓重量 / 品质概率）">
      <GameIcon name="chart" :size="23" /><span class="fab-label">钓况</span>
    </button>

    <!-- ================= 地图选择面板 ================= -->
    <div class="map-panel" v-if="showMap">
      <h4><GameIcon name="map" :size="17" /> 选择钓点</h4>
      <p class="mp-tip">不同地图的专属鱼概率与建议力量不同。越深的钓点专属鱼越重，钓起后力量成长越夸张。</p>
      <div class="map-list">
        <button
          v-for="m in maps"
          :key="m.id"
          class="map-card"
          :class="{ active: m.id === selectedMapId, locked: m.recommendPower > profile.power }"
          @click="selectMap(m)"
        >
          <img class="mc-thumb" :src="mapThumb(m)" :alt="m.name" />
          <span class="mc-name"><GameIcon :name="m.icon" :size="17" /> {{ m.name }}</span>
          <span class="mc-desc">{{ m.desc }}</span>
          <span class="mc-meta">专属鱼概率 {{ Math.round((m.exclusiveRate || 0) * 100) }}%</span>
          <span class="mc-meta" v-if="m.recommendPower">建议力量 ≥ {{ fmtWeight(m.recommendPower) }}</span>
          <span class="mc-current" v-if="m.id === profile.currentMap">· 当前所在</span>
        </button>
      </div>
    </div>

    <!-- ================= 钓况预估面板 ================= -->
    <div class="odds-panel" v-if="showOdds">
      <h4><GameIcon name="chart" :size="17" /> 当前钓况预估</h4>
      <p class="op-tip">按当前钓场 / 装备 / 鱼饵实时计算，与实际抛竿算法一致</p>

      <!-- 能钓多重 -->
      <div class="op-section-title"><GameIcon name="hook" :size="16" /> 能钓多重</div>
      <div class="op-weight-grid">
        <div class="op-wcell">
          <span class="op-wk">装备可钓上限</span>
          <b class="op-wv">{{ fmtWeight(odds.maxCatch) }}</b>
        </div>
        <div class="op-wcell">
          <span class="op-wk">当前力量</span>
          <b class="op-wv">{{ fmtWeight(odds.strength) }}</b>
        </div>
      </div>
      <div class="op-exweight" v-if="odds.exRate > 0">
        专属鱼重量区间 <b>{{ fmtWeight(odds.exclusiveWeight.min) }} ~ {{ fmtWeight(odds.exclusiveWeight.max) }}</b>
      </div>

      <!-- 品质概率 -->
      <div class="op-section-title"><GameIcon name="target" :size="16" /> 各品质概率（综合）</div>
      <div class="op-denom">专属鱼现身率 {{ (odds.exRate * 100).toFixed(0) }}% · 自动叠加高级饵 / 幸运物加成</div>
      <div class="op-tiers">
        <div class="op-tier" v-for="t in odds.tiers" :key="t.code">
          <div class="op-tier-head">
            <span class="op-tier-name" :class="tierClass(t.code)">{{ t.label }}</span>
            <span class="op-tier-pct">{{ (t.prob * 100).toFixed(t.prob < 0.01 && t.prob > 0 ? 2 : 1) }}%</span>
          </div>
          <div class="op-bar"><i :class="tierClass(t.code)" :style="{ width: (t.prob * 100) + '%' }"></i></div>
          <div class="op-tier-range">约 {{ fmtWeight(t.weightMin) }} ~ {{ fmtWeight(t.weightMax) }} · 专属 {{ (t.exProb * 100).toFixed(1) }}% / 普通 {{ (t.normalProb * 100).toFixed(1) }}%</div>
        </div>
      </div>
      <p class="op-foot">神话 / 山海受装备承重限制，需升级钓竿才可能钓起；概率为理论值，实际以单次抽取为准。</p>
    </div>

    <!-- ================= 结算弹窗 ================= -->
    <div class="overlay" v-if="phase === 'result' && result" @click="closeResult">
      <div class="result-card" :class="[tierClass(result.tier), { fail: !result.landed }]" @click.stop>
        <div class="r-badge">{{ result.landed ? '成功入护' : '搏鱼失败' }}</div>
        <div class="r-fish" :class="{ sad: !result.landed }"><GameIcon :name="result.fishName" :size="56" /></div>
        <h3>{{ result.fishName }}</h3>
        <div class="r-tags">
          <span class="r-tier" :class="tierClass(result.tier)">{{ result.tierName }}</span>
          <span class="r-weight">{{ fmtWeight(result.weight) }}</span>
        </div>
        <div class="r-fortune" v-if="fortuneNow"><span>{{ fortuneNow.icon }}</span> 仙缘·{{ fortuneNow.name }}：{{ fortuneNow.desc }}</div>

        <template v-if="result.landed">
          <div class="r-rewards">
            <span class="rw"><GameIcon name="coin" :size="15" /> +{{ result.rewardShells }}</span>
            <span class="rg"><GameIcon name="gem" :size="15" /> +{{ result.rewardGold }}</span>
          </div>
          <div class="r-realm" v-if="(result.realmBonusPct || 0) > 0"><GameIcon name="star" :size="14" /> 钓道境界加成 +{{ result.realmBonusPct }}%</div>
          <div class="r-cult" v-if="result.powerKind === 'over-limit'">
            <GameIcon name="cultivation" :size="16" />
            突破极限 · 基础力量 +{{ result.powerGainPct }}% · 修为 +{{ result.cultivationGain }}% → {{ result.cultivation }}%
          </div>
        </template>
        <div class="r-broken" v-if="result.rodBroken">鱼竿被拽断了！请去背包换一根</div>
        <p class="r-msg">{{ result.message }}</p>
        <div class="r-actions">
          <button class="again" @click="closeResult">继续钓鱼</button>
          <router-link class="to-shop" to="/shop" @click="closeResult">去仙市</router-link>
        </div>
      </div>
    </div>

    <SignInDialog @signed="(shells) => profile.shells = shells" @toast="showToast" />

    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
/* ---------- 天时灵汐罗盘 ---------- */
.sky-card {
  --sky: #ffca5f;
  background: linear-gradient(150deg, rgba(20, 24, 48, .72), rgba(4, 22, 40, .78));
  backdrop-filter: blur(8px);
  border: 1px solid color-mix(in srgb, var(--sky) 55%, transparent);
  border-left: 3px solid var(--sky);
  border-radius: 14px;
  padding: 9px 12px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, .3), inset 0 0 18px color-mix(in srgb, var(--sky) 10%, transparent);
  max-width: 300px;
}
.sk-head { display: flex; align-items: center; gap: 7px; font-size: 13px; color: #fff3d0; }
.sk-icon { font-size: 18px; color: var(--sky); text-shadow: 0 0 10px var(--sky); }
.sk-head b { letter-spacing: 1px; }
.sk-span { font-size: 10px; opacity: .7; margin-left: auto; white-space: nowrap; }
.sk-omen { font-size: 11px; color: var(--sky); margin-top: 5px; line-height: 1.5; }
.sk-hour { font-size: 10px; color: #a9c7e6; margin-top: 2px; }
.sk-fx { font-size: 11px; font-weight: 700; color: #ffe6a8; margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(255, 255, 255, .16); }
.sk-bless { font-size: 10px; color: #7ee7c7; margin-top: 3px; }

/* ---------- 仙缘奇遇 ---------- */
.fortune-banner {
  position: absolute; z-index: 24; left: 50%; top: 84px; transform: translateX(-50%);
  display: flex; align-items: center; gap: 10px; max-width: min(520px, 88vw);
  padding: 9px 16px; border-radius: 14px;
  background: linear-gradient(120deg, rgba(52, 30, 78, .92), rgba(20, 18, 44, .92));
  border: 1px solid rgba(255, 213, 79, .65);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .45), 0 0 22px rgba(255, 213, 79, .2);
  animation: fortuneIn .45s ease-out;
}
.fortune-banner.bad { border-color: rgba(255, 112, 67, .75); box-shadow: 0 10px 30px rgba(0, 0, 0, .45), 0 0 22px rgba(255, 112, 67, .25); }
.fbi { font-size: 26px; color: #ffd54f; text-shadow: 0 0 12px rgba(255, 213, 79, .8); }
.fortune-banner.bad .fbi { color: #ff8a65; text-shadow: 0 0 12px rgba(255, 112, 67, .8); }
.fbt { min-width: 0; }
.fbt b { display: block; font-size: 13px; color: #ffe6a8; letter-spacing: 1px; }
.fbt small { display: block; font-size: 11px; color: #cfe4ff; margin-top: 2px; line-height: 1.45; }
@keyframes fortuneIn { from { opacity: 0; transform: translate(-50%, -14px) scale(.96); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
.r-fortune { font-size: 11px; color: #ffe6a8; background: rgba(255, 213, 79, .1); border: 1px solid rgba(255, 213, 79, .3); border-radius: 9px; padding: 6px 9px; margin: 8px 0 2px; line-height: 1.5; }
.r-fortune span { margin-right: 5px; }

.fishing-page {
  position: relative;
  height: 100vh;
  min-height: 560px;
  overflow: hidden;
  color: #eaf6ff;
  user-select: none;
}

/* ---------- 场景（写实仙山月夜湖面） ---------- */
.scene { position: absolute; inset: 0; z-index: 0; overflow: hidden; background: #06121c; }
.scene-photo {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center 46%;
  animation: sceneZoom 32s ease-in-out infinite alternate, sceneIn .65s ease-out;
}
@keyframes sceneZoom {
  0%   { transform: scale(1); }
  100% { transform: scale(1.07); }
}
@keyframes sceneIn { from { opacity: 0; } to { opacity: 1; } }
/* 轻微压暗保证 HUD 与浮漂可读；暴走时转暖红 */
.scene-tint {
  position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(4, 18, 30, .28) 0%, rgba(4, 18, 30, 0) 30%, rgba(3, 14, 24, .34) 100%),
    radial-gradient(ellipse 70% 70% at 50% 55%, rgba(0,0,0,0) 40%, rgba(0,0,0,.28) 100%);
  transition: background .5s;
}
/* 每张地图自己的光色，切图后整页氛围跟着变 */
.scene.theme-beiyuan .scene-photo { background-position: center 42%; }
.scene.theme-beiyuan .scene-tint {
  background: linear-gradient(180deg, rgba(12, 34, 52, .18) 0%, rgba(12, 34, 52, 0) 32%, rgba(8, 28, 44, .3) 100%);
}
.scene.theme-jibei .scene-photo { background-position: center 48%; }
.scene.theme-jibei .scene-tint {
  background: linear-gradient(180deg, rgba(4, 16, 38, .3) 0%, rgba(4, 16, 38, .04) 36%, rgba(2, 12, 30, .38) 100%);
}
.scene.theme-shenyuan .scene-photo { background-position: center center; }
.scene.theme-shenyuan .scene-tint {
  background:
    linear-gradient(180deg, rgba(0, 10, 20, .42) 0%, rgba(0, 12, 22, .08) 40%, rgba(0, 8, 18, .52) 100%),
    radial-gradient(ellipse 60% 60% at 50% 45%, rgba(0,0,0,0) 30%, rgba(0, 0, 0, .5) 100%);
}
.scene.theme-penglai .scene-photo { background-position: center 44%; }
.scene.theme-penglai .scene-tint {
  background: linear-gradient(180deg, rgba(72, 40, 12, .16) 0%, rgba(72, 40, 12, 0) 34%, rgba(30, 24, 18, .28) 100%);
}
.fishing-page.is-berserk .scene-photo { filter: saturate(1.2) hue-rotate(-18deg); }
.fishing-page.is-berserk .scene-tint {
  background: linear-gradient(180deg, rgba(90, 10, 10, .42) 0%, rgba(60, 8, 8, .18) 45%, rgba(40, 4, 4, .45) 100%);
}

/* ---------- 湖中常驻鱼影 ---------- */
.ambient-school { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.ambient-fish {
  position: absolute; display: block; opacity: .34;
  filter: brightness(.62) saturate(.75) blur(.7px) drop-shadow(0 8px 12px rgba(0, 20, 40, .5));
  animation-name: ambientSwim; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
  will-change: transform;
}
.ambient-fish.rev { animation-name: ambientSwimRev; }
@keyframes ambientSwim {
  0%   { transform: translate(-24vw, 0) scaleX(1) rotate(-2deg); }
  25%  { transform: translate(5vw, -12px) scaleX(1) rotate(3deg); }
  50%  { transform: translate(35vw, 6px) scaleX(1) rotate(-3deg); }
  75%  { transform: translate(65vw, -8px) scaleX(1) rotate(2deg); }
  100% { transform: translate(100vw, 0) scaleX(1) rotate(-2deg); }
}
@keyframes ambientSwimRev {
  0%   { transform: translate(100vw, 0) scaleX(-1) rotate(2deg); }
  25%  { transform: translate(65vw, 8px) scaleX(-1) rotate(-3deg); }
  50%  { transform: translate(35vw, -6px) scaleX(-1) rotate(3deg); }
  75%  { transform: translate(5vw, 10px) scaleX(-1) rotate(-2deg); }
  100% { transform: translate(-24vw, 0) scaleX(-1) rotate(2deg); }
}

.rig {
  position: absolute; inset: 0; width: 100%; height: 100%; z-index: 5;
  pointer-events: none;
}
.rig .rod-sprite {
  filter: drop-shadow(0 18px 24px rgba(0, 20, 40, .55)) drop-shadow(0 0 18px rgba(120, 200, 255, .18));
}
.fishing-line {
  stroke: rgba(255,255,255,.85);
  stroke-width: 2.2;
  filter: drop-shadow(0 0 4px rgba(255,255,255,.55));
}
/* ---------- 水中可见的鱼 ---------- */
.fish-sprite {
  position: absolute; z-index: 3;
  pointer-events: none;
  will-change: transform, left, top;
  filter: drop-shadow(0 10px 16px rgba(0, 12, 28, .5));
}
.fish-sprite img {
  width: 100%; display: block;
  transition: filter .35s, opacity .35s;
}
/* 等待：水下巡游，仍能看清轮廓 */
.fish-sprite.ph-waiting img { filter: brightness(.88) saturate(.9) contrast(1.05) blur(.3px); opacity: .82; }
/* 咬钩：逼近浮漂 */
.fish-sprite.ph-bite img { filter: brightness(.96) saturate(1.02) contrast(1.05); opacity: .94; }
/* 搏鱼：清晰可见地挣扎 */
.fish-sprite.ph-fight img { filter: brightness(1) saturate(1.08) contrast(1.05); opacity: 1; }
/* 暴走：发红光、更亮 */
.fish-sprite.frantic img {
  filter: brightness(.95) saturate(1.15) drop-shadow(0 0 16px rgba(255, 96, 48, .85));
  opacity: 1;
}
.fish-emoji { font-size: 64px; display: block; filter: brightness(.8); }
.bobber { animation: bobFloat 2.4s ease-in-out infinite; }
.bobber.dip { animation: bobDip .35s ease-out infinite; }
@keyframes bobFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes bobDip { 0%,100% { transform: translateY(12px); } 50% { transform: translateY(-2px); } }
.ripples circle { transform-origin: 800px 648px; animation: rippleOut 2.4s ease-out infinite; }
.ripples circle:nth-child(2) { animation-delay: 1.2s; }
@keyframes rippleOut { 0% { transform: scale(.5); opacity: .9; } 100% { transform: scale(3.2); opacity: 0; } }

.vignette {
  position: absolute; inset: 0; pointer-events: none; z-index: 6;
  box-shadow: inset 0 0 160px rgba(0, 20, 40, .55);
  transition: box-shadow .25s;
}
.vignette.danger { box-shadow: inset 0 0 220px rgba(255, 60, 30, .55); }
.vignette.berserk { box-shadow: inset 0 0 280px rgba(255, 20, 0, .8); animation: dangerPulse .7s ease-in-out infinite; }
@keyframes dangerPulse { 0%,100% { opacity: .7; } 50% { opacity: 1; } }
.flash {
  position: absolute; inset: 0; background: #fff; z-index: 8;
  animation: flashOut .42s ease-out forwards;
}
@keyframes flashOut { from { opacity: .9; } to { opacity: 0; } }

.burst { position: absolute; left: 50%; top: 56%; z-index: 9; transform: translate(-50%, -50%); pointer-events: none; }
.burst-fish { font-size: 110px; animation: fishLeap 1.3s cubic-bezier(.2,.9,.2,1); filter: drop-shadow(0 12px 18px rgba(0,0,0,.35)); }
.burst-fish.pic img { width: 210px; display: block; }
@keyframes fishLeap {
  0% { transform: translateY(60px) rotate(0) scale(.6); opacity: 0; }
  35% { transform: translateY(-60px) rotate(-12deg) scale(1.15); opacity: 1; }
  70% { transform: translateY(-30px) rotate(8deg) scale(1); opacity: 1; }
  100% { transform: translateY(70px) rotate(0) scale(.7); opacity: 0; }
}
.splash {
  position: absolute; left: 50%; bottom: -10px; width: 30px; height: 30px;
  background: rgba(255,255,255,.85); border-radius: 50% 50% 45% 45%;
  animation: splashUp 1s ease-out forwards;
}
.splash.s2 { left: 20%; animation-delay: .05s; width: 20px; height: 20px; }
.splash.s3 { left: 80%; animation-delay: .1s; width: 22px; height: 22px; }
@keyframes splashUp {
  0% { transform: translateY(0) scale(.4); opacity: .9; }
  100% { transform: translateY(-90px) scale(1.4); opacity: 0; }
}

/* ---------- HUD ---------- */
.hud {
  position: absolute; z-index: 20; left: 16px; top: 66px;
  display: flex; flex-direction: column; gap: 10px; max-width: 300px;
}
.hud-card {
  background: rgba(2, 32, 58, .55);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 16px;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 8px;
  box-shadow: 0 10px 26px rgba(0,0,0,.28);
}
.hud-card .row { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.hud-card .row.sub { opacity: .92; font-size: 13px; }
.hud-card .map-row { padding-bottom: 7px; border-bottom: 1px solid rgba(255,255,255,.16); }
.hud-card .map-row .nm { color: #b3e5fc; letter-spacing: 1px; }
.hud-card .row.cult .nm { color: #b9fff0; }
.hud-card .row.cult .badge { color: #d7fff4; }
.hud-card .ico { font-size: 18px; }
.hud-card .nm { font-weight: bold; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vib-toggle {
  align-self: flex-start;
  border: 1px solid rgba(255,255,255,.25);
  background: rgba(79, 195, 247, .18);
  color: #b3e5fc; font-size: 12px; font-weight: bold;
  padding: 4px 12px; border-radius: 12px; cursor: pointer;
  transition: background .2s, color .2s;
}
.vib-toggle:hover { background: rgba(79, 195, 247, .32); }
.vib-toggle.off { background: rgba(120, 144, 156, .25); color: #cfd8dc; }
.badge {
  font-size: 11px; padding: 2px 8px; border-radius: 9px;
  background: rgba(79, 195, 247, .22); color: #b3e5fc; white-space: nowrap;
}
.recent { display: flex; flex-direction: column; gap: 4px; }
.recent-item {
  display: flex; align-items: center; gap: 8px;
  background: rgba(2, 32, 58, .45);
  border-left: 3px solid #4fc3f7;
  border-radius: 9px; padding: 5px 9px; font-size: 12px;
}
.recent-item .ri { font-size: 16px; }
.recent-item .rn { flex: 1; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recent-item .rw { color: #ffe082; }
.recent-item .rs.ok { color: #81c784; }
.recent-item .rs.no { color: #ef9a9a; }
.recent-item.tier-rare { border-left-color: #9575cd; }
.recent-item.tier-legendary { border-left-color: #ffb300; }
.recent-item.tier-mythic { border-left-color: #ff7043; }
.recent-item.tier-shanhai { border-left-color: #f44336; }

/* ---------- 目标 ---------- */
.target {
  position: absolute; z-index: 22; top: 78px; right: 20px;
  display: flex; align-items: center; gap: 10px;
  background: rgba(2, 32, 58, .6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 14px; padding: 9px 14px; font-size: 13px;
  box-shadow: 0 10px 24px rgba(0,0,0,.3);
}
.target .tier { padding: 2px 10px; border-radius: 9px; font-weight: bold; font-size: 12px; }
.target .tname { font-weight: bold; }
.target .tweight { color: #ffe082; font-weight: bold; }
.target .trisk { color: #ffab91; font-size: 12px; }
.tier-common { background: #546e7a; color: #fff; }
.tier-rare { background: #5e35b1; color: #fff; }
.tier-legendary { background: #f9a825; color: #3e2723; }
.tier-mythic { background: #e64a19; color: #fff; }
.tier-shanhai { background: #b71c1c; color: #fff; box-shadow: 0 0 12px rgba(255,80,60,.7); }

.map-switch-banner {
  position: absolute; z-index: 24; top: 12%; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  padding: 10px 22px; border-radius: 16px; white-space: nowrap;
  background: rgba(2, 32, 58, .82); border: 1px solid rgba(79, 195, 247, .5);
  box-shadow: 0 10px 30px rgba(0,0,0,.4);
  font-size: 16px; font-weight: 800; letter-spacing: 2px; color: #e1f5fe;
  animation: mapSwitchIn 1.6s ease-out forwards;
}
@keyframes mapSwitchIn {
  0% { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(.9); }
  18%, 75% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(.98); }
}

.berserk-banner {
  position: absolute; z-index: 24; top: 18%; left: 50%; transform: translateX(-50%);
  font-size: 26px; font-weight: bold; letter-spacing: 4px;
  color: #fff; text-shadow: 0 0 18px #ff3d00, 0 0 36px #ff3d00;
  animation: berserkPulse .6s ease-in-out infinite;
}
@keyframes berserkPulse { 0%,100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.08); } }

/* ---------- 底部控制 ---------- */
.controls {
  position: absolute; z-index: 20; left: 50%; bottom: 26px; transform: translateX(-50%);
  width: min(560px, calc(100% - 32px));
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.cast-btn {
  padding: 16px 46px; border: none; border-radius: 20px;
  font-size: 19px; font-weight: bold; letter-spacing: 3px; color: #4e2600;
  cursor: pointer;
  background: linear-gradient(180deg, #ffe14d, #ffb300);
  box-shadow: 0 7px 0 #c17900, 0 14px 26px rgba(0,0,0,.35);
  transition: transform .12s, box-shadow .12s;
}
.cast-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 9px 0 #c17900; }
.cast-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 3px 0 #c17900; }
.cast-btn:disabled { opacity: .6; cursor: not-allowed; }
.bait-bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center;
  background: rgba(2, 32, 58, .55); backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,.18); border-radius: 16px;
  padding: 8px 12px; max-width: 100%;
}
.bait-label { font-size: 13px; font-weight: bold; color: #ffe082; white-space: nowrap; }
.bait-chip {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 11px; border: 1.5px solid rgba(255,255,255,.22);
  border-radius: 12px; background: rgba(255,255,255,.06);
  color: #eaf6ff; font-size: 13px; cursor: pointer; transition: all .12s;
}
.bait-chip:hover { background: rgba(255,255,255,.16); }
.bait-chip.active {
  border-color: #ffd54f; background: rgba(255, 213, 79, .28);
  box-shadow: 0 0 12px rgba(255, 213, 79, .5); color: #fff;
}
.bait-chip.premium.active { border-color: #ff8a65; background: rgba(255, 138, 101, .30); box-shadow: 0 0 12px rgba(255, 138, 101, .55); }
.bait-chip .bc-icon { font-size: 16px; }
.bait-chip .bc-name { font-weight: bold; white-space: nowrap; }
.bait-chip .bc-qty { font-size: 11px; opacity: .85; }
.tip { font-size: 12px; color: #cfe9ff; opacity: .85; text-shadow: 0 1px 4px rgba(0,0,0,.5); }

.status {
  background: rgba(2, 32, 58, .6); backdrop-filter: blur(6px);
  padding: 12px 26px; border-radius: 16px; font-weight: bold; font-size: 16px;
  border: 1px solid rgba(255,255,255,.18);
}
.dots i { animation: dot 1.2s infinite; }
.dots i:nth-child(2) { animation-delay: .2s; }
.dots i:nth-child(3) { animation-delay: .4s; }
@keyframes dot { 0%,100% { opacity: .2; } 50% { opacity: 1; } }

.bite-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.bite-alert {
  font-size: 22px; font-weight: bold; color: #fff;
  text-shadow: 0 0 16px #ff5252; animation: bitePulse .4s ease-in-out infinite alternate;
}
@keyframes bitePulse { from { transform: scale(1); } to { transform: scale(1.08); } }
.strike-btn {
  padding: 16px 54px; border: none; border-radius: 20px;
  font-size: 22px; font-weight: bold; letter-spacing: 6px; color: #fff; cursor: pointer;
  background: linear-gradient(180deg, #ff6b6b, #d32f2f);
  box-shadow: 0 7px 0 #8e0000, 0 14px 26px rgba(0,0,0,.35);
  animation: strikeGlow .5s ease-in-out infinite alternate;
}
@keyframes strikeGlow { from { box-shadow: 0 7px 0 #8e0000, 0 0 0 rgba(255,80,80,0); } to { box-shadow: 0 7px 0 #8e0000, 0 0 34px rgba(255,80,80,.8); } }

.fight-ui { width: 100%; display: flex; flex-direction: column; gap: 12px; }
.meters { display: flex; flex-direction: column; gap: 10px; }
.m-label { display: flex; justify-content: space-between; font-size: 12px; color: #cfe9ff; margin-bottom: 4px; text-shadow: 0 1px 3px rgba(0,0,0,.6); }
.m-label .hot { color: #ff5252; font-weight: bold; }
.track {
  position: relative; height: 16px; border-radius: 10px;
  background: rgba(2, 24, 44, .7);
  border: 1px solid rgba(255,255,255,.2);
  overflow: hidden;
}
.tension-track .safe-zone {
  position: absolute; left: 30%; width: 48%; top: 0; bottom: 0;
  background: rgba(76, 175, 80, .35);
  border-left: 1px dashed rgba(255,255,255,.5);
  border-right: 1px dashed rgba(255,255,255,.5);
}
.fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 10px; transition: width .06s linear; }
.tension-fill { background: linear-gradient(90deg, #4fc3f7, #ffca28); }
.tension-fill.hot { background: linear-gradient(90deg, #ff7043, #d32f2f); box-shadow: 0 0 14px #ff3d00; }
.progress-fill { background: linear-gradient(90deg, #66bb6a, #a5d6a7); }

.reel-btn {
  padding: 18px; border: none; border-radius: 18px;
  font-size: 18px; font-weight: bold; letter-spacing: 2px; color: #06263c; cursor: pointer;
  background: linear-gradient(180deg, #b3e5fc, #4fc3f7);
  box-shadow: 0 7px 0 #0277bd, 0 14px 24px rgba(0,0,0,.3);
  touch-action: none;
  transition: transform .08s, box-shadow .08s, background .1s;
}
.reel-btn.holding {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #0277bd;
  background: linear-gradient(180deg, #ffe082, #ffb300);
}

/* ---------- 地图选择 ---------- */
.map-fab {
  position: absolute; z-index: 26; right: 20px; bottom: 22px;
  width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer;
  font-size: 24px; color: #fff;
  background: linear-gradient(180deg, rgba(18,52,74,.92), rgba(6,28,44,.95));
  box-shadow: 0 8px 20px rgba(0,0,0,.4), inset 0 0 0 3px rgba(255,255,255,.25);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.fab-label { font-size: 10px; letter-spacing: 1px; margin-top: -2px; }
.map-panel {
  position: absolute; z-index: 27; right: 20px; bottom: 90px; width: 300px;
  max-height: 64vh; overflow-y: auto;
  background: rgba(2, 32, 58, .92);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(79, 195, 247, .35);
  border-radius: 18px; padding: 16px;
  box-shadow: 0 18px 40px rgba(0,0,0,.45);
}
.map-panel h4 { font-size: 16px; margin-bottom: 4px; color: #b3e5fc; }
.mp-tip { font-size: 11px; color: #90caf9; margin-bottom: 12px; line-height: 1.5; }
.map-list { display: flex; flex-direction: column; gap: 10px; }
.map-card {
  text-align: left; cursor: pointer;
  background: rgba(12, 10, 30, .55);
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: 12px; padding: 10px 12px;
  display: flex; flex-direction: column; gap: 4px;
  transition: all .12s;
}
.map-card:hover { background: rgba(79, 195, 247, .16); }
.map-card.active {
  border-color: rgba(79, 195, 247, .7);
  background: rgba(79, 195, 247, .26);
  box-shadow: 0 0 12px rgba(79, 195, 247, .5);
}
.map-card.locked { opacity: .62; }
.mc-thumb {
  width: 100%; height: 66px; object-fit: contain; object-position: center;
  border-radius: 9px; border: 1px solid rgba(255,255,255,.18);
  background: rgba(0,0,0,.25);
}
.mc-name { font-weight: 800; font-size: 14px; color: #fff; }
.mc-desc { font-size: 11px; line-height: 1.5; color: #d7c4ef; }
.mc-meta { font-size: 11px; color: #ffd54f; }
.mc-current { font-size: 11px; color: #81c784; }
.r-realm { margin: 6px 0 2px; font-size: 13px; font-weight: bold; color: #ffd54f; text-align: center; }
.r-cult { margin: 6px 0 2px; padding: 5px 10px; border-radius: 10px; font-size: 13px; font-weight: bold; color: #b9fff0; background: rgba(0, 170, 140, .22); border: 1px solid rgba(120, 255, 220, .35); display: flex; align-items: center; justify-content: center; gap: 6px; }
.trealm { color: #ffd54f; font-weight: bold; font-size: 12px; }

/* ---------- 结算 ---------- */
.overlay {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(1, 20, 38, .62);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.result-card {
  position: relative; width: min(420px, 94vw);
  background: linear-gradient(180deg, #ffffff, #e8f5ff);
  border-radius: 26px; padding: 30px 28px 24px; text-align: center;
  box-shadow: 0 26px 60px rgba(0,0,0,.5), inset 0 0 0 4px #ffe082;
  color: #263238;
  animation: cardPop .4s cubic-bezier(.2,.9,.2,1.4);
}
@keyframes cardPop { from { transform: scale(.7) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
.result-card.tier-rare { box-shadow: 0 26px 60px rgba(0,0,0,.5), inset 0 0 0 4px #7e57c2; }
.result-card.tier-legendary { box-shadow: 0 26px 60px rgba(0,0,0,.5), inset 0 0 0 5px #f9a825; }
.result-card.tier-mythic { box-shadow: 0 26px 60px rgba(0,0,0,.5), inset 0 0 0 5px #e64a19; }
.result-card.tier-shanhai { box-shadow: 0 26px 60px rgba(0,0,0,.5), inset 0 0 0 5px #b71c1c; }
.result-card.fail { box-shadow: 0 26px 60px rgba(0,0,0,.5), inset 0 0 0 4px #90a4ae; }
.r-badge {
  position: absolute; top: -15px; left: 50%; transform: translateX(-50%);
  background: #26a69a; color: #fff; font-weight: bold; font-size: 13px;
  padding: 5px 18px; border-radius: 12px; white-space: nowrap;
}
.result-card.fail .r-badge { background: #78909c; }
.r-fish { font-size: 88px; margin: 8px 0 2px; animation: floatY 1.8s ease-in-out infinite; }
.r-fish.sad { filter: grayscale(.4); animation: none; opacity: .8; }
@keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.result-card h3 { font-size: 23px; color: #37474f; margin-bottom: 8px; }
.r-tags { display: flex; justify-content: center; gap: 8px; margin-bottom: 10px; }
.r-tier { padding: 3px 12px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.r-weight { padding: 3px 12px; border-radius: 10px; font-size: 12px; font-weight: bold; background: #fff3e0; color: #ef6c00; }
.r-rewards { display: flex; justify-content: center; gap: 16px; font-size: 20px; font-weight: bold; margin: 10px 0; }
.r-rewards .rw { color: #ef6c00; }
.r-rewards .rg { color: #b8860b; }
.r-broken { background: #ffebee; color: #c62828; font-weight: bold; font-size: 13px; border-radius: 10px; padding: 8px; margin: 10px 0; }
.r-msg { color: #546e7a; font-size: 13px; line-height: 1.6; margin: 8px 0 16px; }
.r-actions { display: flex; gap: 10px; justify-content: center; }
.again, .to-shop {
  padding: 11px 22px; border-radius: 14px; font-weight: bold; font-size: 14px;
  text-decoration: none; cursor: pointer; border: none;
  color: #4e2600; background: linear-gradient(180deg, #ffe14d, #ffb300);
}
.to-shop { background: linear-gradient(180deg, #b3e5fc, #4fc3f7); color: #06263c; }

/* 钓鱼协会入口 */
.assoc-fab {
  position: absolute; z-index: 26; right: 92px; bottom: 22px;
  width: 58px; height: 58px; border-radius: 50%; cursor: pointer; text-decoration: none;
  font-size: 24px; color: #fff;
  background: linear-gradient(180deg, #ffd54f, #ef6c00);
  box-shadow: 0 8px 20px rgba(0,0,0,.4), inset 0 0 0 3px rgba(255,255,255,.25);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.assoc-fab .fab-label { font-size: 10px; letter-spacing: 1px; margin-top: -2px; }

/* 钓况预估入口（右三，避开地图/协会/左下小助手） */
.odds-fab {
  position: absolute; z-index: 26; right: 164px; bottom: 22px;
  width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer;
  font-size: 24px; color: #fff;
  background: linear-gradient(180deg, #81c784, #2e7d32);
  box-shadow: 0 8px 20px rgba(0,0,0,.4), inset 0 0 0 3px rgba(255,255,255,.25);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.odds-fab .fab-label { font-size: 10px; letter-spacing: 1px; margin-top: -2px; }

/* 钓况预估面板 */
.odds-panel {
  position: absolute; z-index: 27; right: 20px; bottom: 90px; width: 330px;
  max-height: 70vh; overflow-y: auto;
  background: rgba(2, 32, 58, .94);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(129, 199, 132, .4);
  border-radius: 18px; padding: 16px;
  box-shadow: 0 18px 40px rgba(0,0,0,.45);
}
.odds-panel h4 { font-size: 16px; margin-bottom: 4px; color: #a5d6a7; }
.op-tip { font-size: 11px; color: #90caf9; margin-bottom: 12px; line-height: 1.5; }
.op-section-title { font-size: 13px; font-weight: 800; color: #b3e5fc; margin: 12px 0 8px; }
.op-weight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.op-wcell {
  background: rgba(12, 10, 30, .55); border: 1px solid rgba(255,255,255,.14);
  border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 4px;
}
.op-wk { font-size: 11px; color: #90caf9; }
.op-wv { font-size: 18px; color: #fff; }
.op-exweight {
  margin-top: 8px; font-size: 12px; color: #c8e6c9; line-height: 1.5;
  background: rgba(46, 125, 50, .22); border-radius: 10px; padding: 8px 10px;
}
.op-exweight b { color: #fff; }
.op-denom { font-size: 11px; color: #90caf9; margin-bottom: 8px; }
.op-tiers { display: flex; flex-direction: column; gap: 11px; }
.op-tier-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.op-tier-name { font-size: 13px; font-weight: 800; }
.op-tier-name.tier-common { color: #cfd8dc; }
.op-tier-name.tier-rare { color: #7e57c2; }
.op-tier-name.tier-legendary { color: #f9a825; }
.op-tier-name.tier-mythic { color: #ff7043; }
.op-tier-name.tier-shanhai { color: #ff5252; }
.op-tier-pct { font-size: 13px; font-weight: 800; color: #fff; }
.op-bar { height: 8px; border-radius: 6px; background: rgba(255,255,255,.12); overflow: hidden; }
.op-bar i { display: block; height: 100%; border-radius: 6px; transition: width .25s ease; }
.op-bar i.tier-common { background: #90a4ae; }
.op-bar i.tier-rare { background: linear-gradient(90deg, #9575cd, #7e57c2); }
.op-bar i.tier-legendary { background: linear-gradient(90deg, #fdd835, #f9a825); }
.op-bar i.tier-mythic { background: linear-gradient(90deg, #ff8a65, #f4511e); }
.op-bar i.tier-shanhai { background: linear-gradient(90deg, #ff6b6b, #d32f2f); }
.op-tier-range { font-size: 10px; color: #81d4fa; margin-top: 3px; }
.op-foot { font-size: 10px; color: #78909c; margin-top: 12px; line-height: 1.5; }

@media (max-width: 640px) {
  .hud { max-width: 210px; left: 10px; top: 62px; }
  .hud-card .row { font-size: 12px; }
  .target { top: auto; bottom: 190px; right: 10px; font-size: 12px; padding: 7px 10px; }
  .berserk-banner { font-size: 20px; top: 22%; }
  .cast-btn { padding: 14px 36px; font-size: 17px; }
  .bait-bar { padding: 6px 8px; gap: 6px; }
  .bait-chip { padding: 5px 8px; font-size: 12px; }
  .map-fab { width: 50px; height: 50px; font-size: 20px; right: 12px; }
  .map-panel { right: 12px; bottom: 78px; width: 88vw; max-width: 320px; }
  .assoc-fab { width: 50px; height: 50px; font-size: 20px; right: 70px; }
  .odds-fab { width: 50px; height: 50px; font-size: 20px; right: 128px; }
  .odds-panel { right: 12px; bottom: 78px; width: 88vw; max-width: 340px; }
  /* 窄屏：天时罗盘收成两行，奇遇横幅压到顶部避免遮挡湖面 */
  .sky-card { max-width: 210px; padding: 7px 9px; }
  .sk-span, .sk-hour, .sk-bless { display: none; }
  .sk-head { font-size: 11px; }
  .sk-omen, .sk-fx { font-size: 10px; margin-top: 3px; }
  .fortune-banner { top: 60px; padding: 6px 10px; max-width: 92vw; }
  .fbt b { font-size: 12px; }
  .fbt small { font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fbi { font-size: 20px; }
}
</style>
