<script setup>
import { ref, computed, onMounted } from 'vue'
import ToastMessage from '../../components/ToastMessage.vue'
import { getSession } from '../../store/session'
import { loadFeature, saveFeature } from '../../api/featureApi.js'
import { normalizeFeature, advSettleVein, advCollectVein, advUpgradeVein } from '../../data/feature.js'
import { VEIN_MAX_LEVEL, VEIN_CAP_HOURS, veinRate, veinUpgradeCost } from '../../data/advance.js'

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
  timer = setTimeout(() => { toastVisible.value = false }, 2800)
}

const vein = computed(() => state.value.advance.vein)
const rate = computed(() => veinRate(vein.value.level))
const upCost = computed(() => veinUpgradeCost(vein.value.level))
const canUpgrade = computed(() => vein.value.level < VEIN_MAX_LEVEL)

const accumulator = computed(() => {
  const elapsedMin = Math.max(0, (Date.now() - vein.value.lastTick) / 60000)
  const capped = Math.min(elapsedMin, VEIN_CAP_HOURS * 60)
  return {
    coins: Math.floor(vein.value.accumulated + capped * rate.value.coinsPerMin),
    qi: Math.floor(vein.value.accumulatedQi + capped * rate.value.qiPerMin),
    cappedHours: elapsedMin / 60 > VEIN_CAP_HOURS
  }
})

function fmt(n) {
  n = Math.round(n || 0)
  return n >= 1e8 ? (n / 1e8).toFixed(2) + ' 亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + ' 万' : String(n)
}

async function commit(next, msg) {
  busy.value = ''
  try {
    const res = await saveFeature(username, next)
    state.value = normalizeFeature((res && res.state) || next)
    if (res && res.shells != null) shells.value = res.shells
    showToast(msg)
  } catch (e) {
    showToast(e.message || '操作失败')
  }
}

async function load() {
  loading.value = true
  try {
    let s = await loadFeature(username, true)
    if (s) {
      // 进入页面先把离线产出结算进累积池并写回，避免重复累积
      s = advSettleVein(s, Date.now())
      const res = await saveFeature(username, s)
      state.value = normalizeFeature((res && res.state) || s)
      if (res && res.shells != null) shells.value = res.shells
    }
  } catch (e) {
    showToast(e.message || '灵脉加载失败')
  } finally {
    loading.value = false
  }
}

async function doCollect() {
  if (busy.value) return
  const acc = accumulator.value
  if (acc.coins <= 0 && acc.qi <= 0) { showToast('暂无可收取的产出'); return }
  const next = advCollectVein(state.value, Date.now())
  if (!next) { showToast('暂无可收取的产出'); return }
  busy.value = 'collect'
  await commit(next, `💎 收取 ${fmt(acc.coins)} 金币、${fmt(acc.qi)} 灵气`)
}

async function doUpgrade() {
  if (busy.value || !canUpgrade.value) return
  if (shells.value < upCost.value) { showToast(`升级需 ${fmt(upCost.value)} 金币`); return }
  const next = advUpgradeVein(state.value, Date.now())
  if (!next) return
  busy.value = 'upgrade'
  await commit(next, `灵脉升至 ${vein.value.level + 1} 级，产出提升！`)
}

onMounted(load)
</script>

<template>
  <section class="panel">
    <div v-if="loading" class="loading">正在开启灵脉…</div>
    <div v-else class="grid">
      <div class="card main">
        <div class="head-row">
          <div class="vein-art">💎</div>
          <div>
            <small>灵脉等级</small>
            <div class="lv-big">{{ vein.level }} <span>/ {{ VEIN_MAX_LEVEL }} 级</span></div>
          </div>
          <div class="status" v-if="accumulator.cappedHours">⏳ 已满仓（{{ VEIN_CAP_HOURS }}h 上限）</div>
        </div>

        <div class="accum-box">
          <div class="accum-title">待收取产出 <small>离线也在累积</small></div>
          <div class="accum-nums">
            <div><span>🪙 金币</span><b>{{ fmt(accumulator.coins) }}</b></div>
            <div><span>💧 灵气</span><b>{{ fmt(accumulator.qi) }}</b></div>
          </div>
          <button class="btn primary" :disabled="busy === 'collect' || (accumulator.coins <= 0 && accumulator.qi <= 0)" @click="doCollect">
            {{ busy === 'collect' ? '收取中…' : '💰 一键收取' }}
          </button>
        </div>

        <div class="rate-box">
          <div><span>每分钟产金币</span><b>+{{ rate.coinsPerMin }}</b></div>
          <div><span>每分钟产灵气</span><b>+{{ rate.qiPerMin }}</b></div>
          <div><span>累计已收金币</span><b>{{ fmt(vein.totalCollected) }}</b></div>
        </div>
      </div>

      <div class="card upgrade">
        <div class="card-head"><span class="ico">⬆️</span><div><b>升级灵脉</b><small>等级越高，挂机产出越丰厚</small></div></div>
        <div class="up-preview">
          <div class="col"><small>当前 Lv.{{ vein.level }}</small><b>{{ rate.coinsPerMin }}/分</b></div>
          <div class="arrow">→</div>
          <div class="col next" v-if="canUpgrade"><small>Lv.{{ vein.level + 1 }}</small><b>{{ veinRate(vein.level + 1).coinsPerMin }}/分</b></div>
          <div class="col next" v-else><small>已满级</small><b>MAX</b></div>
        </div>
        <button class="btn up" :disabled="busy === 'upgrade' || !canUpgrade || shells < upCost" @click="doUpgrade">
          {{ !canUpgrade ? '灵脉已圆满' : busy === 'upgrade' ? '升级中…' : `升级 · 🪙${fmt(upCost)}` }}
        </button>
        <p class="hint">金币不够？去灵湖钓鱼，或用「无尽塔」冲层赚金币。灵气可用于「灵契」结契升星。</p>
      </div>
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </section>
</template>

<style scoped>
.loading { text-align: center; color: #888; padding: 60px; }
.grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 16px; align-items: start; }
.card { background: #fff; border: 2px solid #e3d7f5; border-radius: 16px; padding: 18px; box-shadow: 0 6px 18px rgba(60,40,120,.08); }
.head-row { display: flex; gap: 14px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; }
.vein-art { font-size: 46px; }
.head-row small { color: #8a8aa0; font-size: 12px; }
.lv-big { font-size: 34px; font-weight: 900; color: #7c3aed; line-height: 1.1; }
.lv-big span { font-size: 16px; color: #aaa; }
.status { margin-left: auto; background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; border-radius: 10px; padding: 6px 10px; font-size: 11px; font-weight: bold; }
.accum-box { background: linear-gradient(145deg, #f5f3ff, #eef2ff); border: 2px solid #ddd6fe; border-radius: 14px; padding: 16px; }
.accum-title { font-weight: bold; color: #4338ca; font-size: 14px; margin-bottom: 12px; }
.accum-title small { color: #9a8ab0; font-weight: normal; font-size: 11px; }
.accum-nums { display: flex; gap: 12px; margin-bottom: 14px; }
.accum-nums > div { flex: 1; background: #fff; border-radius: 10px; padding: 10px; }
.accum-nums span { display: block; color: #8a8aa0; font-size: 11px; }
.accum-nums b { font-size: 22px; color: #5b21b6; }
.btn { padding: 12px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; width: 100%; }
.btn.primary { background: linear-gradient(145deg, #8b5cf6, #6d28d9); color: #fff; }
.btn:disabled { opacity: .5; cursor: default; }
.rate-box { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
.rate-box > div { background: #f8f9ff; border-radius: 10px; padding: 10px; text-align: center; }
.rate-box span { display: block; color: #8a8aa0; font-size: 11px; }
.rate-box b { color: #4338ca; font-size: 16px; }
.card-head { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.ico { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; font-size: 22px; background: #eef2ff; border-radius: 12px; }
.card-head b { display: block; color: #3730a3; font-size: 15px; }
.card-head small { color: #9a8ab0; font-size: 11px; }
.up-preview { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; margin-bottom: 16px; }
.col { background: #f8f9ff; border-radius: 10px; padding: 12px; text-align: center; }
.col small { display: block; color: #8a8aa0; font-size: 11px; }
.col b { color: #6b7280; font-size: 18px; }
.col.next { background: #f5f3ff; }
.col.next b { color: #7c3aed; }
.arrow { color: #c4b5fd; font-weight: 900; font-size: 20px; }
.btn.up { background: linear-gradient(145deg, #a78bfa, #7c3aed); color: #fff; }
.hint { color: #9a8ab0; font-size: 11px; line-height: 1.6; margin: 14px 0 0; }
@media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
</style>
