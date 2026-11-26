<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import GameIcon from '../components/GameIcon.vue'
import { getSession } from '../store/session'
import { loadFeature, saveFeature } from '../api/featureApi.js'
import { normalizeFeature, claimBounty, BOUNTY_TARGETS } from '../data/feature.js'

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

const bounty = computed(() => state.value.bounty || { tiers: {}, weight: 0, claimed: [] })

function progressOf(t) {
  if (t.tier) return Math.min(bounty.value.tiers[t.tier] || 0, t.need)
  return Math.min(bounty.value.weight || 0, t.need)
}
function pctOf(t) {
  return Math.round((progressOf(t) / t.need) * 100)
}
function isDone(t) {
  return progressOf(t) >= t.need
}
function isClaimed(t) {
  return (bounty.value.claimed || []).includes(t.id)
}

async function load() {
  loading.value = true
  try {
    const s = await loadFeature(username, true)
    if (s) state.value = s
  } catch (e) {
    showToast(e.message || '悬赏令加载失败')
  } finally {
    loading.value = false
  }
}

async function claim(t) {
  if (!isDone(t) || isClaimed(t) || busy.value) return
  busy.value = t.id
  try {
    const next = claimBounty(state.value, t.id)
    if (!next) { showToast('暂不可领取'); return }
    const res = await saveFeature(username, next)
    state.value = normalizeFeature((res && res.state) || next)
    if (res && res.shells != null) shells.value = res.shells
    showToast(`🎁 领取《${t.name}》赏赐 🪙${t.reward}`)
  } catch (e) {
    showToast(e.message || '领取失败')
  } finally {
    busy.value = ''
  }
}

onMounted(load)
</script>

<template>
  <div class="quests-page">
    <TopBar :shells="shells" />
    <div class="wrap">
      <header class="head">
        <div>
          <h1>📜 每日悬赏令</h1>
          <p>悬赏每日重置。钓起指定品级或凑足重量，即可领取金币赏赐。</p>
        </div>
        <div class="purse">🪙 {{ shells }}</div>
      </header>

      <div v-if="loading" class="loading">正在展开悬赏令…</div>
      <div v-else class="list">
        <div
          class="quest"
          v-for="t in BOUNTY_TARGETS"
          :key="t.id"
          :class="{ done: isDone(t), claimed: isClaimed(t) }"
        >
          <div class="q-ico"><GameIcon name="scroll" :size="24" /></div>
          <div class="q-body">
            <div class="q-top">
              <b>{{ t.name }}</b>
              <span class="reward">🪙 {{ t.reward }}</span>
            </div>
            <p>{{ t.desc }}</p>
            <div class="bar"><div class="fill" :style="{ width: pctOf(t) + '%' }"></div></div>
            <div class="num">进度 {{ progressOf(t) }} / {{ t.need }}</div>
          </div>
          <button
            class="q-btn"
            :class="{ ok: isDone(t) && !isClaimed(t) }"
            :disabled="!isDone(t) || isClaimed(t) || busy === t.id"
            @click="claim(t)"
          >
            {{ isClaimed(t) ? '已领取' : busy === t.id ? '领取中…' : isDone(t) ? '领赏' : '未完成' }}
          </button>
        </div>
      </div>
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.quests-page { min-height: 100vh; background: linear-gradient(160deg, #fff8ec, #f7f0ff); padding-bottom: 40px; }
.wrap { max-width: 760px; margin: 0 auto; padding: 20px 16px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 12px 0 24px; }
.head h1 { margin: 0 0 6px; font-size: 26px; color: #7a4b00; }
.head p { margin: 0; color: #a0825c; font-size: 13px; max-width: 620px; }
.purse { background: #fff; border: 2px solid #ffb300; border-radius: 20px; padding: 8px 16px; font-weight: bold; color: #a16a00; white-space: nowrap; }
.loading { text-align: center; color: #888; padding: 60px; }
.list { display: flex; flex-direction: column; gap: 12px; }
.quest { display: flex; gap: 12px; align-items: center; background: #fff; border: 2px solid #f0e2c8; border-radius: 14px; padding: 14px; }
.quest.done { border-color: #ffb300; }
.quest.claimed { opacity: .6; }
.q-ico { width: 44px; height: 44px; flex: 0 0 44px; display: grid; place-items: center; background: #fff3d6; border-radius: 12px; }
.q-body { flex: 1; min-width: 0; }
.q-top { display: flex; justify-content: space-between; }
.q-top b { color: #7a4b00; font-size: 15px; }
.reward { color: #e65100; font-weight: bold; font-size: 13px; }
.q-body p { margin: 4px 0 8px; font-size: 12px; color: #9a8a70; }
.bar { height: 7px; background: #f5ead6; border-radius: 4px; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, #ffd54f, #ffb300); }
.num { margin-top: 4px; font-size: 11px; color: #baa; text-align: right; }
.q-btn { padding: 9px 16px; border: none; border-radius: 9px; background: #e0d7c8; color: #888; font-weight: bold; cursor: pointer; white-space: nowrap; }
.q-btn.ok { background: linear-gradient(145deg, #ffb300, #ff8f00); color: #fff; }
.q-btn:disabled { cursor: default; }
</style>
