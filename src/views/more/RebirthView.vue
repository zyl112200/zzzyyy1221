<script setup>
import { ref, computed, onMounted } from 'vue'
import ToastMessage from '../../components/ToastMessage.vue'
import { getSession } from '../../store/session'
import { loadFeature, saveFeature } from '../../api/featureApi.js'
import { normalizeFeature, advReincarnate, advAllocateSeal } from '../../data/feature.js'
import {
  SEAL_TYPES, SEAL_META, reincarnateCost, reincarnateFloor, reincarnateReady, sealFx
} from '../../data/advance.js'

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
  timer = setTimeout(() => { toastVisible.value = false }, 3000)
}

const reinc = computed(() => state.value.advance.reincarnation)
const abyss = computed(() => state.value.advance.abyss)
const ready = computed(() => reincarnateReady(state.value.advance))
const cost = computed(() => reincarnateCost(reinc.value.cycle))
const floorNeed = computed(() => reincarnateFloor(reinc.value.cycle))
const fx = computed(() => sealFx(state.value.advance))

function fmt(n) {
  n = Math.round(n || 0)
  return n >= 1e8 ? (n / 1e8).toFixed(2) + ' 亿' : n >= 1e4 ? (n / 1e4).toFixed(1) + ' 万' : String(n)
}
function pct(n) { return Math.round((n || 0) * 100) + '%' }
function sealLevel(t) { return reinc.value.seals[t] || 0 }

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
    showToast(e.message || '轮回殿加载失败')
  } finally {
    loading.value = false
  }
}

async function doReincarnate() {
  if (busy.value) return
  if (!ready.value.ready) {
    showToast(`需 ${fmt(cost.value)} 道韵 + 无尽塔第 ${floorNeed.value} 层`)
    return
  }
  const next = advReincarnate(state.value)
  if (!next) { showToast('轮回条件未满足'); return }
  busy.value = 'rebirth'
  await commit(next, `🔄 第 ${reinc.value.cycle + 1} 轮轮回完成！获得 1 点道印`)
}

async function doAllocate(type) {
  if (busy.value) return
  if (reinc.value.pendingSeals <= 0) { showToast('暂无可分配道印，先完成轮回'); return }
  const next = advAllocateSeal(state.value, type)
  if (!next) return
  busy.value = 'alloc'
  await commit(next, `${SEAL_META[type].name} 已升至 ${sealLevel(type) + 1} 级`)
}

onMounted(load)
</script>

<template>
  <section class="panel">
    <div v-if="loading" class="loading">正在开启轮回殿…</div>
    <div v-else class="wrap-inner">
      <!-- 轮回主槽 -->
      <div class="card rebirth-card">
        <div class="rb-art">🔄</div>
        <div class="rb-info">
          <small>轮回之道 · 永久加成</small>
          <div class="cycle-big">第 {{ reinc.cycle }} <span>轮</span></div>
          <p>以道韵撬动天道，每一轮铸就一枚永久「道印」。轮回次数越多，道印越强，且永不重置。</p>
        </div>
        <div class="rb-action">
          <div class="dao-owned">🔮 {{ fmt(reinc.daoYun) }} 道韵</div>
          <button class="btn primary" :disabled="busy === 'rebirth' || !ready.ready" @click="doReincarnate">
            {{ busy === 'rebirth' ? '轮回中…' : !ready.ready ? '条件未满足' : '🔄 立即轮回' }}
          </button>
          <div class="req" :class="{ ok: reinc.daoYun >= cost }">
            道韵 {{ fmt(reinc.daoYun) }} / {{ fmt(cost) }}
          </div>
          <div class="req" :class="{ ok: abyss.floor >= floorNeed }">
            无尽塔第 {{ abyss.floor }} / {{ floorNeed }} 层
          </div>
        </div>
      </div>

      <!-- 道印分配 -->
      <div class="card">
        <div class="card-head">
          <span class="ico">🪙</span>
          <div>
            <b>道印 · 永久加成</b>
            <small>待分配道印 {{ reinc.pendingSeals }} 点 · 点击道印分配，效果立即生效</small>
          </div>
        </div>
        <div class="seal-grid">
          <div v-for="t in SEAL_TYPES" :key="t" class="seal" :class="{ active: sealLevel(t) > 0 }">
            <div class="seal-top">
              <span class="seal-ico">{{ SEAL_META[t].icon }}</span>
              <b>{{ SEAL_META[t].name }}</b>
              <span class="lv">Lv.{{ sealLevel(t) }}</span>
            </div>
            <p>{{ SEAL_META[t].desc }}</p>
            <button class="mini" :disabled="busy === 'alloc' || reinc.pendingSeals <= 0" @click="doAllocate(t)">
              {{ reinc.pendingSeals > 0 ? '分配 +1' : '暂无道印' }}
            </button>
          </div>
        </div>
        <div class="fx-summary">
          <span>当前道印加成：</span>
          <b>稀有 +{{ pct(fx.rareBoost) }}</b>
          <b>鱼重 ×{{ fx.weightMul.toFixed(3) }}</b>
          <b>收益 ×{{ fx.coinMul.toFixed(3) }}</b>
          <b>张力 ×{{ fx.tensionMul.toFixed(3) }}</b>
        </div>
      </div>

      <p class="flow-tip">💡 道韵来自「无尽塔」冲层；道印加成会并入抛竿，让钓鱼收益、稀有率永久提升，形成正循环。</p>
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </section>
</template>

<style scoped>
.loading { text-align: center; color: #888; padding: 60px; }
.wrap-inner { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 2px solid #e3d7f5; border-radius: 16px; padding: 18px; box-shadow: 0 6px 18px rgba(60,40,120,.08); }
.rebirth-card { display: flex; gap: 18px; align-items: center; background: linear-gradient(145deg, #faf5ff, #f3e8ff); border-color: #e9d5ff; flex-wrap: wrap; }
.rb-art { font-size: 56px; }
.rb-info { flex: 1; min-width: 220px; }
.rb-info small { color: #8a8aa0; font-size: 12px; }
.cycle-big { font-size: 34px; font-weight: 900; color: #7e22ce; line-height: 1.1; }
.cycle-big span { font-size: 16px; }
.rb-info p { margin: 6px 0 0; color: #6b6a8a; font-size: 12px; line-height: 1.6; max-width: 420px; }
.rb-action { display: flex; flex-direction: column; gap: 6px; min-width: 180px; }
.dao-owned { color: #7c3aed; font-weight: bold; font-size: 15px; text-align: center; }
.btn { padding: 11px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; }
.btn.primary { background: linear-gradient(145deg, #a855f7, #7e22ce); color: #fff; }
.btn:disabled { opacity: .5; cursor: default; }
.req { font-size: 11px; color: #dc2626; text-align: center; }
.req.ok { color: #2e7d32; }
.card-head { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.ico { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; font-size: 22px; background: #faf5ff; border-radius: 12px; }
.card-head b { display: block; color: #7e22ce; font-size: 15px; }
.card-head small { color: #9a8ab0; font-size: 11px; }
.seal-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.seal { background: #fafafa; border: 2px solid #ececec; border-radius: 12px; padding: 12px; opacity: .7; }
.seal.active { border-color: #c084fc; background: #faf5ff; opacity: 1; }
.seal-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.seal-ico { font-size: 20px; }
.seal-top b { font-size: 13px; color: #5b2c83; }
.lv { margin-left: auto; color: #7c3aed; font-weight: bold; font-size: 12px; }
.seal p { color: #8a8aa0; font-size: 11px; margin: 8px 0; min-height: 30px; }
.mini { width: 100%; padding: 7px; border: none; border-radius: 8px; background: linear-gradient(145deg, #a855f7, #7e22ce); color: #fff; font-size: 11px; font-weight: bold; cursor: pointer; }
.mini:disabled { background: #d1d5db; cursor: default; }
.fx-summary { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e9d5ff; font-size: 12px; }
.fx-summary span { color: #8a8aa0; }
.fx-summary b { color: #2e7d32; }
.flow-tip { color: #7c3aed; font-size: 12px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 10px 14px; margin: 0; }
@media (max-width: 900px) { .seal-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
