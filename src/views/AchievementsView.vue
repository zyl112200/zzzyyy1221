<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import GameIcon from '../components/GameIcon.vue'
import { getSession } from '../store/session'
import { meApi, assocInfoApi } from '../api/game.js'

const session = getSession()
const username = session ? session.username : ''
const shells = ref(0)
const profile = ref({})
const assoc = ref({})
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const me = await meApi(username)
    if (me && me.code === 200) {
      profile.value = me.data
      shells.value = me.data.shells || 0
    }
  } catch (e) { /* 忽略 */ }
  try {
    const res = await assocInfoApi(username)
    if (res && res.code === 200 && res.data) assoc.value = res.data
  } catch (e) { /* 忽略 */ }
  loading.value = false
}

const num = (v) => Math.max(0, Number(v) || 0)

/** 14 条钓道成就：进度实时从玩家档案派生 */
const achievements = computed(() => {
  const p = profile.value
  const a = assoc.value
  const codexCount = Array.isArray(p.codex) ? p.codex.length : 0
  const maxWeight = num(p.maxCaughtWeight || p.maxWeight)
  const skills = Array.isArray(p.skills) ? p.skills.length : 0
  const cultivation = num(p.cultivation)
  const power = num(p.power)
  const sign = num(p.signTotal)
  const shellsNow = num(p.shells)
  const badge = num(p.assocBadge || (a && a.badge))
  const items = Array.isArray(p.inventory) ? p.inventory.length : 0

  const defs = [
    { id: 'c1', name: '初窥门径', icon: 'hook', desc: '钓起第一条灵鱼', cur: num(p.stats && p.stats.landed) || (codexCount > 0 ? 1 : 0), need: 1 },
    { id: 'c2', name: '博闻强识', icon: 'book', desc: '图鉴收录 10 种灵鱼', cur: codexCount, need: 10 },
    { id: 'c3', name: '水族大家', icon: 'scroll', desc: '图鉴收录 40 种灵鱼', cur: codexCount, need: 40 },
    { id: 'w1', name: '百斤巨物', icon: 'power', desc: '钓起单尾 100 斤', cur: maxWeight, need: 100 },
    { id: 'w2', name: '千斤龙王', icon: 'hook', desc: '钓起单尾 1 万斤', cur: maxWeight, need: 10000 },
    { id: 'w3', name: '山海传说', icon: 'star', desc: '钓起单尾 100 万斤', cur: maxWeight, need: 1000000 },
    { id: 's1', name: '潜心修道', icon: 'taiji', desc: '修炼 4 部钓鱼功法', cur: skills, need: 4 },
    { id: 's2', name: '功法大成', icon: 'lotus', desc: '修炼全部 8 部功法', cur: skills, need: 8 },
    { id: 'r1', name: '道行精进', icon: 'cultivation', desc: '修为达到 100%', cur: cultivation, need: 100 },
    { id: 'r2', name: '力量惊人', icon: 'power', desc: '基础力量达到 1000', cur: power, need: 1000 },
    { id: 'g1', name: '日积月累', icon: 'coin', desc: '累计签到 7 日', cur: sign, need: 7 },
    { id: 'g2', name: '富甲一方', icon: 'gem', desc: '持有金币 100 万', cur: shellsNow, need: 1000000 },
    { id: 'm1', name: '钓坛新秀', icon: 'medals', desc: '获得 1 星认证徽章', cur: badge, need: 1 },
    { id: 'm2', name: '钓鱼圣人', icon: 'trophy', desc: '获得 9 星认证徽章', cur: badge, need: 9 }
  ]
  return defs.map((d) => {
    const cur = Math.min(d.cur, d.need)
    return { ...d, cur, done: cur >= d.need, pct: Math.round((cur / d.need) * 100) }
  })
})

const doneCount = computed(() => achievements.value.filter((a) => a.done).length)
const honor = computed(() => achievements.value.reduce((s, a) => s + (a.done ? 10 + Math.min(20, Math.floor(a.need / 100)) : 0), 0))

onMounted(load)
</script>

<template>
  <div class="ach-page">
    <TopBar :shells="shells" />
    <div class="wrap">
      <header class="head">
        <div>
          <h1><GameIcon name="medals" :size="22" /> 钓道成就</h1>
          <p>十四道里程碑，见证你的钓道修行。进度实时派生，荣誉值自动累计，无需领取。</p>
        </div>
        <div class="honor">
          <span>已完成 {{ doneCount }}/{{ achievements.length }}</span>
          <b>荣誉值 {{ honor }}</b>
        </div>
      </header>

      <div v-if="loading" class="loading">正在查阅功勋簿…</div>
      <div v-else class="grid">
        <div class="card" v-for="a in achievements" :key="a.id" :class="{ done: a.done }">
          <div class="ico"><GameIcon :name="a.icon" :size="26" /></div>
          <div class="body">
            <div class="top">
              <b>{{ a.name }}</b>
              <span class="state">{{ a.done ? '已达成' : a.pct + '%' }}</span>
            </div>
            <p>{{ a.desc }}</p>
            <div class="bar"><div class="fill" :style="{ width: a.pct + '%' }"></div></div>
            <div class="num">{{ a.cur >= a.need ? a.need : a.cur }} / {{ a.need }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ach-page { min-height: 100vh; background: linear-gradient(180deg, rgba(7,15,30,.52), rgba(5,11,24,.74)), url('../assets/scene_bg.png') center center / cover fixed no-repeat; padding-bottom: 40px; }
.wrap { max-width: 1000px; margin: 0 auto; padding: 20px 16px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 12px 0 24px; }
.head h1 { margin: 0 0 6px; font-size: 26px; color: #1b5e20; }
.head p { margin: 0; color: #6a8a72; font-size: 13px; max-width: 640px; }
.honor { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; color: #2e7d32; font-size: 13px; white-space: nowrap; }
.honor b { font-size: 18px; color: #e65100; }
.loading { text-align: center; color: #888; padding: 60px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.card { display: flex; gap: 12px; background: #fff; border: 2px solid #dcefe0; border-radius: 14px; padding: 14px; }
.card.done { border-color: #66bb6a; background: linear-gradient(180deg, #fff, #eaf7ec); }
.ico { width: 44px; height: 44px; flex: 0 0 44px; display: grid; place-items: center; background: #eaf7ec; border-radius: 12px; }
.body { flex: 1; min-width: 0; }
.top { display: flex; justify-content: space-between; align-items: center; }
.top b { color: #1b5e20; font-size: 15px; }
.state { font-size: 11px; color: #999; }
.card.done .state { color: #2e7d32; font-weight: bold; }
.body p { margin: 4px 0 8px; font-size: 12px; color: #6a7a6d; }
.bar { height: 7px; background: #eef2ee; border-radius: 4px; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, #81c784, #43a047); }
.num { margin-top: 4px; font-size: 11px; color: #9aa; text-align: right; }
</style>
