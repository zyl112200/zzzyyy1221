<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { getSession } from '../store/session'
import { meApi, castApi, settleApi, trainApi, realmUpApi } from '../api/game'

const session = getSession()
const username = session ? session.username : ''

const profile = reactive({
  username,
  shells: 0,
  goldStones: 0,
  strength: 10,
  powerRealm: 1,
  nextRealmCost: 2,
  realmBonusPct: 0,
  equippedRodName: '无',
  equippedRodPower: 0,
  equippedLineName: '无',
  lineStrength: 0,
  maxCatchWeight: 0,
  totalBait: 0,
  luckOwned: false,
  inventory: []
})

// phases: idle | casting | waiting | bite | fight | result
const phase = ref('idle')
const encounter = ref(null)
const result = ref(null)
const recent = ref([])
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null

// 搏鱼状态
const tension = ref(0)
const progress = ref(0)
const holding = ref(false)
const berserk = ref(false)
const shaking = ref(false)
const flash = ref(false)
const burst = ref(null)

let rafHandle = null
let lastTs = 0
let waitTimer = null
let biteTimer = null
let pullAcc = 0
let pullInterval = 1.6
let berserkRolled = false
let shakeTimer = null

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
    } else {
      showToast(res.message || '加载失败')
    }
  } catch (e) {
    showToast(e.message || '后端未启动，先启动后端 🌊')
  }
}

// ---------------- 钓竿 / 鱼线几何（SVG） ----------------
const rodTip = computed(() => {
  const t = Math.min(1, tension.value / 100)
  const fighting = phase.value === 'fight'
  const bend = fighting ? t : 0
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
  if (profile.totalBait <= 0) {
    showToast('鱼饵用完啦，去商店买点 🪱')
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
  sfxCast()

  try {
    const res = await castApi(username)
    if (res.code !== 200) {
      showToast(res.message || '抛竿失败')
      phase.value = 'idle'
      return
    }
    encounter.value = res.data
    profile.totalBait = res.data.totalBait
    profile.shells = res.data.shells
    profile.goldStones = res.data.goldStones
    // 抛竿动画后进入等待
    waitTimer = setTimeout(() => {
      phase.value = 'waiting'
      scheduleBite()
    }, 850)
  } catch (e) {
    showToast(e.message || '后端开小差了 🌊')
    phase.value = 'idle'
  }
}

function scheduleBite() {
  const heavy = encounter.value ? encounter.value.difficulty : 0.2
  const delay = 1100 + Math.random() * 2200 + heavy * 300
  waitTimer = setTimeout(() => {
    if (phase.value !== 'waiting') return
    phase.value = 'bite'
    sfxBite()
    // 2.2 秒内不提竿就脱钩
    biteTimer = setTimeout(() => {
      if (phase.value === 'bite') {
        settleOutcome(false, 'ESCAPE')
      }
    }, 2200)
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
  tension.value = 22
  progress.value = 0
  berserk.value = false
  berserkRolled = false
  holding.value = false
  pullAcc = 0
  pullInterval = 1.5 + Math.random() * 1.1
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

  let reelSpeed = 30 / (0.75 + diff * 0.55) * (0.9 + power * 0.03)
  let tensionRise = 16 * (0.6 + diff * 0.42)
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

  // 鱼的周期性挣扎
  pullAcc += dt
  if (pullAcc >= pullInterval) {
    pullAcc = 0
    pullInterval = 1.2 + Math.random() * 1.3
    tension.value += pullStrength * (0.7 + Math.random() * 0.7)
    kick(berserk.value ? 520 : 260)
    beep(90, 0.12, 'triangle', 0.03)
  }

  if (berserk.value) {
    // 暴走持续施压
    tension.value += pullStrength * 0.55 * dt
  }

  // 临界暴走：接近水面时触发
  if (!berserkRolled && progress.value >= 78) {
    berserkRolled = true
    if (Math.random() < (enc ? enc.berserkChance : 0.3)) {
      berserk.value = true
      kick(700)
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

  rafHandle = requestAnimationFrame(loop)
}

function onSnap() {
  stopLoop()
  holding.value = false
  flash.value = true
  setTimeout(() => { flash.value = false }, 420)
  sfxSnap()
  // 暴走后更容易挣断鱼竿
  const rodBreak = berserk.value && Math.random() < 0.6
  settleOutcome(false, rodBreak ? 'ROD' : 'LINE')
}

function onLanded() {
  stopLoop()
  holding.value = false
  settleOutcome(true, 'NONE')
}

function stopLoop() {
  cancelAnimationFrame(rafHandle)
  rafHandle = null
}

function startHold() {
  if (phase.value !== 'fight') return
  holding.value = true
}

function stopHold() {
  holding.value = false
}

function kick(ms) {
  shaking.value = true
  clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => { shaking.value = false }, ms)
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
      profile.strength = res.data.strength
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
    } else {
      showToast(res.message || '结算失败')
    }
  } catch (e) {
    showToast(e.message || '结算失败 🌊')
  }
  phase.value = 'result'
  loadProfile()
}

function closeResult() {
  phase.value = 'idle'
  result.value = null
  encounter.value = null
  tension.value = 0
  progress.value = 0
  berserk.value = false
}

// ---------------- 力量升级 ----------------
const showTrain = ref(false)
const training = ref(false)
const training2 = ref(false)
const trainCost = computed(() => 20 + (profile.strength || 10) * 2)

async function train() {
  if (training.value) return
  training.value = true
  try {
    const res = await trainApi(username)
    if (res.code === 200) {
      profile.strength = res.data.strength
      profile.goldStones = res.data.goldStones
      showToast(res.data.message)
      beep(520, 0.09); setTimeout(() => beep(720, 0.14), 90)
    } else {
      showToast(res.message || '升级失败')
    }
  } catch (e) {
    showToast(e.message || '升级失败 🌊')
  } finally {
    training.value = false
  }
}

// ---------------- 力量境界 ----------------
const realmMax = 999
const realmIsMax = computed(() => profile.powerRealm >= realmMax)
const realmProgressPct = computed(() => Math.min(100, (profile.powerRealm / realmMax) * 100))
const nextRealmCostText = computed(() => {
  if (realmIsMax.value) return '已圆满'
  const c = profile.nextRealmCost
  return c == null ? '—' : fmtNum(c)
})

/** 大数格式化：万 / 亿，便于展示天文数字般的突破成本 */
function fmtNum(n) {
  if (n == null) return '—'
  if (n >= 1e8) return (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + ' 亿'
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + ' 万'
  return String(n)
}

/** 力量境界称号（海绵宝宝主题），按重天数分 10 个段位 */
const REALM_TITLES = ['', '比奇堡萌新', '蟹堡奇兵', '菠萝屋渔夫', '水母捕手', '痞老板克星', '深海勇士', '海洋传说', '蟹黄堡宗师', '神话钓神', '比奇堡之巅']
function realmTierIndex(realm) {
  if (realm >= 999) return 10
  if (realm >= 900) return 9
  if (realm >= 600) return 8
  if (realm >= 400) return 7
  if (realm >= 200) return 6
  if (realm >= 100) return 5
  if (realm >= 60) return 4
  if (realm >= 30) return 3
  if (realm >= 10) return 2
  return 1
}
function realmTitle(realm) {
  return REALM_TITLES[realmTierIndex(realm)] || REALM_TITLES[1]
}
function realmTierClass(realm) {
  return 'rt' + realmTierIndex(realm)
}

async function realmUp() {
  if (training2.value || realmIsMax.value) return
  if (profile.shells < (profile.nextRealmCost || 0)) {
    showToast('贝壳不够啦，突破需要 ' + nextRealmCostText.value + ' 🐚')
    return
  }
  training2.value = true
  try {
    const res = await realmUpApi(username)
    if (res.code === 200) {
      profile.powerRealm = res.data.powerRealm
      profile.shells = res.data.shells
      profile.goldStones = res.data.goldStones
      profile.nextRealmCost = res.data.nextRealmCost
      profile.realmBonusPct = res.data.realmBonusPct
      showToast(res.data.message)
      beep(660, 0.1, 'triangle'); setTimeout(() => beep(880, 0.12, 'triangle'), 100); setTimeout(() => beep(1040, 0.2, 'triangle'), 220)
    } else {
      showToast(res.message || '突破失败')
    }
  } catch (e) {
    showToast(e.message || '突破失败 🌊')
  } finally {
    training2.value = false
  }
}

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

onMounted(loadProfile)
onBeforeUnmount(() => {
  clearTimers()
  stopLoop()
  clearTimeout(toastTimer)
  clearTimeout(shakeTimer)
})
</script>

<template>
  <div class="fishing-page" :class="{ shake: shaking, 'is-berserk': berserk && phase === 'fight' }">
    <TopBar :shells="profile.shells" :gold-stones="profile.goldStones" :strength="profile.strength" :power-realm="profile.powerRealm" :realm-title="realmTitle(profile.powerRealm)" />

    <!-- ================= 场景 ================= -->
    <div class="scene">
      <div class="sky">
        <div class="sun"></div>
        <div class="cloud c1"></div>
        <div class="cloud c2"></div>
        <div class="cloud c3"></div>
        <div class="island"></div>
      </div>
      <div class="sea">
        <div class="horizon"></div>
        <div class="wave w1"></div>
        <div class="wave w2"></div>
        <div class="wave w3"></div>
        <div class="sea-glitter"></div>
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

        <!-- 鱼竿 -->
        <path :d="rodPath" fill="none" stroke="url(#rodGrad)" stroke-width="13" stroke-linecap="round" />
        <path :d="rodPath" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3" stroke-linecap="round" />
        <!-- 握把 -->
        <path d="M 1512 902 L 1442 812" fill="none" stroke="url(#handleGrad)" stroke-width="26" stroke-linecap="round" />
        <!-- 渔轮 -->
        <circle cx="1468" cy="852" r="26" fill="#37474f" stroke="#90a4ae" stroke-width="4" />
        <circle cx="1468" cy="852" r="9" fill="#cfd8dc" />
      </svg>

      <div class="vignette" :class="{ danger: tension > 72 && phase === 'fight', berserk: berserk && phase === 'fight' }"></div>
      <div class="flash" v-if="flash"></div>

      <!-- 上钩的水花 / 成功跃鱼 -->
      <div class="burst" v-if="burst">
        <div class="burst-fish">{{ burst.icon }}</div>
        <div class="splash s1"></div>
        <div class="splash s2"></div>
        <div class="splash s3"></div>
      </div>
    </div>

    <!-- ================= HUD ================= -->
    <div class="hud">
      <div class="hud-card">
        <div class="row">
          <span class="ico">🎣</span>
          <span class="nm">{{ profile.equippedRodName }}</span>
          <span class="badge">钓力 {{ profile.equippedRodPower }}</span>
        </div>
        <div class="row sub">
          <span class="ico">🧵</span>
          <span class="nm">{{ profile.equippedLineName }}</span>
          <span class="badge">承重 {{ fmtWeight(profile.lineStrength) }}</span>
        </div>
        <div class="row sub">
          <span class="ico">🪱</span>
          <span class="nm">鱼饵 {{ profile.totalBait }}</span>
          <span class="badge">可钓 {{ fmtWeight(profile.maxCatchWeight) }}</span>
        </div>
      </div>

      <div class="recent" v-if="recent.length">
        <div class="recent-item" v-for="(r, i) in recent" :key="i" :class="tierClass(r.tier)">
          <span class="ri">{{ r.icon }}</span>
          <span class="rn">{{ r.name }}</span>
          <span class="rw">{{ fmtWeight(r.weight) }}</span>
          <span class="rs" :class="{ ok: r.landed, no: !r.landed }">{{ r.landed ? '入护' : '跑鱼' }}</span>
        </div>
      </div>
    </div>

    <!-- 目标鱼信息 -->
    <div class="target" v-if="encounter && (phase === 'bite' || phase === 'fight')">
      <span class="tier" :class="tierClass(encounter.tier)">{{ tierLabel(encounter.tier) }}</span>
      <span class="tname">{{ encounter.fishIcon }} {{ encounter.fishName }}</span>
      <span class="tweight">{{ fmtWeight(encounter.weight) }}</span>
      <span class="trisk">断线风险 {{ Math.round(encounter.breakRisk * 100) }}%</span>
      <span class="trealm" v-if="(encounter.realmBonusPct || 0) > 0">🌟 境界 +{{ encounter.realmBonusPct }}%</span>
    </div>

    <!-- 暴走横幅 -->
    <div class="berserk-banner" v-if="berserk && phase === 'fight'">🔥 巨物暴走！稳住鱼竿！</div>

    <!-- ================= 底部操作 ================= -->
    <div class="controls">
      <template v-if="phase === 'idle' || phase === 'result'">
        <button class="cast-btn" @click="cast" :disabled="profile.totalBait <= 0">
          {{ profile.totalBait > 0 ? '抛竿钓鱼 🎣' : '鱼饵不足，去商店 🪱' }}
        </button>
        <p class="tip">每次抛竿消耗 1 个鱼饵 · 按提示提竿 · 按住收线，松开泄力</p>
      </template>

      <div v-else-if="phase === 'casting'" class="status">抛竿中…</div>

      <div v-else-if="phase === 'waiting'" class="status">
        静静等待鱼儿咬钩<span class="dots"><i>.</i><i>.</i><i>.</i></span>
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

    <!-- 力量升级悬浮按钮 -->
    <button class="train-fab" @click="showTrain = !showTrain" title="力量修炼 / 境界突破">
      💪<span class="fab-label">修炼</span>
    </button>

    <div class="train-panel" v-if="showTrain">
      <h4>💪 力量修炼</h4>
      <p class="tp-row"><span>当前力量</span><b>{{ profile.strength }}</b></p>
      <p class="tp-row"><span>金石</span><b>🪙 {{ profile.goldStones }}</b></p>
      <p class="tp-row"><span>下次消耗</span><b>{{ trainCost }} 金石</b></p>
      <button class="train-btn" :disabled="training || profile.goldStones < trainCost" @click="train">
        {{ training ? '修炼中…' : (profile.goldStones < trainCost ? '金石不足' : '力量 +5') }}
      </button>

      <div class="tp-divider"></div>

      <h4>🌟 力量境界</h4>
      <div class="realm-title-badge" :class="realmTierClass(profile.powerRealm)">
        <span class="rt-name">{{ realmTitle(profile.powerRealm) }}</span>
        <span class="rt-lv">{{ profile.powerRealm }} / {{ realmMax }} 重天</span>
      </div>
      <div class="realm-bar"><div class="realm-fill" :class="realmTierClass(profile.powerRealm)" :style="{ width: realmProgressPct + '%' }"></div></div>
      <p class="tp-row"><span>钓鱼收益加成</span><b class="realm-bonus">+{{ profile.realmBonusPct }}%</b></p>
      <p class="tp-row"><span>下一重天需</span><b>🐚 {{ nextRealmCostText }}</b></p>
      <p class="tp-note">突破消耗贝壳逐重天翻倍（1→2→4→8…），境界越高，钓到的贝壳与金石越丰厚。</p>
      <button class="realm-btn" :disabled="training2 || realmIsMax || profile.shells < (profile.nextRealmCost || 0)" @click="realmUp">
        <template v-if="realmIsMax">已臻巅峰 ✨</template>
        <template v-else-if="training2">突破中…</template>
        <template v-else-if="profile.shells < (profile.nextRealmCost || 0)">贝壳不足</template>
        <template v-else>突破到 {{ profile.powerRealm + 1 }} 重天 🌟</template>
      </button>
    </div>

    <!-- ================= 结算弹窗 ================= -->
    <div class="overlay" v-if="phase === 'result' && result" @click="closeResult">
      <div class="result-card" :class="[tierClass(result.tier), { fail: !result.landed }]" @click.stop>
        <div class="r-badge">{{ result.landed ? '成功入护' : '搏鱼失败' }}</div>
        <div class="r-fish" :class="{ sad: !result.landed }">{{ result.fishIcon }}</div>
        <h3>{{ result.fishName }}</h3>
        <div class="r-tags">
          <span class="r-tier" :class="tierClass(result.tier)">{{ result.tierName }}</span>
          <span class="r-weight">{{ fmtWeight(result.weight) }}</span>
        </div>

        <template v-if="result.landed">
          <div class="r-rewards">
            <span class="rw">🐚 +{{ result.rewardShells }}</span>
            <span class="rg">🪙 +{{ result.rewardGold }}</span>
          </div>
          <div class="r-realm" v-if="(result.realmBonusPct || 0) > 0">🌟 力量境界加成 +{{ result.realmBonusPct }}%</div>
        </template>
        <div class="r-broken" v-if="result.rodBroken">💥 鱼竿被拽断了！请去背包换一根</div>
        <p class="r-msg">{{ result.message }}</p>
        <div class="r-actions">
          <button class="again" @click="closeResult">继续钓鱼 🎣</button>
          <router-link class="to-shop" to="/shop" @click="closeResult">去商店 🛒</router-link>
        </div>
      </div>
    </div>

    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.fishing-page {
  position: relative;
  height: 100vh;
  min-height: 560px;
  overflow: hidden;
  color: #eaf6ff;
  user-select: none;
}
.fishing-page.shake { animation: screenShake .28s linear; }
@keyframes screenShake {
  0%,100% { transform: translate(0,0); }
  20% { transform: translate(-6px, 3px); }
  40% { transform: translate(5px, -4px); }
  60% { transform: translate(-4px, -2px); }
  80% { transform: translate(3px, 4px); }
}

/* ---------- 场景 ---------- */
.scene { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.sky {
  position: absolute; inset: 0 0 42% 0;
  background: linear-gradient(180deg, #7fd0ff 0%, #bfe8ff 45%, #ffe9b8 100%);
  transition: background .6s;
}
.is-berserk .sky { background: linear-gradient(180deg, #6b2b2b 0%, #b5482f 55%, #ffb37a 100%); }
.sun {
  position: absolute; right: 16%; top: 16%; width: 90px; height: 90px; border-radius: 50%;
  background: radial-gradient(circle, #fff8c9 0%, #ffe066 55%, rgba(255,224,102,0) 72%);
  box-shadow: 0 0 70px 30px rgba(255, 224, 102, .45);
}
.cloud {
  position: absolute; height: 34px; border-radius: 40px;
  background: rgba(255,255,255,.85);
  filter: blur(.4px);
  opacity: .9;
}
.cloud::before, .cloud::after {
  content: ''; position: absolute; background: inherit; border-radius: 50%;
}
.cloud::before { width: 46px; height: 46px; top: -20px; left: 18px; }
.cloud::after { width: 34px; height: 34px; top: -14px; right: 20px; }
.c1 { width: 140px; top: 18%; left: 10%; animation: drift 34s linear infinite; }
.c2 { width: 100px; top: 10%; left: 46%; animation: drift 46s linear infinite; opacity: .75; }
.c3 { width: 170px; top: 26%; left: 70%; animation: drift 58s linear infinite; opacity: .6; }
@keyframes drift { 0% { transform: translateX(-20px); } 50% { transform: translateX(30px); } 100% { transform: translateX(-20px); } }

.island {
  position: absolute; left: 12%; bottom: -6px; width: 260px; height: 70px;
  background: linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  opacity: .55;
}
.island::before {
  content: '🌴'; position: absolute; left: 30px; top: -48px; font-size: 52px;
}
.island::after {
  content: '🌴'; position: absolute; right: 40px; top: -34px; font-size: 38px;
}

.sea {
  position: absolute; inset: 42% 0 0 0;
  background: linear-gradient(180deg, #1e88b8 0%, #0b6a9e 35%, #064a75 75%, #02304d 100%);
}
.horizon {
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: rgba(255,255,255,.55);
}
.wave {
  position: absolute; left: -10%; width: 120%; height: 62px;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
  animation: waveMove 7s ease-in-out infinite;
}
.w1 { top: 8%; animation-delay: 0s; }
.w2 { top: 26%; animation-delay: -2.4s; opacity: .7; }
.w3 { top: 52%; animation-delay: -4.1s; opacity: .5; }
@keyframes waveMove {
  0%,100% { transform: translateX(-3%) scaleY(1); }
  50% { transform: translateX(3%) scaleY(1.15); }
}
.sea-glitter {
  position: absolute; inset: 0;
  background: repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0 2px, transparent 2px 90px);
  animation: glitter 6s linear infinite;
}
@keyframes glitter { 0% { background-position-y: 0; } 100% { background-position-y: 90px; } }

.rig {
  position: absolute; inset: 0; width: 100%; height: 100%; z-index: 5;
  pointer-events: none;
}
.fishing-line {
  stroke: rgba(255,255,255,.85);
  stroke-width: 2.2;
  filter: drop-shadow(0 0 4px rgba(255,255,255,.55));
}
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
.hud-card .ico { font-size: 18px; }
.hud-card .nm { font-weight: bold; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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

/* ---------- 力量修炼 ---------- */
.train-fab {
  position: absolute; z-index: 26; right: 20px; bottom: 22px;
  width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer;
  font-size: 26px; color: #fff;
  background: linear-gradient(180deg, #66bb6a, #2e7d32);
  box-shadow: 0 8px 20px rgba(0,0,0,.4), inset 0 0 0 3px rgba(255,255,255,.25);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.fab-label { font-size: 10px; letter-spacing: 1px; margin-top: -2px; }
.train-panel {
  position: absolute; z-index: 27; right: 20px; bottom: 90px; width: 260px;
  background: rgba(2, 32, 58, .9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 18px; padding: 16px;
  box-shadow: 0 18px 40px rgba(0,0,0,.45);
}
.train-panel h4 { font-size: 16px; margin-bottom: 10px; color: #a5d6a7; }
.tp-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: #cfe9ff; }
.tp-row b { color: #fff; }
.tp-note { font-size: 11px; color: #90caf9; line-height: 1.5; margin: 8px 0 12px; }
.train-btn {
  width: 100%; padding: 11px; border: none; border-radius: 12px;
  font-weight: bold; font-size: 15px; color: #14310d; cursor: pointer;
  background: linear-gradient(180deg, #a5d6a7, #66bb6a);
  box-shadow: 0 4px 0 #2e7d32;
}
.train-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }

/* ---------- 力量境界 ---------- */
.tp-divider { height: 1px; background: rgba(255,255,255,.16); margin: 12px 0; }
.realm-bar {
  height: 10px; border-radius: 8px; background: rgba(2, 24, 44, .7);
  border: 1px solid rgba(255,255,255,.2); overflow: hidden; margin: 0 0 8px;
}
.realm-fill {
  height: 100%; border-radius: 8px;
  background: linear-gradient(90deg, #ba68c8, #7e57c2);
  box-shadow: 0 0 10px rgba(186,104,200,.6);
  transition: width .35s ease;
}
.realm-bonus { color: #f3e5f5 !important; }
.realm-btn {
  width: 100%; padding: 11px; border: none; border-radius: 12px;
  font-weight: bold; font-size: 15px; color: #fff; cursor: pointer;
  background: linear-gradient(180deg, #ce93d8, #8e24aa);
  box-shadow: 0 4px 0 #6a1b9a;
}
.realm-btn:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 2px 0 #6a1b9a; }
.realm-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
.realm-title-badge {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 9px 10px; border-radius: 12px; margin-bottom: 8px;
  background: rgba(2, 24, 44, .55); border: 1px solid rgba(255, 255, 255, .18);
}
.realm-title-badge .rt-name { font-weight: 800; font-size: 16px; letter-spacing: 1px; color: #fff; text-shadow: 0 1px 2px rgba(0, 0, 0, .45); }
.realm-title-badge .rt-lv { font-size: 11px; color: #d7c4ef; }
/* 段位配色：徽标与进度条共用 .rt1~.rt10 */
.rt1  { --rt: #90a4ae; }
.rt2  { --rt: #66bb6a; }
.rt3  { --rt: #26a69a; }
.rt4  { --rt: #29b6f6; }
.rt5  { --rt: #ab47bc; }
.rt6  { --rt: #5c6bc0; }
.rt7  { --rt: #ffa726; }
.rt8  { --rt: #ffca28; }
.rt9  { --rt: #ef5350; }
.rt10 { --rt: #ec407a; }
.realm-title-badge.rt1  { background: linear-gradient(180deg, rgba(144,164,174,.30), rgba(2,24,44,.55)); }
.realm-title-badge.rt2  { background: linear-gradient(180deg, rgba(102,187,106,.30), rgba(2,24,44,.55)); }
.realm-title-badge.rt3  { background: linear-gradient(180deg, rgba(38,166,154,.32), rgba(2,24,44,.55)); }
.realm-title-badge.rt4  { background: linear-gradient(180deg, rgba(41,182,246,.32), rgba(2,24,44,.55)); }
.realm-title-badge.rt5  { background: linear-gradient(180deg, rgba(171,71,188,.34), rgba(2,24,44,.55)); }
.realm-title-badge.rt6  { background: linear-gradient(180deg, rgba(92,107,192,.34), rgba(2,24,44,.55)); }
.realm-title-badge.rt7  { background: linear-gradient(180deg, rgba(255,167,38,.34), rgba(2,24,44,.55)); }
.realm-title-badge.rt8  { background: linear-gradient(180deg, rgba(255,202,40,.36), rgba(2,24,44,.55)); }
.realm-title-badge.rt9  { background: linear-gradient(180deg, rgba(239,83,80,.36), rgba(2,24,44,.55)); }
.realm-title-badge.rt10 { background: linear-gradient(180deg, rgba(236,64,122,.42), rgba(2,24,44,.55)); border-color: rgba(255,255,255,.4); }
.realm-fill.rt1  { background: linear-gradient(90deg, #90a4ae, #607d8b); box-shadow: 0 0 10px rgba(144,164,174,.6); }
.realm-fill.rt2  { background: linear-gradient(90deg, #66bb6a, #388e3c); box-shadow: 0 0 10px rgba(102,187,106,.6); }
.realm-fill.rt3  { background: linear-gradient(90deg, #26a69a, #00897b); box-shadow: 0 0 10px rgba(38,166,154,.6); }
.realm-fill.rt4  { background: linear-gradient(90deg, #29b6f6, #0288d1); box-shadow: 0 0 10px rgba(41,182,246,.6); }
.realm-fill.rt5  { background: linear-gradient(90deg, #ab47bc, #7b1fa2); box-shadow: 0 0 10px rgba(171,71,188,.6); }
.realm-fill.rt6  { background: linear-gradient(90deg, #5c6bc0, #3949ab); box-shadow: 0 0 10px rgba(92,107,192,.6); }
.realm-fill.rt7  { background: linear-gradient(90deg, #ffa726, #f57c00); box-shadow: 0 0 10px rgba(255,167,38,.6); }
.realm-fill.rt8  { background: linear-gradient(90deg, #ffca28, #ff8f00); box-shadow: 0 0 10px rgba(255,202,40,.6); }
.realm-fill.rt9  { background: linear-gradient(90deg, #ef5350, #c62828); box-shadow: 0 0 10px rgba(239,83,80,.6); }
.realm-fill.rt10 { background: linear-gradient(90deg, #ec407a, #ad1457); box-shadow: 0 0 12px rgba(236,64,122,.8); }
.r-realm { margin: 6px 0 2px; font-size: 13px; font-weight: bold; color: #ffd54f; text-align: center; }
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

@media (max-width: 640px) {
  .hud { max-width: 210px; left: 10px; top: 62px; }
  .hud-card .row { font-size: 12px; }
  .target { top: auto; bottom: 190px; right: 10px; font-size: 12px; padding: 7px 10px; }
  .berserk-banner { font-size: 20px; top: 22%; }
  .cast-btn { padding: 14px 36px; font-size: 17px; }
  .train-fab { width: 50px; height: 50px; font-size: 22px; right: 12px; }
  .train-panel { right: 12px; bottom: 78px; width: 230px; }
}
</style>
