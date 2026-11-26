<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import GameIcon from '../components/GameIcon.vue'
import { getSession } from '../store/session'
import { loadFeature, saveFeature } from '../api/featureApi.js'
import {
  normalizeFeature, blessingOf, forgeBonus, forgeCost, bondUpgradePool
} from '../data/feature.js'
import { poolUpgradeCost, poolQiMul, MAX_POOL_LEVEL } from '../data/bonds.js'

const session = getSession()
const username = session ? session.username : ''
const state = ref(normalizeFeature(null))
const shells = ref(0)
const loading = ref(true)
const busy = ref('')
const toastVisible = ref(false)
const toastMessage = ref('')
let timer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { toastVisible.value = false }, 2600)
}

const forgeLv = computed(() => blessingOf(state.value))
const fx = computed(() => forgeBonus(forgeLv.value))
const nextCost = computed(() => forgeCost(forgeLv.value))
const canForge = computed(() => forgeLv.value < 10)
const poolLevel = computed(() => (state.value.spiritBonds && state.value.spiritBonds.poolLevel) || 0)
const poolCost = computed(() => poolUpgradeCost(poolLevel.value))
const canUpgradePool = computed(() => poolLevel.value < MAX_POOL_LEVEL)
const stats = computed(() => state.value.stats || {})

/** 灵池扩建：提升灵气凝聚倍率（导出到灵契阁共用同一状态） */
async function doUpgradePool() {
  if (!canUpgradePool.value || busy.value) return
  if (shells.value < poolCost.value) {
    showToast(`金币不足，扩建需 ${poolCost.value} 金币`)
    return
  }
  busy.value = 'pool'
  try {
    const next = bondUpgradePool(state.value)
    if (!next) throw new Error('灵池已圆满')
    const res = await saveFeature(username, next)
    state.value = normalizeFeature((res && res.state) || next)
    if (res && res.shells != null) shells.value = res.shells
    showToast(`💧 灵池扩建至 ${poolLevel.value + 1} 级 · 灵气凝聚 ×${poolQiMul(poolLevel.value + 1)}`)
  } catch (e) {
    showToast(e.message || '扩建失败')
  } finally {
    busy.value = ''
  }
}

async function load() {
  loading.value = true
  try {
    const s = await loadFeature(username, true)
    if (s) state.value = s
  } catch (e) {
    showToast(e.message || '洞天状态加载失败')
  } finally {
    loading.value = false
  }
}

/** 淬炼本命法宝：构造消费后的状态并提交（earnedTotal 负差额扣费） */
async function doForge() {
  if (!canForge.value || busy.value) return
  if (shells.value < nextCost.value) {
    showToast(`金币不足，淬炼需 ${nextCost.value} 金币`)
    return
  }
  busy.value = 'forge'
  try {
    const next = normalizeFeature(state.value)
    next.forgeLevel = forgeLv.value + 1
    next.earnedTotal = next.earnedTotal - nextCost.value
    const res = await saveFeature(username, next)
    state.value = normalizeFeature((res && res.state) || next)
    if (res && res.shells != null) shells.value = res.shells
    else shells.value = Math.max(0, shells.value - nextCost.value)
    showToast(`⚔ 本命钓竿淬炼至第 ${next.forgeLevel} 重！`)
  } catch (e) {
    showToast(e.message || '淬炼失败')
  } finally {
    busy.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="pond-page">
    <TopBar :shells="shells" />
    <div class="wrap">
      <header class="head">
        <div>
          <h1>🏞 洞天福地</h1>
          <p>聚灵池、淬本命法宝，潜移默化提升每一次抛竿的机缘与收益。</p>
        </div>
        <div class="purse">🪙 {{ shells }}</div>
      </header>

      <div v-if="loading" class="loading">正在开启洞天…</div>
      <div v-else class="grid">
        <!-- 本命法宝 -->
        <section class="card forge">
          <div class="card-head">
            <span class="ico">⚔</span>
            <div><b>本命钓竿</b><small>淬炼重数越高，稀有率 / 鱼重 / 收益全面提升</small></div>
          </div>
          <div class="lv-big">第 <b>{{ forgeLv }}</b> 重 <span>/ {{ FORGE_MAX }}</span></div>
          <div class="fx-list">
            <span>稀有几率 +{{ Math.round(fx.rareBoost * 100) }}%</span>
            <span>鱼重 ×{{ fx.weightMul }}</span>
            <span>收益 +{{ Math.round((fx.coinMul - 1) * 100) }}%</span>
            <span>张力 ×{{ fx.tensionMul }}</span>
          </div>
          <div class="pips">
            <i v-for="n in FORGE_MAX" :key="n" :class="{ on: n <= forgeLv }"></i>
          </div>
          <button class="btn" :disabled="!canForge || busy === 'forge'" @click="doForge">
            {{ !canForge ? '已臻圆满' : busy === 'forge' ? '淬炼中…' : `淬炼 · 🪙${nextCost}` }}
          </button>
        </section>

        <!-- 灵池 -->
        <section class="card pool">
          <div class="card-head">
            <span class="ico">💧</span>
            <div><b>聚灵池</b><small>每次成功钓获凝聚灵气，用于结契与升星灵契</small></div>
          </div>
          <div class="lv-big">灵气 <b>{{ state.pool }}</b></div>
          <p class="hint">当前 {{ poolLevel }} / {{ MAX_POOL_LEVEL }} 级 · 凝聚 ×{{ poolQiMul(poolLevel) }}，每级 +25%。扩建后灵气积累更快。</p>
          <button class="btn" :disabled="!canUpgradePool || busy === 'pool'" @click="doUpgradePool">
            {{ !canUpgradePool ? '灵池已圆满' : busy === 'pool' ? '扩建中…' : `扩建 · 🪙${poolCost}` }}
          </button>
        </section>

        <!-- 钓获统计 -->
        <section class="card stat">
          <div class="card-head">
            <span class="ico">📊</span>
            <div><b>钓道 stats</b><small>洞天累计战绩</small></div>
          </div>
          <div class="stat-grid">
            <div><span>累计抛竿</span><b>{{ stats.totalCatch || 0 }}</b></div>
            <div><span>成功入护</span><b>{{ stats.landed || 0 }}</b></div>
            <div><span>最重单尾</span><b>{{ stats.maxWeight || 0 }} 斤</b></div>
          </div>
        </section>
      </div>
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.pond-page { min-height: 100vh; background: linear-gradient(160deg, #e8f7f4, #eef3ff); padding-bottom: 40px; }
.wrap { max-width: 1000px; margin: 0 auto; padding: 20px 16px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 12px 0 24px; }
.head h1 { margin: 0 0 6px; font-size: 26px; color: #00695c; }
.head p { margin: 0; color: #6a8a84; font-size: 13px; max-width: 640px; }
.purse { background: #fff; border: 2px solid #26a69a; border-radius: 20px; padding: 8px 16px; font-weight: bold; color: #00796b; white-space: nowrap; }
.loading { text-align: center; color: #888; padding: 60px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.card { background: #fff; border: 2px solid #d6ece8; border-radius: 16px; padding: 18px; box-shadow: 0 6px 18px rgba(0,90,80,.08); }
.card-head { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.ico { width: 44px; height: 44px; flex: 0 0 44px; display: grid; place-items: center; font-size: 24px; background: #e0f2f1; border-radius: 12px; }
.card-head b { display: block; color: #00695c; font-size: 16px; }
.card-head small { color: #8aa; font-size: 11px; }
.lv-big { font-size: 18px; color: #4a5a58; margin-bottom: 14px; }
.lv-big b { font-size: 32px; color: #e65100; }
.lv-big span { color: #aaa; font-size: 14px; }
.fx-list { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: #2e7d32; margin-bottom: 14px; }
.pips { display: flex; gap: 5px; margin-bottom: 16px; }
.pips i { flex: 1; height: 8px; background: #e0e0e0; border-radius: 4px; }
.pips i.on { background: linear-gradient(90deg, #26a69a, #00897b); }
.btn { width: 100%; padding: 11px; border: none; border-radius: 10px; background: linear-gradient(145deg, #26a69a, #00897b); color: #fff; font-weight: bold; cursor: pointer; }
.btn:disabled { background: #cfd8dc; cursor: default; }
.hint { font-size: 12px; color: #6a8a84; line-height: 1.6; min-height: 60px; }
.placeholder { text-align: center; padding: 10px; border: 1px dashed #b0bec5; border-radius: 10px; color: #90a4ae; font-size: 12px; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.stat-grid div { background: #f4faf8; border-radius: 10px; padding: 12px; text-align: center; }
.stat-grid span { display: block; font-size: 11px; color: #7a9a94; }
.stat-grid b { display: block; font-size: 18px; color: #00695c; margin-top: 4px; }
</style>
