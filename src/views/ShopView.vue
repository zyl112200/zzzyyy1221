<script setup>
import { ref, reactive, onMounted } from 'vue'
import OceanBackground from '../components/OceanBackground.vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { getSession } from '../store/session'
import { meApi, shopItemsApi, buyApi } from '../api/game'

const session = getSession()
const username = session ? session.username : ''

const shells = ref(0)
const goldStones = ref(0)
const strength = ref(10)
const items = ref([])
const qty = reactive({})
const buying = ref(null)
const toastVisible = ref(false)
const toastMessage = ref('')
let timer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { toastVisible.value = false }, 2600)
}

function typeLabel(t) {
  return { ROD: '钓竿', BAIT: '鱼饵', LUCK: '幸运物', LINE: '鱼线工具' }[t] || '道具'
}
function canQty(t) {
  return t !== 'LUCK'
}
function fmtWeight(w) {
  if (!w) return '—'
  return w >= 10000 ? (w / 10000).toFixed(0) + ' 万斤' : w + ' 斤'
}

async function load() {
  try {
    const m = await meApi(username)
    if (m.code === 200) {
      shells.value = m.data.shells
      goldStones.value = m.data.goldStones
      strength.value = m.data.strength
    }
  } catch (e) { showToast(e.message || '后端未启动 🌊') }
  try {
    const s = await shopItemsApi()
    if (s.code === 200) {
      items.value = s.data
      s.data.forEach((it) => { if (qty[it.id] == null) qty[it.id] = 1 })
    }
  } catch (e) { showToast(e.message || '后端未启动 🌊') }
}

async function buy(item) {
  const n = qty[item.id] || 1
  if (shells.value < item.price * n) {
    showToast('贝壳不够啦，先去钓鱼 🐚')
    return
  }
  buying.value = item.id
  try {
    const res = await buyApi(username, item.id, n)
    if (res.code === 200) {
      shells.value = res.data.shells
      goldStones.value = res.data.goldStones
      strength.value = res.data.strength
      showToast('购买成功 🎉')
    } else {
      showToast(res.message || '购买失败')
    }
  } catch (e) {
    showToast(e.message || '后端开小差了 🌊')
  } finally {
    buying.value = null
  }
}

function dec(item) { if ((qty[item.id] || 1) > 1) qty[item.id]-- }
function inc(item) { qty[item.id] = (qty[item.id] || 1) + 1 }

onMounted(load)
</script>

<template>
  <div class="page">
    <TopBar :shells="shells" :gold-stones="goldStones" :strength="strength" />
    <OceanBackground />

    <main class="shop">
      <h2 class="title">🛒 比奇堡渔具商店</h2>
      <p class="sub">贝壳买装备，金石升力量 · 承重决定你能拉上多大的鱼</p>

      <div class="grid">
        <div class="card" v-for="item in items" :key="item.id" :class="'type-' + item.type.toLowerCase()">
          <div class="icon">{{ item.icon }}</div>
          <div class="name">{{ item.name }}</div>
          <span class="tag">{{ typeLabel(item.type) }}</span>
          <p class="desc">{{ item.description }}</p>

          <div class="specs" v-if="item.lineStrength || item.maxCatchWeight">
            <span v-if="item.lineStrength" class="spec">🧵 承重 {{ fmtWeight(item.lineStrength) }}</span>
            <span v-if="item.maxCatchWeight" class="spec">🎯 可钓 {{ fmtWeight(item.maxCatchWeight) }}</span>
          </div>
          <div class="specs" v-else-if="item.power">
            <span class="spec">{{ item.type === 'LUCK' ? '🍀 幸运 +' : '💪 钓力 ' }}{{ item.type === 'LUCK' ? (item.power * 4) + '%' : item.power }}</span>
          </div>

          <div class="price">🐚 {{ item.price }}</div>

          <div class="qty" v-if="canQty(item.type)">
            <button @click="dec(item)">−</button>
            <span>{{ qty[item.id] || 1 }}</span>
            <button @click="inc(item)">＋</button>
          </div>

          <button
            class="buy"
            @click="buy(item)"
            :disabled="buying === item.id || shells < item.price * (qty[item.id] || 1)"
          >
            {{ buying === item.id ? '兑换中…' : '购买' }}
          </button>
          <div class="lack" v-if="shells < item.price * (qty[item.id] || 1)">贝壳不足 🐚</div>
        </div>
      </div>
    </main>

    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.shop {
  position: relative;
  z-index: 10;
  max-width: 1000px;
  margin: 28px auto 60px;
  padding: 26px 24px 30px;
}
.title {
  color: #f9a825;
  font-size: 26px;
  letter-spacing: 2px;
  text-shadow: 2px 2px 0 #0277bd, 4px 4px 0 rgba(2, 119, 189, .2);
  text-align: center;
}
.sub { color: #e3f4ff; font-size: 14px; text-align: center; margin-bottom: 22px; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 16px;
}
.card {
  background: rgba(255, 255, 255, 0.94);
  border-radius: 20px;
  padding: 18px 16px;
  text-align: center;
  box-shadow: 0 14px 30px rgba(1, 40, 80, .35), inset 0 0 0 3px #ffe082;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.card.type-rod { box-shadow: 0 14px 30px rgba(1,40,80,.35), inset 0 0 0 3px #b39ddb; }
.card.type-luck { box-shadow: 0 14px 30px rgba(1,40,80,.35), inset 0 0 0 3px #ffd54f; }
.card.type-line { box-shadow: 0 14px 30px rgba(1,40,80,.35), inset 0 0 0 3px #ff7043; background: linear-gradient(180deg, #fff, #fff3e0); }
.card.type-line .name { color: #bf360c; }
.icon { font-size: 46px; }
.name { font-size: 17px; font-weight: bold; color: #37474f; }
.tag {
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  background: #4fc3f7;
  padding: 2px 10px;
  border-radius: 10px;
}
.type-rod .tag { background: #7e57c2; }
.type-luck .tag { background: #f9a825; }
.type-line .tag { background: #e64a19; }
.desc { font-size: 12px; color: #607d8b; min-height: 34px; line-height: 1.5; }

.specs { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; min-height: 20px; }
.spec {
  font-size: 11px; font-weight: bold; color: #0277bd;
  background: #e1f5fe; padding: 2px 8px; border-radius: 8px;
}
.type-line .spec { color: #bf360c; background: #ffccbc; }
.type-rod .spec { color: #4527a0; background: #ede7f6; }

.price { font-size: 20px; font-weight: bold; color: #ef6c00; }

.qty {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
}
.qty button {
  width: 30px; height: 30px;
  border: none; border-radius: 8px;
  background: #ffe082; color: #4e342e;
  font-size: 18px; font-weight: bold; cursor: pointer;
}
.qty span { font-weight: bold; color: #37474f; min-width: 20px; }

.buy {
  margin-top: 6px;
  width: 100%;
  padding: 11px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 2px;
  color: #4e2600;
  cursor: pointer;
  background: linear-gradient(180deg, #ffe14d, #ffb300);
  box-shadow: 0 5px 0 #c17900;
  transition: transform .1s, box-shadow .1s;
}
.type-line .buy { background: linear-gradient(180deg, #ffab91, #ff7043); color: #fff; box-shadow: 0 5px 0 #bf360c; }
.buy:hover:not(:disabled) { transform: translateY(-2px); }
.buy:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 2px 0 #c17900; }
.buy:disabled { opacity: .55; cursor: not-allowed; }
.lack { font-size: 12px; color: #e53935; margin-top: 2px; }
</style>
