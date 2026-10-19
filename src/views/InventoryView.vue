<script setup>
import { ref, computed, onMounted } from 'vue'
import OceanBackground from '../components/OceanBackground.vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { getSession } from '../store/session'
import { meApi, equipApi } from '../api/game'

const session = getSession()
const username = session ? session.username : ''

const profile = ref({
  username, shells: 0, goldStones: 0, strength: 10,
  equippedRodName: '无', equippedLineName: '无', lineStrength: 0, maxCatchWeight: 0,
  totalBait: 0, inventory: []
})
const equipping = ref(null)
const toastVisible = ref(false)
const toastMessage = ref('')
let timer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { toastVisible.value = false }, 2600)
}

const rods = computed(() => profile.value.inventory.filter((i) => i.type === 'ROD'))
const lines = computed(() => profile.value.inventory.filter((i) => i.type === 'LINE'))
const baits = computed(() => profile.value.inventory.filter((i) => i.type === 'BAIT'))
const luck = computed(() => profile.value.inventory.filter((i) => i.type === 'LUCK'))

function fmtWeight(w) {
  if (!w) return '—'
  return w >= 10000 ? (w / 10000).toFixed(1) + ' 万斤' : w + ' 斤'
}

async function load() {
  try {
    const res = await meApi(username)
    if (res.code === 200) profile.value = res.data
    else showToast(res.message || '加载失败')
  } catch (e) { showToast(e.message || '后端未启动 🌊') }
}

async function equip(item) {
  if (item.equipped) return
  equipping.value = item.userItemId
  try {
    const res = await equipApi(username, item.userItemId)
    if (res.code === 200) {
      profile.value = res.data
      showToast('已装备 ' + item.name + ' 🎣')
    } else showToast(res.message || '装备失败')
  } catch (e) { showToast(e.message || '后端开小差了 🌊') }
  finally { equipping.value = null }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <TopBar :shells="profile.shells" :gold-stones="profile.goldStones" :strength="profile.strength" />
    <OceanBackground />

    <main class="inv">
      <h2 class="title">🎒 我的背包</h2>
      <p class="sub">装备更强的钓竿与鱼线，去征服百万斤的巨物</p>

      <div class="summary">
        <div class="sm"><span class="sm-ico">💪</span><b>{{ profile.strength }}</b><small>力量</small></div>
        <div class="sm"><span class="sm-ico">🪙</span><b>{{ profile.goldStones }}</b><small>金石</small></div>
        <div class="sm"><span class="sm-ico">🧵</span><b>{{ fmtWeight(profile.lineStrength) }}</b><small>鱼线承重</small></div>
        <div class="sm"><span class="sm-ico">🎯</span><b>{{ fmtWeight(profile.maxCatchWeight) }}</b><small>最大可钓</small></div>
      </div>

      <section>
        <h3>🎣 钓竿</h3>
        <div class="row" v-if="rods.length">
          <div class="item" v-for="rod in rods" :key="rod.userItemId" :class="{ on: rod.equipped }">
            <div class="ico">{{ rod.icon }}</div>
            <div class="meta">
              <div class="nm">{{ rod.name }} <span class="lvl">钓力 {{ rod.power }}</span></div>
              <div class="specs">
                <span v-if="rod.lineStrength">🧵 承重 {{ fmtWeight(rod.lineStrength) }}</span>
                <span v-if="rod.maxCatchWeight">🎯 可钓 {{ fmtWeight(rod.maxCatchWeight) }}</span>
              </div>
              <div class="q">×{{ rod.quantity }}</div>
            </div>
            <button class="equip" :class="{ active: rod.equipped }" @click="equip(rod)" :disabled="rod.equipped || equipping === rod.userItemId">
              {{ rod.equipped ? '已装备' : (equipping === rod.userItemId ? '装备中…' : '装备') }}
            </button>
          </div>
        </div>
        <p class="empty" v-else>还没有钓竿，去商店看看吧 🛒</p>
      </section>

      <section v-if="lines.length">
        <h3>🧵 鱼线工具</h3>
        <div class="row">
          <div class="item line" v-for="l in lines" :key="l.userItemId" :class="{ on: l.equipped }">
            <div class="ico">{{ l.icon }}</div>
            <div class="meta">
              <div class="nm">{{ l.name }}</div>
              <div class="specs">
                <span v-if="l.lineStrength">🧵 承重 {{ fmtWeight(l.lineStrength) }}</span>
                <span v-if="l.maxCatchWeight">🎯 可钓 {{ fmtWeight(l.maxCatchWeight) }}</span>
              </div>
              <div class="q">×{{ l.quantity }}</div>
            </div>
            <button class="equip" :class="{ active: l.equipped }" @click="equip(l)" :disabled="l.equipped || equipping === l.userItemId">
              {{ l.equipped ? '已装备' : (equipping === l.userItemId ? '装备中…' : '装备') }}
            </button>
          </div>
        </div>
      </section>

      <section>
        <h3>🪱 鱼饵（共 {{ profile.totalBait }} 个）</h3>
        <div class="row" v-if="baits.length">
          <div class="item" v-for="b in baits" :key="b.userItemId">
            <div class="ico">{{ b.icon }}</div>
            <div class="meta">
              <div class="nm">{{ b.name }}</div>
              <div class="q">×{{ b.quantity }}</div>
            </div>
            <span class="tag">{{ b.power > 0 ? '高级' : '普通' }}</span>
          </div>
        </div>
        <p class="empty" v-else>没有鱼饵了，抛竿需要鱼饵哦 🪱</p>
      </section>

      <section v-if="luck.length">
        <h3>🍀 幸运物</h3>
        <div class="row">
          <div class="item" v-for="l in luck" :key="l.userItemId">
            <div class="ico">{{ l.icon }}</div>
            <div class="meta">
              <div class="nm">{{ l.name }}</div>
              <div class="q">×{{ l.quantity }}（已生效）</div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.inv {
  position: relative;
  z-index: 10;
  max-width: 760px;
  margin: 28px auto 60px;
  padding: 26px 24px 30px;
  background: rgba(255, 255, 255, 0.93);
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(1, 40, 80, .38), inset 0 0 0 4px #ffd54f;
}
.title {
  color: #f9a825;
  font-size: 26px;
  letter-spacing: 2px;
  text-shadow: 2px 2px 0 #0277bd, 4px 4px 0 rgba(2, 119, 189, .2);
  text-align: center;
}
.sub { color: #0288d1; font-size: 13px; text-align: center; margin-bottom: 16px; }

.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 22px;
}
.sm {
  background: linear-gradient(180deg, #e3f2fd, #bbdefb);
  border-radius: 14px; padding: 10px 6px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.sm-ico { font-size: 18px; }
.sm b { font-size: 15px; color: #0d47a1; }
.sm small { font-size: 11px; color: #546e7a; }

section { margin-bottom: 22px; }
section h3 { color: #0277bd; font-size: 17px; margin-bottom: 10px; }
.row { display: flex; flex-direction: column; gap: 10px; }
.item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #e3f2fd;
}
.item.line { background: #fff3e0; }
.item.on { background: #fff8e1; box-shadow: inset 0 0 0 2px #ffb300; }
.ico { font-size: 38px; }
.meta { flex: 1; }
.nm { font-weight: bold; color: #37474f; font-size: 15px; }
.lvl { font-size: 12px; color: #7e57c2; margin-left: 6px; font-weight: bold; }
.specs { display: flex; flex-wrap: wrap; gap: 6px; margin: 3px 0; }
.specs span { font-size: 11px; font-weight: bold; color: #0277bd; background: #e1f5fe; padding: 1px 7px; border-radius: 7px; }
.item.line .specs span { color: #bf360c; background: #ffccbc; }
.q { font-size: 12px; color: #607d8b; }
.tag { background: #7e57c2; color: #fff; padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.equip {
  border: none;
  border-radius: 12px;
  padding: 9px 16px;
  font-weight: bold;
  cursor: pointer;
  color: #4e2600;
  background: linear-gradient(180deg, #ffe14d, #ffb300);
  box-shadow: 0 4px 0 #c17900;
}
.equip.active { background: #cfd8dc; color: #607d8b; box-shadow: none; cursor: default; }
.equip:disabled:not(.active) { opacity: .6; }
.empty { color: #90a4ae; font-size: 14px; }

@media (max-width: 560px) {
  .summary { grid-template-columns: repeat(2, 1fr); }
}
</style>
