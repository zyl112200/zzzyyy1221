<script setup>
import GameIcon from '../components/GameIcon.vue'
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { getSession } from '../store/session'
import { meApi } from '../api/game'
import { loadFeature, saveFeature } from '../api/featureApi.js'
import {
  normalizeFeature, bondContract, bondStarUp, bondToggleActive,
  bondExpandSlots, bondUpgradePool, fishTierOf
} from '../data/feature.js'
import {
  BOND_CATALOG, BOND_TIERS, TIER_ORDER, CODEX_MASTERY, MAX_STAR, MAX_SLOTS,
  contractCost, starUpCost, slotExpandCost, poolUpgradeCost, poolQiMul,
  activeBondFx, codexMasteryFx, masteredCodex, totalBondFx
} from '../data/bonds.js'

const session = getSession()
const username = session ? session.username : ''
const state = ref(normalizeFeature(null))
const codex = ref([])
const shells = ref(0)
const loading = ref(true)
const busy = ref('')
const filterTier = ref('ALL')
const toastVisible = ref(false)
const toastMessage = ref('')
let timer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { toastVisible.value = false }, 2600)
}

const bonds = computed(() => state.value.spiritBonds)
const ownedEntries = computed(() =>
  Object.keys(bonds.value.owned).map((name) => ({ name, star: bonds.value.owned[name], tier: fishTierOf(name) }))
)
const activeFx = computed(() => activeBondFx(bonds.value))
const masteryFx = computed(() => codexMasteryFx(codex.value))
const totalFx = computed(() => totalBondFx(state.value, codex.value))
const mastered = computed(() => masteredCodex(codex.value))
const qi = computed(() => state.value.pool)
const poolLevel = computed(() => bonds.value.poolLevel)
const slots = computed(() => bonds.value.slots)
const expandCost = computed(() => slotExpandCost(slots.value))
const poolCost = computed(() => poolUpgradeCost(poolLevel.value))
const canExpand = computed(() => slots.value < MAX_SLOTS)
const canUpgradePool = computed(() => poolLevel.value < 10)

const filteredCatalog = computed(() =>
  filterTier.value === 'ALL' ? BOND_CATALOG : BOND_CATALOG.filter((f) => f.tier === filterTier.value)
)
function isCaught(name) { return codex.value.includes(name) }
function starOf(name) { return bonds.value.owned[name] || 0 }
function isActive(name) { return bonds.value.active.includes(name) }
function costFor(name) {
  const tier = fishTierOf(name)
  const star = starOf(name)
  return star > 0 ? starUpCost(tier, star) : contractCost(tier)
}
function canAfford(cost) { return qi.value >= cost.qi && shells.value >= cost.coins }

async function load() {
  loading.value = true
  try {
    const [s, me] = await Promise.all([loadFeature(username, true), meApi(username)])
    if (s) state.value = s
    if (me && me.code === 200 && me.data) {
      codex.value = me.data.codex || []
      if (me.data.shells != null) shells.value = me.data.shells
    }
  } catch (e) {
    showToast(e.message || '灵契阁加载失败')
  } finally {
    loading.value = false
  }
}

/** 统一提交状态并按差额结算金币；成功后同步本地余额 */
async function commit(next, msg) {
  if (!next) { showToast('条件不足，无法操作'); return }
  busy.value = ''
  try {
    const res = await saveFeature(username, next)
    state.value = normalizeFeature((res && res.state) || next)
    if (res && res.shells != null) shells.value = res.shells
    showToast(msg)
  } catch (e) {
    showToast(e.message || '操作失败')
  } finally {
    busy.value = ''
  }
}

function doContract(name) {
  const cost = costFor(name)
  if (!canAfford(cost)) { showToast(`需 ${cost.qi} 灵气 + ${cost.coins} 金币`); return }
  const isNew = starOf(name) === 0
  const next = bondContract(state.value, name, codex.value) || bondStarUp(state.value, name)
  commit(next, isNew ? `✨ 已与「${name}」结契！` : `⭐「${name}」升至 ${starOf(name) + 1} 星`)
}

function doStarUp(name) {
  const cost = starUpCost(fishTierOf(name), starOf(name))
  if (!canAfford(cost)) { showToast(`需 ${cost.qi} 灵气 + ${cost.coins} 金币`); return }
  commit(bondStarUp(state.value, name), `⭐「${name}」升至 ${starOf(name) + 1} 星`)
}

function doToggle(name) {
  const next = bondToggleActive(state.value, name)
  if (!next) { showToast(isActive(name) ? '已下阵' : `出战位已满（${slots.value}/${MAX_SLOTS}），请先扩位或下阵`); return }
  commit(next, isActive(name) ? `「${name}」已下阵` : `⚔「${name}」已上阵`)
}

function doExpand() {
  if (!canExpand.value) return
  if (shells.value < expandCost.value) { showToast(`扩位需 ${expandCost.value} 金币`); return }
  commit(bondExpandSlots(state.value), `出战位扩至 ${slots.value + 1}`)
}

function doUpgradePool() {
  if (!canUpgradePool.value) return
  if (shells.value < poolCost.value) { showToast(`扩建需 ${poolCost.value} 金币`); return }
  commit(bondUpgradePool(state.value), `灵池扩建至 ${poolLevel.value + 1} 级 · 灵气凝聚 ×${poolQiMul(poolLevel.value + 1)}`)
}

function pct(n) { return Math.round((n || 0) * 100) + '%' }
function mul(n) { return '×' + (n || 1).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') }

onMounted(load)
</script>

<template>
  <div class="bond-page">
    <TopBar :shells="shells" />
    <div class="wrap">
      <header class="head">
        <div>
          <h1><GameIcon name="star" :size="22" /> 仙钓道途 · 灵契阁</h1>
          <p>将钓获的灵鱼结为道途灵契，耗灵气淬炼升星，择有限出战位并肩垂钓。集齐图鉴更能激活大成加成，永久增益每一次抛竿。</p>
        </div>
        <div class="purse">
          <span>🪙 {{ shells }}</span>
          <span class="qi">💧 {{ qi }} 灵气</span>
        </div>
      </header>

      <div v-if="loading" class="loading">正在开启灵契阁…</div>
      <div v-else class="layout">
        <!-- 左：当前道途加成总览 -->
        <aside class="side">
          <section class="card overview">
            <div class="card-head"><span class="ico">⚡</span><div><b>道途加成</b><small>出战灵契 + 图鉴大成</small></div></div>
            <div class="fx-list">
              <div><span>稀有几率</span><b class="good">+{{ pct(totalFx.rareBoost) }}</b></div>
              <div><span>鱼重倍率</span><b class="good">{{ mul(totalFx.weightMul) }}</b></div>
              <div><span>金币收益</span><b class="good">{{ mul(totalFx.coinMul) }}</b></div>
              <div><span>张力倍率</span><b class="good">{{ mul(totalFx.tensionMul) }}</b></div>
            </div>
            <div class="fx-split">
              <small>其中 · 出战灵契</small>
              <span>稀有 +{{ pct(activeFx.rareBoost) }} · 收益 {{ mul(activeFx.coinMul) }}</span>
              <small>其中 · 图鉴大成</small>
              <span>稀有 +{{ pct(masteryFx.rareBoost) }} · 收益 {{ mul(masteryFx.coinMul) }}</span>
            </div>
          </section>

          <section class="card pool-card">
            <div class="card-head"><span class="ico">💧</span><div><b>聚灵池</b><small>钓获凝聚灵气，供结契与升星</small></div></div>
            <div class="lv-big">{{ poolLevel }} <span>/ 10 级</span></div>
            <p class="hint">当前凝聚 ×{{ poolQiMul(poolLevel) }}，每级 +25%。</p>
            <button class="btn" :disabled="!canUpgradePool || !!busy" @click="doUpgradePool">
              {{ !canUpgradePool ? '灵池已圆满' : busy ? '处理中…' : `扩建 · 🪙${poolCost}` }}
            </button>
          </section>

          <section class="card slot-card">
            <div class="card-head"><span class="ico">⚔</span><div><b>出战位</b><small>同时生效的灵契数</small></div></div>
            <div class="lv-big">{{ bonds.active.length }} <span>/ {{ slots }} 已上阵</span></div>
            <div class="pips">
              <i v-for="n in slots" :key="n" :class="{ on: n <= bonds.active.length }"></i>
            </div>
            <button class="btn" :disabled="!canExpand || !!busy" @click="doExpand">
              {{ !canExpand ? `已满 ${MAX_SLOTS} 位` : busy ? '处理中…' : `扩位 · 🪙${expandCost}` }}
            </button>
          </section>
        </aside>

        <!-- 右：图鉴大成 + 灵契名录 -->
        <main class="content">
          <section class="card mastery">
            <div class="card-head"><span class="ico">📜</span><div><b>图鉴大成</b><small>集齐整组灵鱼，激活永久增益（自动生效）</small></div></div>
            <div class="mastery-grid">
              <div v-for="m in CODEX_MASTERY" :key="m.id" class="m-item" :class="{ done: mastered.some(x => x.id === m.id) }">
                <div class="m-top">
                  <b>{{ m.name }}</b>
                  <span class="badge" :style="{ color: BOND_TIERS[m.tier].color }">{{ BOND_TIERS[m.tier].label }}</span>
                </div>
                <small>{{ m.desc }}</small>
                <div class="m-fx">稀有 +{{ pct(m.bonus.rareBoost) }} · 鱼重 {{ mul(m.bonus.weightMul) }} · 收益 {{ mul(m.bonus.coinMul) }}</div>
                <div class="m-status">{{ mastered.some(x => x.id === m.id) ? '✓ 已大成' : '未集齐' }}</div>
              </div>
            </div>
          </section>

          <section class="card catalog">
            <div class="card-head">
              <span class="ico">🐟</span>
              <div><b>灵契名录</b><small>已结契 {{ ownedEntries.length }} / {{ BOND_CATALOG.length }} · 需先钓到方可结契</small></div>
            </div>
            <div class="filters">
              <button v-for="t in ['ALL', ...TIER_ORDER]" :key="t" :class="{ on: filterTier === t }" @click="filterTier = t">
                {{ t === 'ALL' ? '全部' : BOND_TIERS[t].label }}
              </button>
            </div>
            <div class="fish-grid">
              <div v-for="f in filteredCatalog" :key="f.name" class="fish" :class="{ caught: isCaught(f.name), bound: starOf(f.name) > 0, active: isActive(f.name) }">
                <div class="fish-top">
                  <span class="tier-dot" :style="{ background: f.color }"></span>
                  <b>{{ f.name }}</b>
                  <span v-if="isActive(f.name)" class="tag active">出战</span>
                  <span v-else-if="starOf(f.name) > 0" class="tag bound">{{ starOf(f.name) }}★</span>
                  <span v-else-if="!isCaught(f.name)" class="tag lock">未获</span>
                </div>
                <div class="stars">
                  <i v-for="n in MAX_STAR" :key="n" :class="{ on: n <= starOf(f.name) }">★</i>
                </div>
                <div v-if="starOf(f.name) > 0" class="fish-actions">
                  <button class="mini" :disabled="!!busy" @click="doToggle(f.name)">{{ isActive(f.name) ? '下阵' : '上阵' }}</button>
                  <button v-if="starOf(f.name) < MAX_STAR" class="mini up" :disabled="!!busy" @click="doStarUp(f.name)">
                    升星 {{ starUpCost(f.tier, starOf(f.name)).qi }}💧
                  </button>
                </div>
                <div v-else-if="isCaught(f.name)" class="fish-actions">
                  <button class="mini up" :disabled="!!busy" @click="doContract(f.name)">
                    结契 {{ contractCost(f.tier).qi }}💧 · 🪙{{ contractCost(f.tier).coins }}
                  </button>
                </div>
                <div v-else class="fish-actions"><span class="lock-hint">图鉴未解锁</span></div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.bond-page { min-height: 100vh; background: linear-gradient(180deg, rgba(7,15,30,.52), rgba(5,11,24,.74)), url('../assets/maps/scenes/scene_jibei.png') center center / cover fixed no-repeat; padding-bottom: 40px; }
.wrap { max-width: 1240px; margin: 0 auto; padding: 20px 16px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 12px 0 22px; }
.head h1 { margin: 0 0 6px; font-size: 26px; color: #5b2c83; }
.head p { margin: 0; color: #6b6a8a; font-size: 13px; max-width: 720px; line-height: 1.6; }
.purse { display: flex; flex-direction: column; gap: 6px; background: #fff; border: 2px solid #9575cd; border-radius: 18px; padding: 10px 18px; font-weight: bold; color: #6a1b9a; white-space: nowrap; }
.purse .qi { color: #00897b; }
.loading { text-align: center; color: #888; padding: 60px; }
.layout { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
.side { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border: 2px solid #e3d7f5; border-radius: 16px; padding: 18px; box-shadow: 0 6px 18px rgba(90,40,130,.08); }
.card-head { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; }
.ico { width: 44px; height: 44px; flex: 0 0 44px; display: grid; place-items: center; font-size: 24px; background: #f0e6fb; border-radius: 12px; }
.card-head b { display: block; color: #5b2c83; font-size: 16px; }
.card-head small { color: #9a8ab0; font-size: 11px; }
.fx-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.fx-list > div { background: #faf6ff; border-radius: 10px; padding: 8px 10px; }
.fx-list span { display: block; font-size: 11px; color: #8a7aa0; }
.fx-list b { font-size: 15px; }
.fx-list b.good { color: #2e7d32; }
.fx-split { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e0d5f0; display: flex; flex-direction: column; gap: 3px; }
.fx-split small { color: #9a8ab0; font-size: 11px; }
.fx-split span { font-size: 12px; color: #555; }
.lv-big { font-size: 18px; color: #5a5a6a; margin-bottom: 12px; }
.lv-big b { font-size: 32px; color: #7b1fa2; }
.lv-big span { color: #aaa; font-size: 14px; }
.hint { font-size: 12px; color: #7a7a8a; line-height: 1.6; margin: 0 0 10px; }
.pips { display: flex; gap: 5px; margin-bottom: 14px; }
.pips i { flex: 1; height: 8px; background: #e8e0f0; border-radius: 4px; }
.pips i.on { background: linear-gradient(90deg, #9575cd, #7b1fa2); }
.btn { width: 100%; padding: 11px; border: none; border-radius: 10px; background: linear-gradient(145deg, #9575cd, #7b1fa2); color: #fff; font-weight: bold; cursor: pointer; }
.btn:disabled { background: #cfd0d8; cursor: default; }
.mastery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.m-item { background: #faf7ff; border: 2px solid #ece2f8; border-radius: 12px; padding: 12px; }
.m-item.done { border-color: #66bb6a; background: #f1faf1; }
.m-top { display: flex; justify-content: space-between; align-items: center; }
.m-top b { color: #5b2c83; }
.badge { font-size: 11px; font-weight: bold; }
.m-item small { display: block; color: #8a8a9a; font-size: 11px; margin: 6px 0; }
.m-fx { font-size: 11px; color: #2e7d32; }
.m-status { margin-top: 6px; font-size: 12px; font-weight: bold; color: #b0a0c0; }
.m-item.done .m-status { color: #2e7d32; }
.filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
.filters button { padding: 5px 12px; border: 1px solid #ddd0ee; background: #faf6ff; border-radius: 16px; font-size: 12px; cursor: pointer; color: #7a6a90; }
.filters button.on { background: #7b1fa2; color: #fff; border-color: #7b1fa2; }
.fish-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.fish { background: #fafafa; border: 2px solid #ececec; border-radius: 12px; padding: 10px 12px; opacity: .6; }
.fish.caught { opacity: 1; border-color: #d6ece8; background: #f6fdfb; }
.fish.bound { border-color: #9575cd; }
.fish.active { border-color: #ff9800; background: #fffaf0; }
.fish-top { display: flex; align-items: center; gap: 6px; }
.fish-top b { font-size: 14px; color: #444; }
.tier-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 10px; }
.tag { margin-left: auto; font-size: 10px; padding: 2px 6px; border-radius: 8px; font-weight: bold; }
.tag.active { background: #ffe0b2; color: #e65100; }
.tag.bound { background: #ede7f6; color: #7b1fa2; }
.tag.lock { background: #eee; color: #999; }
.stars { display: flex; gap: 2px; margin: 8px 0; flex-wrap: wrap; }
.stars i { font-style: normal; color: #e0e0e0; font-size: 14px; }
.stars i.on { color: #ffb300; }
.fish-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.mini { flex: 1; min-width: 56px; padding: 6px; border: none; border-radius: 8px; background: #90a4ae; color: #fff; font-size: 11px; font-weight: bold; cursor: pointer; }
.mini.up { background: linear-gradient(145deg, #9575cd, #7b1fa2); }
.mini:disabled { opacity: .5; cursor: default; }
.lock-hint { font-size: 11px; color: #b0b0b0; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .head { flex-direction: column; }
}
</style>
