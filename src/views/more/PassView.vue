<script setup>
import { ref, computed, onMounted } from 'vue'
import ToastMessage from '../../components/ToastMessage.vue'
import { getSession } from '../../store/session'
import { loadFeature, saveFeature } from '../../api/featureApi.js'
import { normalizeFeature, advClaimPassDaily } from '../../data/feature.js'
import { PASS_DAILY, PASS_MAX_LEVEL, passExpNeed, passFx } from '../../data/advance.js'

const session = getSession()
const username = session ? session.username : ''
const state = ref(normalizeFeature(null))
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

const pass = computed(() => state.value.advance.pass)
const fx = computed(() => passFx(state.value.advance))
const need = computed(() => passExpNeed(pass.value.level))
const expPct = computed(() => pass.value.level >= PASS_MAX_LEVEL ? 100 : Math.min(100, Math.round(pass.value.exp / need.value * 100)))
const maxed = computed(() => pass.value.level >= PASS_MAX_LEVEL)

function fmt(n) {
  n = Math.round(n || 0)
  return n >= 1e8 ? (n / 1e8).toFixed(2) + ' 亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + ' 万' : String(n)
}
function pct(n) { return Math.round((n || 0) * 100) + '%' }
function progress(id) { const t = PASS_DAILY.find((x) => x.id === id); return Math.min(1, (pass.value.daily[id] || 0) / (t ? t.need : 1)) }
function claimed(id) { return pass.value.dailyClaimed.includes(id) }

async function commit(next, msg) {
  busy.value = ''
  try {
    const res = await saveFeature(username, next)
    state.value = normalizeFeature((res && res.state) || next)
    showToast(msg)
  } catch (e) {
    showToast(e.message || '操作失败')
  }
}

async function load() {
  loading.value = true
  try {
    const s = await loadFeature(username, true)
    if (s) state.value = s
  } catch (e) {
    showToast(e.message || '战令加载失败')
  } finally {
    loading.value = false
  }
}

async function doClaim(id) {
  if (busy.value || claimed(id)) return
  const t = PASS_DAILY.find((x) => x.id === id)
  if (!t || (pass.value.daily[id] || 0) < t.need) { showToast('任务未完成'); return }
  const next = advClaimPassDaily(state.value, id)
  if (!next) { showToast('奖励已领取或未完成'); return }
  busy.value = id
  await commit(next, `领取「${t.name}」成功！`)
}

onMounted(load)
</script>

<template>
  <section class="panel">
    <div v-if="loading" class="loading">正在开启战令…</div>
    <div v-else class="wrap-inner">
      <!-- 战令主卡 -->
      <div class="card pass-card">
        <div class="pass-art">📜</div>
        <div class="pass-info">
          <small>道途战令 · 每日修炼</small>
          <div class="lv-big">Lv.{{ pass.level }} <span>/ {{ PASS_MAX_LEVEL }}</span></div>
          <div class="exp-bar">
            <i :style="{ width: expPct + '%' }"></i>
            <span v-if="!maxed">{{ fmt(pass.exp) }} / {{ fmt(need) }} 经验</span>
            <span v-else>已满级 · 永久加成拉满</span>
          </div>
        </div>
        <div class="pass-fx">
          <div class="fx-title">里程碑加成（每 5 级）</div>
          <div class="fx-grid">
            <div><span>稀有</span><b>+{{ pct(fx.rareBoost) }}</b></div>
            <div><span>鱼重</span><b>×{{ fx.weightMul.toFixed(3) }}</b></div>
            <div><span>收益</span><b>×{{ fx.coinMul.toFixed(3) }}</b></div>
          </div>
        </div>
      </div>

      <!-- 每日任务 -->
      <div class="card">
        <div class="card-head"><span class="ico">✅</span><div><b>每日任务</b><small>每日刷新 · 完成领取经验与金币，自动升级战令</small></div></div>
        <div class="task-list">
          <div v-for="t in PASS_DAILY" :key="t.id" class="task" :class="{ done: claimed(t.id) }">
            <div class="task-info">
              <b>{{ t.name }}</b>
              <small>进度 {{ pass.daily[t.id] || 0 }} / {{ t.need }}</small>
              <div class="mini-bar"><i :style="{ width: (progress(t.id) * 100) + '%' }"></i></div>
            </div>
            <div class="task-reward">+{{ t.exp }} 经验 · 🪙{{ fmt(t.coins) }}</div>
            <button class="btn-claim" :disabled="busy === t.id || claimed(t.id) || (pass.daily[t.id] || 0) < t.need" @click="doClaim(t.id)">
              {{ claimed(t.id) ? '已领取' : busy === t.id ? '领取中…' : '领取' }}
            </button>
          </div>
        </div>
      </div>

      <p class="flow-tip">💡 钓鱼、爬塔、收灵脉会自动计入任务进度；战令每升 5 级激活一档永久加成，满级共 10 档。每日任务进度每天归零，奖励别忘领。</p>
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </section>
</template>

<style scoped>
.loading { text-align: center; color: #888; padding: 60px; }
.wrap-inner { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 2px solid #e3d7f5; border-radius: 16px; padding: 18px; box-shadow: 0 6px 18px rgba(60,40,120,.08); }
.pass-card { display: flex; gap: 18px; align-items: center; background: linear-gradient(145deg, #ecfdf5, #eef2ff); border-color: #a7f3d0; flex-wrap: wrap; }
.pass-art { font-size: 56px; }
.pass-info { flex: 1; min-width: 220px; }
.pass-info small { color: #8a8aa0; font-size: 12px; }
.lv-big { font-size: 34px; font-weight: 900; color: #047857; line-height: 1.1; }
.lv-big span { font-size: 16px; color: #aaa; }
.exp-bar { position: relative; height: 16px; background: #d1fae5; border-radius: 8px; margin-top: 8px; overflow: hidden; }
.exp-bar i { display: block; height: 100%; background: linear-gradient(90deg, #34d399, #059669); border-radius: 8px; }
.exp-bar span { position: absolute; inset: 0; display: grid; place-items: center; font-size: 10px; font-weight: bold; color: #065f46; }
.pass-fx { min-width: 220px; }
.fx-title { color: #047857; font-weight: bold; font-size: 12px; margin-bottom: 8px; }
.fx-grid { display: flex; gap: 8px; }
.fx-grid > div { background: #fff; border-radius: 8px; padding: 8px 10px; flex: 1; text-align: center; }
.fx-grid span { display: block; color: #8a8aa0; font-size: 10px; }
.fx-grid b { color: #2e7d32; font-size: 13px; }
.card-head { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.ico { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; font-size: 22px; background: #ecfdf5; border-radius: 12px; }
.card-head b { display: block; color: #047857; font-size: 15px; }
.card-head small { color: #9a8ab0; font-size: 11px; }
.task-list { display: flex; flex-direction: column; gap: 10px; }
.task { display: flex; align-items: center; gap: 14px; background: #f8fafc; border: 2px solid #eef2f7; border-radius: 12px; padding: 12px 14px; }
.task.done { opacity: .6; border-color: #a7f3d0; background: #f0fdf4; }
.task-info { flex: 1; min-width: 140px; }
.task-info b { color: #334155; font-size: 14px; }
.task-info small { display: block; color: #94a3b8; font-size: 11px; margin: 3px 0 6px; }
.mini-bar { height: 6px; background: #e2e8f0; border-radius: 4px; overflow: hidden; max-width: 220px; }
.mini-bar i { display: block; height: 100%; background: #10b981; border-radius: 4px; }
.task-reward { color: #059669; font-size: 12px; font-weight: bold; white-space: nowrap; }
.btn-claim { padding: 9px 16px; border: none; border-radius: 9px; background: linear-gradient(145deg, #34d399, #059669); color: #fff; font-weight: bold; font-size: 12px; cursor: pointer; white-space: nowrap; }
.btn-claim:disabled { background: #d1d5db; cursor: default; }
.flow-tip { color: #047857; font-size: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px 14px; margin: 0; }
@media (max-width: 640px) {
  .task { flex-wrap: wrap; }
  .task-reward { width: 100%; }
}
</style>
