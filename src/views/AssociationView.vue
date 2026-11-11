<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import OceanBackground from '../components/OceanBackground.vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { getSession } from '../store/session'
import { meApi, assocInfoApi, assocTaskClaimApi, assocCompStartApi, assocCompStateApi } from '../api/game'

const session = getSession()
const username = session ? session.username : ''

const shells = ref(0)
const goldStones = ref(0)
const power = ref(100)

const activeTab = ref('task') // task | comp | badge
const info = ref(null)
const loading = ref(false)
const claiming = ref(null)
const startingComp = ref(false)
const toastVisible = ref(false)
const toastMessage = ref('')
let toastTimer = null
let pollTimer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 3200)
}

function fmtWeight(w) {
  if (!w && w !== 0) return '—'
  if (w >= 1e8) return (w / 1e8).toFixed(2).replace(/\.?0+$/, '') + ' 亿斤'
  if (w >= 1e4) return (w / 1e4).toFixed(1).replace(/\.0$/, '') + ' 万斤'
  return w + ' 斤'
}

function fmtTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return m + ':' + String(s % 60).padStart(2, '0')
}

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const tierClass = (t) => ({ COMMON: 'tc', RARE: 'tr', LEGENDARY: 'tl', MYTHIC: 'tm', SHANHAI: 'ts' }[t] || 'tc')
const tierLabel = (t) => ({ COMMON: '普通', RARE: '稀有', LEGENDARY: '传说', MYTHIC: '神话', SHANHAI: '山海' }[t] || t)

// ---------------- 徽章 ----------------
const BADGE_STARS = computed(() => (info.value ? info.value.badgeThresholds : []))
const badgeStar = computed(() => (info.value ? info.value.badgeStar : 0))
const maxCaughtWeight = computed(() => (info.value ? info.value.maxCaughtWeight : 0))
const nextBadgeTarget = computed(() => (info.value ? info.value.nextBadgeTarget : null))
const starNames = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

// ---------------- 任务 ----------------
const tasks = computed(() => (info.value ? info.value.tasks : []))
const nextTaskAt = computed(() => (info.value ? info.value.nextTaskAt : 0))

// ---------------- 比赛 ----------------
const competition = computed(() => (info.value ? info.value.competition : null))
const compRecords = computed(() => (info.value ? info.value.compRecords : []))
const compCountdown = ref(0)

const starEmoji = (n) => '⭐'.repeat(Math.min(n, 5)) + (n > 5 ? ` +${n - 5}` : '')

async function load(showErr = true) {
  try {
    const m = await meApi(username)
    if (m.code === 200) {
      shells.value = m.data.shells
      goldStones.value = m.data.goldStones
      power.value = m.data.power || 100
    }
  } catch { /* 静默 */ }
  try {
    const res = await assocInfoApi(username)
    if (res.code === 200) {
      info.value = res.data
      tickCountdown()
    }
  } catch (e) {
    if (showErr) showToast(e.message || '协会暂时无法连接 🌊')
  }
}

async function tickCountdown() {
  if (!competition.value || competition.value.finalized) {
    compCountdown.value = 0
    return
  }
  compCountdown.value = Math.max(0, competition.value.remaining)
}

async function refreshComp() {
  if (!competition.value || competition.value.finalized) return
  try {
    const res = await assocCompStateApi(username)
    if (res.code === 200) {
      info.value = res.data
      tickCountdown()
      const c = competition.value
      if (c && c.finalized && c.reward) {
        showToast(`⚔️ 比赛结束！你获得第 ${c.rank} 名（${c.reward.title}），奖励 ${c.reward.shells} 🐚 + ${c.reward.gold} 金石 🪙`)
      } else if (c && c.finalized) {
        showToast(`⚔️ 比赛结束！你获得第 ${c.rank} 名，再接再厉 🐟`)
      }
    }
  } catch { /* 静默 */ }
}

async function startComp() {
  if (startingComp.value) return
  startingComp.value = true
  try {
    const res = await assocCompStartApi(username)
    if (res.code === 200) {
      showToast(res.message || '比赛开始！')
      await load(false)
    } else {
      showToast(res.message || '报名失败')
    }
  } catch (e) {
    showToast(e.message || '协会暂时无法连接 🌊')
  } finally {
    startingComp.value = false
  }
}

async function claimTask(t) {
  if (claiming.value) return
  claiming.value = t.id
  try {
    const res = await assocTaskClaimApi(username, t.id)
    if (res.code === 200) {
      showToast(res.message || '奖励到账 🎉')
      await load(false)
    } else {
      showToast(res.message || '领取失败')
    }
  } catch (e) {
    showToast(e.message || '协会暂时无法连接 🌊')
  } finally {
    claiming.value = null
  }
}

onMounted(() => {
  load()
  // 比赛进行中每 3 秒拉一次战况（NPC 对手在实时出鱼）
  pollTimer = setInterval(() => {
    if (competition.value && !competition.value.finalized) refreshComp()
  }, 3000)
})

onBeforeUnmount(() => {
  clearInterval(pollTimer)
  clearTimeout(toastTimer)
})
</script>

<template>
  <div class="assoc-page">
    <OceanBackground />
    <TopBar
      :shells="shells"
      :gold-stones="goldStones"
      :power="power"
    />

    <main class="wrap">
      <div class="head">
        <h2>🎣 钓鱼协会</h2>
        <span class="badge-chip" v-if="badgeStar > 0">🏆 {{ starNames[badgeStar - 1] }}星认证</span>
        <span class="badge-chip none" v-else>🏆 暂无认证</span>
      </div>

      <div class="tabs">
        <button :class="{ active: activeTab === 'task' }" @click="activeTab = 'task'">📋 协会任务</button>
        <button :class="{ active: activeTab === 'comp' }" @click="activeTab = 'comp'">⚔️ 钓鱼比赛</button>
        <button :class="{ active: activeTab === 'badge' }" @click="activeTab = 'badge'">🏆 认证徽章</button>
      </div>

      <!-- ============ 协会任务 ============ -->
      <section v-if="activeTab === 'task'" class="panel">
        <p class="tip">协会会不定时发布钓鱼任务（如「钓起一条指定的灵鱼」），完成后回协会领取奖励；新任务请留意发布时间 📢</p>
        <div class="task-card" v-for="t in tasks" :key="t.id" :class="{ expired: t.expired, done: t.done && !t.claimed }">
          <div class="t-fish" :class="tierClass(t.tier)">{{ t.fishIcon }}</div>
          <div class="t-info">
            <div class="t-title">
              钓起一条 <b>{{ t.fishName }}</b>
              <span class="tier" :class="tierClass(t.tier)">{{ t.tierName }}</span>
              <span class="min-w" v-if="t.minWeight >= 1">（≥ {{ fmtWeight(t.minWeight) }}）</span>
            </div>
            <div class="t-meta">
              🐚 {{ t.rewardShells }} + 🪙 {{ t.rewardGold }} · {{ fmtDate(t.publishedAt) }} 发布
              · {{ t.expired ? '已过期' : fmtDate(t.expiresAt) + ' 截止' }}
            </div>
          </div>
          <div class="t-action">
            <button
              class="claim"
              :disabled="claiming === t.id || t.claimed || t.expired || !t.done"
              @click="claimTask(t)"
            >
              {{ t.claimed ? '已领奖' : t.expired ? '已过期' : t.done ? '领奖励 🎁' : '未完成' }}
            </button>
            <span class="my-weight" v-if="t.myWeight > 0">我的最佳：{{ fmtWeight(t.myWeight) }}</span>
          </div>
        </div>
        <div class="next-task" v-if="nextTaskAt">
          🕐 下一波任务预计 <b>{{ fmtDate(nextTaskAt) }}</b> 发布，协会不定时加更，记得常来看看～
        </div>
      </section>

      <!-- ============ 钓鱼比赛 ============ -->
      <section v-else-if="activeTab === 'comp'" class="panel">
        <p class="tip">报名后开赛 <b>2 分钟</b>，期间你钓起的每条鱼重量都会累计，与协会其他玩家比总重；前 3 名有大奖 ⚔️</p>

        <div v-if="!competition" class="comp-idle">
          <button class="start-btn" :disabled="startingComp" @click="startComp">
            {{ startingComp ? '报名中…' : '⚔️ 报名开赛（2 分钟）' }}
          </button>
        </div>

        <div v-else class="comp-live">
          <div class="comp-head">
            <template v-if="!competition.finalized">
              <span class="live-dot"></span>
              <span class="countdown">⏱ {{ fmtTime(compCountdown) }}</span>
              <span class="my-total">我的累计：{{ fmtWeight(competition.entries.find(e => e.isPlayer)?.total || 0) }}</span>
              <router-link class="go-fish" to="/home">回灵湖抛竿 🎣</router-link>
            </template>
            <template v-else>
              <span class="comp-done">🏁 比赛已结束</span>
              <span class="rank" :class="'r' + competition.rank">
                {{ competition.rank <= 3 ? (competition.reward ? competition.reward.title + '！' : '第 ' + competition.rank + ' 名') : '第 ' + competition.rank + ' 名' }}
              </span>
              <span class="reward-txt" v-if="competition.reward">
                奖励已到账：🐚 {{ competition.reward.shells }} + 🪙 {{ competition.reward.gold }}
              </span>
              <button class="again-btn" :disabled="startingComp" @click="startComp">再来一场 ⚔️</button>
            </template>
          </div>
          <table class="rank-table">
            <thead>
              <tr><th>名次</th><th>玩家</th><th>2 分钟累计重量</th></tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in competition.entries" :key="e.name" :class="{ me: e.isPlayer }">
                <td class="rk">{{ ['🥇', '🥈', '🥉'][i] || i + 1 }}</td>
                <td>{{ e.isPlayer ? username + '（你）' : e.name }}</td>
                <td>{{ fmtWeight(e.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="records" v-if="compRecords.length">
          <h4>📜 我的参赛记录</h4>
          <div class="rec" v-for="(r, i) in compRecords" :key="i">
            第 {{ r.rank }} 名 · 累计 {{ fmtWeight(r.total) }} · {{ fmtDate(r.at) }}
          </div>
        </div>
      </section>

      <!-- ============ 认证徽章 ============ -->
      <section v-else class="panel">
        <p class="tip">协会专属认证徽章：<b>单独钓起一只</b>达到门槛重量的灵鱼即可获得对应星级认证，共 1~9 星，星星越多身份越尊贵 🏆</p>
        <div class="my-badge">
          <div class="big-badge" :class="{ glow: badgeStar > 0 }">
            <div class="bb-star">{{ badgeStar > 0 ? starEmoji(badgeStar) : '☆☆☆' }}</div>
            <div class="bb-name">{{ badgeStar > 0 ? starNames[badgeStar - 1] + '星认证钓手' : '未认证' }}</div>
          </div>
          <div class="my-stat">
            <p>历史最重单尾：<b>{{ fmtWeight(maxCaughtWeight) }}</b></p>
            <p v-if="nextBadgeTarget">下一星门槛：<b>{{ fmtWeight(nextBadgeTarget) }}</b>（差 {{ fmtWeight(Math.max(0, nextBadgeTarget - maxCaughtWeight)) }}）</p>
            <p v-else>✨ 已获得最高 9 星认证，协会传奇！</p>
          </div>
        </div>
        <table class="badge-table">
          <thead><tr><th>星级</th><th>门槛（单尾重量）</th><th>状态</th></tr></thead>
          <tbody>
            <tr v-for="(w, i) in BADGE_STARS" :key="i" :class="{ achieved: badgeStar >= i + 1 }">
              <td>{{ i + 1 }} 星</td>
              <td>{{ fmtWeight(w) }}</td>
              <td>
                <span v-if="badgeStar >= i + 1" class="ok">✅ 已认证</span>
                <span v-else-if="maxCaughtWeight > 0" class="lack">差 {{ fmtWeight(Math.max(1, w - maxCaughtWeight)) }}</span>
                <span v-else class="lack">未达成</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.assoc-page { position: relative; min-height: 100vh; color: #eaf6ff; }
.wrap { position: relative; z-index: 1; max-width: 860px; margin: 0 auto; padding: 20px 16px 60px; }
.head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.head h2 { margin: 0; font-size: 24px; letter-spacing: 2px; color: #ffd54f; text-shadow: 0 2px 8px rgba(0,0,0,.5); }
.badge-chip { background: rgba(255, 213, 79, .25); border: 1px solid rgba(255, 213, 79, .5); padding: 4px 12px; border-radius: 14px; font-weight: bold; font-size: 13px; }
.badge-chip.none { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.25); }

.tabs { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.tabs button {
  padding: 9px 18px; border-radius: 14px; border: 1px solid rgba(255,255,255,.22);
  background: rgba(255,255,255,.1); color: #e1d5ff; font-weight: bold; cursor: pointer; font-size: 14px;
}
.tabs button.active { background: rgba(255, 213, 79, .3); color: #fff; border-color: rgba(255, 213, 79, .6); }

.panel {
  background: rgba(26, 22, 58, .82); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,.16); border-radius: 18px; padding: 18px;
  box-shadow: 0 12px 30px rgba(0,0,0,.35);
}
.tip { font-size: 13px; color: #b3d9ff; line-height: 1.7; margin: 0 0 14px; }
.tip b { color: #ffd54f; }

/* 任务 */
.task-card {
  display: flex; align-items: center; gap: 12px;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14);
  border-radius: 14px; padding: 12px 14px; margin-bottom: 10px;
}
.task-card.done { border-color: rgba(102, 187, 106, .55); }
.task-card.expired { opacity: .5; }
.t-fish { font-size: 30px; width: 44px; text-align: center; }
.t-info { flex: 1; min-width: 0; }
.t-title { font-size: 15px; font-weight: bold; }
.t-title b { color: #ffd54f; }
.tier { display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; }
.tier.tc { background: rgba(176,190,197,.3); }
.tier.tr { background: rgba(102,187,106,.3); }
.tier.tl { background: rgba(41,182,246,.3); }
.tier.tm { background: rgba(171,71,188,.3); }
.tier.ts { background: rgba(255,167,38,.3); }
.min-w { font-size: 12px; color: #b3d9ff; font-weight: normal; }
.t-meta { font-size: 12px; color: #9fc3e8; margin-top: 4px; }
.t-action { text-align: right; }
.claim {
  padding: 8px 16px; border: none; border-radius: 12px; cursor: pointer;
  font-weight: bold; color: #3e2c00;
  background: linear-gradient(180deg, #ffe082, #ffb300);
}
.claim:disabled { background: rgba(255,255,255,.14); color: #b9c6d8; cursor: not-allowed; }
.my-weight { display: block; font-size: 11px; color: #9fc3e8; margin-top: 4px; }
.next-task { font-size: 12px; color: #9fc3e8; background: rgba(255,255,255,.06); border-radius: 10px; padding: 10px 12px; margin-top: 6px; }
.next-task b { color: #ffd54f; }

/* 比赛 */
.comp-idle { text-align: center; padding: 26px 0; }
.start-btn {
  padding: 14px 30px; border: none; border-radius: 16px; cursor: pointer;
  font-size: 17px; font-weight: bold; color: #fff;
  background: linear-gradient(180deg, #ff8a65, #e64a19);
  box-shadow: 0 6px 0 #b53d13, 0 10px 24px rgba(0,0,0,.4);
}
.start-btn:disabled { opacity: .6; cursor: wait; }
.comp-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.live-dot { width: 10px; height: 10px; border-radius: 50%; background: #ff5252; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: .3; } }
.countdown { font-size: 22px; font-weight: bold; color: #ffd54f; }
.my-total { font-size: 13px; color: #b3d9ff; }
.go-fish, .again-btn {
  margin-left: auto; text-decoration: none; padding: 8px 16px; border-radius: 12px;
  font-weight: bold; border: none; cursor: pointer;
  background: linear-gradient(180deg, #a5d6a7, #66bb6a); color: #14310d;
}
.again-btn { background: linear-gradient(180deg, #ffcc80, #ef6c00); color: #3e2000; margin-left: 12px; }
.comp-done { font-weight: bold; color: #ffd54f; }
.rank { font-size: 20px; font-weight: bold; }
.rank.r1 { color: #ffd700; } .rank.r2 { color: #cfd8dc; } .rank.r3 { color: #ffab91; }
.reward-txt { font-size: 13px; color: #a5d6a7; }
.rank-table, .badge-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.rank-table th, .rank-table td, .badge-table th, .badge-table td {
  padding: 9px 10px; text-align: left; border-bottom: 1px solid rgba(255,255,255,.12);
}
.rank-table th, .badge-table th { color: #9fc3e8; font-size: 12px; }
.rank-table tr.me td { color: #ffd54f; font-weight: bold; }
.records { margin-top: 16px; }
.records h4 { margin: 0 0 8px; font-size: 14px; color: #b3d9ff; }
.rec { font-size: 12px; color: #9fc3e8; padding: 4px 0; }

/* 徽章 */
.my-badge { display: flex; gap: 18px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.big-badge {
  width: 150px; height: 150px; border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.25), rgba(255,255,255,.06));
  border: 2px solid rgba(255,255,255,.3);
}
.big-badge.glow { border-color: #ffd54f; box-shadow: 0 0 26px rgba(255, 213, 79, .45); }
.bb-star { font-size: 16px; text-align: center; line-height: 1.5; }
.bb-name { font-weight: bold; color: #ffd54f; font-size: 15px; }
.my-stat p { margin: 6px 0; font-size: 14px; color: #b3d9ff; }
.my-stat b { color: #fff; }
.badge-table tr.achieved td { color: #a5d6a7; }
.ok { color: #a5d6a7; font-weight: bold; }
.lack { color: #9fc3e8; font-size: 12px; }
</style>
