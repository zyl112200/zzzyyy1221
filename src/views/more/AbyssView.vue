<script setup>
import { ref, computed, onMounted } from 'vue'
import ToastMessage from '../../components/ToastMessage.vue'
import { getSession } from '../../store/session'
import { meApi } from '../../api/game'
import { loadFeature, saveFeature } from '../../api/featureApi.js'
import { normalizeFeature, advAbyssChallenge, advBuyStamina } from '../../data/feature.js'
import {
  ABYSS_MAX_STAMINA, abyssEnemyPower, abyssWinRate, abyssReward,
  staminaCost, abyssFx
} from '../../data/advance.js'

const session = getSession()
const username = session ? session.username : ''
const state = ref(normalizeFeature(null))
const power = ref(100)
const shells = ref(0)
const loading = ref(true)
const busy = ref(false)
const toastVisible = ref(false)
const toastMessage = ref('')
let timer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { toastVisible.value = false }, 2800)
}

const abyss = computed(() => state.value.advance.abyss)
const reinc = computed(() => state.value.advance.reincarnation)
const floor = computed(() => abyss.value.floor)
const enemyPower = computed(() => abyssEnemyPower(floor.value))
const winRate = computed(() => abyssWinRate(power.value, floor.value))
const nextReward = computed(() => abyssReward(floor.value))
const fx = computed(() => abyssFx(state.value.advance))
const staminaCostNow = computed(() => staminaCost(ABYSS_MAX_STAMINA - abyss.value.stamina))

function fmt(n) {
  n = Math.round(n || 0)
  return n >= 1e8 ? (n / 1e8).toFixed(2) + ' 亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + ' 万' : String(n)
}
function pct(n) { return Math.round((n || 0) * 100) + '%' }

async function load() {
  loading.value = true
  try {
    const [s, me] = await Promise.all([loadFeature(username, true), meApi(username)])
    if (s) state.value = s
    if (me && me.code === 200 && me.data) {
      power.value = me.data.power || 100
      if (me.data.shells != null) shells.value = me.data.shells
    }
  } catch (e) {
    showToast(e.message || '无尽塔加载失败')
  } finally {
    loading.value = false
  }
}

async function commit(next, msg) {
  busy.value = true
  try {
    const res = await saveFeature(username, next)
    state.value = normalizeFeature((res && res.state) || next)
    if (res && res.shells != null) shells.value = res.shells
    showToast(msg)
  } catch (e) {
    showToast(e.message || '操作失败')
  } finally {
    busy.value = false
  }
}

async function doChallenge() {
  if (busy.value) return
  if (abyss.value.stamina <= 0) { showToast('精力耗尽，先补充精力或等待明日恢复'); return }
  const next = advAbyssChallenge(state.value, { power: power.value })
  if (!next) { showToast('暂时无法挑战'); return }
  // 从 next 派生提示（结果与奖励在 advance 内已结算；金币差额由 commit 处理）
  const r = abyssWinRate(power.value, floor.value)
  const won = next.advance.abyss.floor > floor.value
  await commit(next, won ? `⚔️ 通关第 ${floor.value + 1} 层！${abyssReward(floor.value).milestone ? '里程碑达成！' : ''}` : `挑战失败（胜率 ${Math.round(r * 100)}%），再接再厉`)
}

async function doBuyStamina() {
  if (busy.value) return
  if (abyss.value.stamina >= ABYSS_MAX_STAMINA) return
  if (shells.value < staminaCostNow.value) { showToast(`补满精力需 ${fmt(staminaCostNow.value)} 金币`); return }
  const next = advBuyStamina(state.value, { bought: ABYSS_MAX_STAMINA - abyss.value.stamina })
  if (!next) return
  await commit(next, '精力已补满，继续冲塔！')
}

onMounted(load)
</script>

<template>
  <section class="panel">
    <div v-if="loading" class="loading">正在开启无尽塔…</div>
    <div v-else class="grid">
      <!-- 左：冲塔主界面 -->
      <div class="card tower">
        <div class="tower-top">
          <div class="tower-art">🗼</div>
          <div>
            <small>当前最高层</small>
            <div class="floor-big">第 {{ floor }} <span>层</span></div>
            <div class="best">历史最高 · 第 {{ abyss.best }} 层</div>
          </div>
        </div>

        <div class="versus">
          <div class="side-card me">
            <small>我的战力</small>
            <b>{{ fmt(power) }}</b>
            <span>钓鱼力量</span>
          </div>
          <div class="vs">VS</div>
          <div class="side-card foe">
            <small>第 {{ floor + 1 }} 层守卫</small>
            <b>{{ fmt(enemyPower) }}</b>
            <span>胜率 {{ pct(winRate) }}</span>
          </div>
        </div>

        <div class="stamina">
          <div class="stamina-head">
            <span>⚡ 精力 {{ abyss.stamina }} / {{ ABYSS_MAX_STAMINA }}</span>
            <small>每日重置，挑战消耗 1</small>
          </div>
          <div class="bar"><i :style="{ width: (abyss.stamina / ABYSS_MAX_STAMINA * 100) + '%' }"></i></div>
        </div>

        <div class="actions">
          <button class="btn primary" :disabled="busy || abyss.stamina <= 0" @click="doChallenge">
            {{ busy ? '挑战中…' : abyss.stamina <= 0 ? '精力不足' : `⚔️ 挑战第 ${floor + 1} 层` }}
          </button>
          <button class="btn ghost" :disabled="busy || abyss.stamina >= ABYSS_MAX_STAMINA || shells < staminaCostNow" @click="doBuyStamina">
            {{ abyss.stamina >= ABYSS_MAX_STAMINA ? '精力已满' : `补满 · 🪙${fmt(staminaCostNow)}` }}
          </button>
        </div>
        <p class="tip">战力越高胜率越高。鱼竿力量、修为、道印都会提升战力；冲不动就去灵湖钓巨物变强吧。</p>
      </div>

      <!-- 右：奖励与进度 -->
      <div class="side">
        <div class="card">
          <div class="card-head"><span class="ico">🎁</span><div><b>下一层奖励</b><small>通关第 {{ floor + 1 }} 层可得</small></div></div>
          <div class="reward-row"><span>🪙 金币</span><b>{{ fmt(nextReward.coins) }}</b></div>
          <div class="reward-row"><span>🔮 道韵</span><b>+{{ nextReward.daoYun }}</b></div>
          <div class="milestone" v-if="nextReward.milestone">🌟 里程碑层！金币与道韵 5~10 倍</div>
          <p class="hint">道韵用于「轮回」铸造永久道印；每 10 层额外大额奖励。</p>
        </div>

        <div class="card">
          <div class="card-head"><span class="ico">📈</span><div><b>层数永久加成</b><small>自动生效，作用于每次抛竿</small></div></div>
          <div class="fx-list">
            <div><span>稀有几率</span><b class="good">+{{ pct(fx.rareBoost) }}</b></div>
            <div><span>鱼重倍率</span><b class="good">×{{ fx.weightMul.toFixed(3) }}</b></div>
            <div><span>金币收益</span><b class="good">×{{ fx.coinMul.toFixed(3) }}</b></div>
          </div>
          <p class="hint">每 10 层 +2% 金币、+0.5% 鱼重，无上限。</p>
        </div>

        <div class="card dao">
          <div class="card-head"><span class="ico">🔮</span><div><b>道韵存量</b><small>来自无尽塔，用于轮回</small></div></div>
          <div class="dao-big">{{ fmt(reinc.daoYun) }}</div>
          <router-link to="/more/rebirth" class="link">前往轮回 →</router-link>
        </div>
      </div>
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </section>
</template>

<style scoped>
.loading { text-align: center; color: #888; padding: 60px; }
.grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 16px; align-items: start; }
.card { background: #fff; border: 2px solid #e3d7f5; border-radius: 16px; padding: 18px; box-shadow: 0 6px 18px rgba(60,40,120,.08); }
.side { display: flex; flex-direction: column; gap: 16px; }
.card-head { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.ico { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; font-size: 22px; background: #eef2ff; border-radius: 12px; }
.card-head b { display: block; color: #3730a3; font-size: 15px; }
.card-head small { color: #9a8ab0; font-size: 11px; }
.tower-top { display: flex; gap: 16px; align-items: center; margin-bottom: 18px; }
.tower-art { font-size: 52px; }
.tower-top small { color: #8a8aa0; font-size: 12px; }
.floor-big { font-size: 38px; font-weight: 900; color: #4338ca; line-height: 1.1; }
.floor-big span { font-size: 18px; }
.best { color: #f59e0b; font-size: 12px; font-weight: bold; }
.versus { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; margin-bottom: 18px; }
.side-card { background: #f8f9ff; border: 2px solid #ece9fb; border-radius: 12px; padding: 12px; text-align: center; }
.side-card.me { border-color: #c7d2fe; }
.side-card.foe { border-color: #fecaca; background: #fff8f8; }
.side-card small { display: block; color: #8a8aa0; font-size: 11px; }
.side-card b { display: block; font-size: 22px; color: #3730a3; margin: 4px 0; }
.side-card.foe b { color: #dc2626; }
.side-card span { font-size: 11px; color: #6b7280; }
.vs { font-weight: 900; color: #c4b5fd; font-size: 18px; }
.stamina { margin-bottom: 16px; }
.stamina-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
.stamina-head span { font-weight: bold; color: #4338ca; }
.stamina-head small { color: #9a8ab0; }
.bar { height: 10px; background: #ede9fe; border-radius: 6px; overflow: hidden; }
.bar i { display: block; height: 100%; background: linear-gradient(90deg, #818cf8, #4f46e5); border-radius: 6px; transition: width .3s; }
.actions { display: flex; gap: 10px; }
.btn { padding: 12px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; flex: 1; }
.btn.primary { background: linear-gradient(145deg, #6366f1, #4338ca); color: #fff; }
.btn.ghost { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
.btn:disabled { opacity: .5; cursor: default; }
.tip { color: #8a8aa0; font-size: 11px; line-height: 1.6; margin: 14px 0 0; }
.reward-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
.reward-row b { color: #3730a3; }
.milestone { margin-top: 10px; background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; border-radius: 8px; padding: 8px; font-size: 12px; font-weight: bold; }
.hint { color: #9a8ab0; font-size: 11px; line-height: 1.6; margin: 12px 0 0; }
.fx-list { display: grid; gap: 8px; }
.fx-list > div { display: flex; justify-content: space-between; background: #faf6ff; border-radius: 8px; padding: 8px 10px; font-size: 12px; }
.fx-list span { color: #8a7aa0; }
.fx-list b.good { color: #2e7d32; }
.dao-big { font-size: 28px; font-weight: 900; color: #7c3aed; margin: 4px 0 10px; }
.link { color: #4338ca; font-size: 12px; font-weight: bold; text-decoration: none; }
.link:hover { text-decoration: underline; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
</style>
