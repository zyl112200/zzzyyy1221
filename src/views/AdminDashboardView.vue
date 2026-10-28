<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAdminConfig,
  saveAdminConfig,
  resetAdminConfig,
  getAdminSession,
  clearAdminSession,
  TIER_LABELS,
  TIER_ORDER_LIST
} from '../admin/store.js'
import { changeUserPassword } from '../api/localEngine.js'

const router = useRouter()
const admin = getAdminSession()
const adminName = admin ? admin.username : ''

const form = reactive({
  dropRates: {},
  currency: { shellMultiplier: 1, goldMultiplier: 1, starterShells: 50, starterGold: 0 }
})
const toast = ref('')
const toastVisible = ref(false)
let timer = null

// 修改密码
const showPwd = ref(false)
const pwdOld = ref('')
const pwdNew = ref('')
const pwdMsg = ref('')

function showToast(msg) {
  toast.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (toastVisible.value = false), 2600)
}

function loadConfig() {
  const res = getAdminConfig()
  if (res.code === 200) {
    const c = res.data
    TIER_ORDER_LIST.forEach((k) => (form.dropRates[k] = c.dropRates[k]))
    Object.assign(form.currency, c.currency)
  }
}

onMounted(loadConfig)

function save() {
  const res = saveAdminConfig(JSON.parse(JSON.stringify(form)))
  if (res.code === 200) {
    showToast(res.message)
    // 回填经过清洗的值
    TIER_ORDER_LIST.forEach((k) => (form.dropRates[k] = res.data.dropRates[k]))
    Object.assign(form.currency, res.data.currency)
  } else {
    showToast(res.message || '保存失败')
  }
}

function reset() {
  const res = resetAdminConfig()
  if (res.code === 200) {
    const c = res.data
    TIER_ORDER_LIST.forEach((k) => (form.dropRates[k] = c.dropRates[k]))
    Object.assign(form.currency, c.currency)
    showToast(res.message)
  }
}

function logout() {
  clearAdminSession()
  router.push('/admin')
}

function submitPwd() {
  const res = changeUserPassword({ username: adminName, oldPassword: pwdOld.value, newPassword: pwdNew.value })
  pwdMsg.value = res.message
  if (res.code === 200) {
    clearAdminSession()
    setTimeout(() => router.push('/admin'), 800)
  }
}

// 爆率总权重（用于展示各品级占比）
function computedTotal() {
  return TIER_ORDER_LIST.reduce((s, k) => s + (Number(form.dropRates[k]) || 0), 0)
}
function pct(k) {
  const t = computedTotal()
  if (!t) return '0%'
  return ((Number(form.dropRates[k]) || 0) / t * 100).toFixed(1) + '%'
}
</script>

<template>
  <div class="admin">
    <header class="topbar">
      <div class="brand">🛠️ 后台管理系统</div>
      <div class="right">
        <span class="who">👤 {{ adminName }}</span>
        <button class="logout" @click="logout">退出登录</button>
      </div>
    </header>

    <main class="content">
      <section class="panel">
        <h2>🎯 爆率管理</h2>
        <p class="desc">设置各品级鱼类的<b>相对权重</b>，数值越大越容易钓到。改动保存后，首页游戏的出货概率立即生效。</p>
        <div class="rate-list">
          <div class="rate-item" v-for="k in TIER_ORDER_LIST" :key="k">
            <div class="ri-head">
              <span class="ri-name" :class="'tier-' + k.toLowerCase()">{{ TIER_LABELS[k] }}</span>
              <span class="ri-pct">{{ pct(k) }}</span>
            </div>
            <input type="number" min="0" step="1" v-model.number="form.dropRates[k]" />
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>💰 货币数量管理</h2>
        <p class="desc">调整钓鱼产出的<b>贝壳 / 金石倍率</b>，以及<b>新玩家初始货币</b>。保存后即时生效。</p>
        <div class="cur-grid">
          <div class="cur-item">
            <label>贝壳奖励倍率</label>
            <input type="number" min="0" step="0.1" v-model.number="form.currency.shellMultiplier" />
            <span class="unit">×</span>
          </div>
          <div class="cur-item">
            <label>金石奖励倍率</label>
            <input type="number" min="0" step="0.1" v-model.number="form.currency.goldMultiplier" />
            <span class="unit">×</span>
          </div>
          <div class="cur-item">
            <label>新玩家初始贝壳 🐚</label>
            <input type="number" min="0" step="1" v-model.number="form.currency.starterShells" />
          </div>
          <div class="cur-item">
            <label>新玩家初始金石 🪙</label>
            <input type="number" min="0" step="1" v-model.number="form.currency.starterGold" />
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>🔐 管理员密码</h2>
        <p class="desc">修改当前管理员账号（用户表）的登录密码，明文存储，至少 6 位。修改后需重新登录。</p>
        <div class="pwd-row">
          <input type="password" v-model="pwdOld" placeholder="原密码" />
          <input type="password" v-model="pwdNew" placeholder="新密码（≥6 位）" />
          <button class="pwd-btn" @click="submitPwd">修改</button>
        </div>
        <p v-if="pwdMsg" class="pwd-msg">{{ pwdMsg }}</p>
      </section>

      <div class="actions">
        <button class="save" @click="save">💾 保存配置</button>
        <button class="reset" @click="reset">↺ 恢复默认</button>
        <router-link class="tohome" to="/home">前往首页查看效果 →</router-link>
      </div>
    </main>

    <div class="toast" v-if="toastVisible">{{ toast }}</div>
  </div>
</template>

<style scoped>
.admin {
  min-height: 100vh;
  background: linear-gradient(160deg, #04203c 0%, #072c4f 45%, #04131f 100%);
  color: #eaf6ff;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 22px;
  background: rgba(2, 30, 56, 0.9);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
}
.brand {
  font-weight: bold;
  font-size: 18px;
  color: #ffd54f;
  letter-spacing: 1px;
}
.right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.who {
  color: #cdeffd;
  font-size: 14px;
}
.logout {
  background: #ff6b6b;
  border: none;
  color: #fff;
  padding: 6px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
}
.logout:hover {
  background: #ff5252;
}
.content {
  max-width: 920px;
  margin: 0 auto;
  padding: 26px 18px 60px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.panel {
  background: rgba(255, 255, 255, 0.97);
  color: #263238;
  border-radius: 18px;
  padding: 20px 22px;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.35);
}
.panel h2 {
  font-size: 19px;
  margin: 0 0 6px;
  color: #0d3b66;
}
.desc {
  font-size: 13px;
  color: #607d8b;
  margin: 0 0 16px;
  line-height: 1.6;
}
.desc b {
  color: #ff8f00;
}

/* 爆率 */
.rate-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.rate-item {
  background: #f3f8fc;
  border: 1px solid #e1edf5;
  border-radius: 14px;
  padding: 12px;
}
.ri-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.ri-name {
  font-weight: bold;
  font-size: 14px;
  padding: 2px 10px;
  border-radius: 9px;
  color: #fff;
}
.tier-common { background: #546e7a; }
.tier-rare { background: #5e35b1; }
.tier-legendary { background: #f9a825; color: #3e2723; }
.tier-mythic { background: #e64a19; }
.tier-shanhai { background: #b71c1c; box-shadow: 0 0 10px rgba(255, 80, 60, 0.5); }
.ri-pct {
  font-size: 13px;
  font-weight: bold;
  color: #1565c0;
}
.rate-item input {
  width: 100%;
  padding: 8px 10px;
  border: 1.5px solid #cfd8dc;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
}
.rate-item input:focus {
  border-color: #29b6f6;
}

/* 货币 */
.cur-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}
.cur-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cur-item label {
  font-size: 13px;
  font-weight: bold;
  color: #37474f;
}
.cur-item input {
  padding: 10px 12px;
  border: 1.5px solid #cfd8dc;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
}
.cur-item input:focus {
  border-color: #29b6f6;
}
.unit {
  font-size: 12px;
  color: #90a4ae;
}

/* 密码 */
.pwd-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.pwd-row input {
  flex: 1;
  min-width: 160px;
  padding: 10px 12px;
  border: 1.5px solid #cfd8dc;
  border-radius: 10px;
  font-size: 15px;
  outline: none;
}
.pwd-btn {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  font-weight: bold;
  color: #043a2a;
  background: linear-gradient(180deg, #a5d6a7, #66bb6a);
  cursor: pointer;
}
.pwd-msg {
  margin-top: 8px;
  font-size: 13px;
  font-weight: bold;
  color: #1565c0;
}

/* 操作 */
.actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}
.save {
  padding: 13px 30px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
  color: #4e2600;
  background: linear-gradient(180deg, #ffe14d, #ffb300);
  box-shadow: 0 5px 0 #c17900;
  cursor: pointer;
}
.save:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #c17900;
}
.reset {
  padding: 13px 24px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: bold;
  color: #37474f;
  background: #eceff1;
  cursor: pointer;
}
.reset:hover {
  background: #e0e4e7;
}
.tohome {
  color: #ffd54f;
  text-decoration: none;
  font-weight: bold;
  font-size: 15px;
}
.tohome:hover {
  text-decoration: underline;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 40px;
  transform: translateX(-50%);
  background: rgba(2, 30, 56, 0.95);
  color: #fff;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: bold;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  z-index: 60;
}
</style>
