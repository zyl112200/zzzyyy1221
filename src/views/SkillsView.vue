<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import GameIcon from '../components/GameIcon.vue'
import { getSession } from '../store/session'
import { skillCatalogApi, cultivateApi, meApi } from '../api/game.js'
import { SKILLS, SKILL_MAP, SKILL_LEVEL_MAX, realmLabel, effectText, levelGoldCost } from '../data/skills.js'

const session = getSession()
const username = session ? session.username : ''
const shells = ref(0)
const owned = ref([])
const catalog = ref([])
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

const skillMap = computed(() => SKILL_MAP)
const isOwned = (id) => owned.value.includes(id)

async function load() {
  loading.value = true
  try {
    const [cat, me] = await Promise.all([
      skillCatalogApi(),
      meApi(username)
    ])
    if (cat && cat.code === 200 && Array.isArray(cat.data)) catalog.value = cat.data
    if (me && me.code === 200) {
      shells.value = me.data.shells || 0
      owned.value = Array.isArray(me.data.skills) ? me.data.skills : []
    }
  } catch (e) {
    showToast(e.message || '功法阁暂时无法连接')
  } finally {
    loading.value = false
  }
}

async function cultivate(def) {
  if (!def || isOwned(def.id) || busy.value) return
  const cost = def.cost != null ? def.cost : (levelGoldCost(def, 0) || 0)
  if (shells.value < cost) {
    showToast(`金币不足，修炼《${def.name}》需要 ${cost} 金币`)
    return
  }
  busy.value = def.id
  try {
    const res = await cultivateApi(username, def.id)
    if (res && res.code === 200) {
      if (res.data && res.data.shells != null) shells.value = res.data.shells
      if (res.data && Array.isArray(res.data.skills)) owned.value = res.data.skills
      else owned.value = [...owned.value, def.id]
      showToast(res.message || `📜 成功修炼《${def.name}》！`)
    } else {
      showToast((res && res.message) || '修炼失败')
    }
  } catch (e) {
    showToast(e.message || '修炼失败')
  } finally {
    busy.value = ''
  }
}

function effectOf(def) {
  return def ? effectText(def, 1) : ''
}

onMounted(load)
</script>

<template>
  <div class="skills-page">
    <TopBar :shells="shells" />
    <div class="wrap">
      <header class="head">
        <div>
          <h1>☯ 钓道功法阁</h1>
          <p>以金币参悟钓鱼功法，被动加成真实作用于搏鱼手感与收益，在线 / 离线皆生效。</p>
        </div>
        <div class="purse">🪙 {{ shells }}</div>
      </header>

      <div v-if="loading" class="loading">正在翻阅功法秘籍…</div>

      <div v-else class="grid">
        <div
          class="card"
          v-for="def in SKILLS"
          :key="def.id"
          :class="{ owned: isOwned(def.id) }"
        >
          <div class="card-top">
            <span class="ico"><GameIcon :name="def.icon || 'taiji'" :size="30" /></span>
            <div class="title">
              <b>{{ def.name }}</b>
              <span class="realm">{{ realmLabel(1) }} · 上限 {{ SKILL_LEVEL_MAX }} 级</span>
            </div>
            <span class="badge" :class="{ yes: isOwned(def.id) }">{{ isOwned(def.id) ? '已参悟' : '未参悟' }}</span>
          </div>
          <p class="desc">{{ def.desc }}</p>
          <div class="effect">✨ {{ effectOf(def) }}</div>
          <button
            class="btn"
            :class="{ owned: isOwned(def.id) }"
            :disabled="isOwned(def.id) || busy === def.id"
            @click="cultivate(def)"
          >
            {{ isOwned(def.id) ? '已参悟' : busy === def.id ? '参悟中…' : `参悟 · 🪙${def.cost}` }}
          </button>
        </div>
      </div>
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.skills-page { min-height: 100vh; background: linear-gradient(160deg, #eef5ff, #f7ecff); padding-bottom: 40px; }
.wrap { max-width: 1100px; margin: 0 auto; padding: 20px 16px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 12px 0 24px; }
.head h1 { margin: 0 0 6px; font-size: 26px; color: #4a2e7a; }
.head p { margin: 0; color: #7a6a92; font-size: 13px; max-width: 640px; }
.purse { background: #fff; border: 2px solid #ffb300; border-radius: 20px; padding: 8px 16px; font-weight: bold; color: #a16a00; white-space: nowrap; }
.loading { text-align: center; color: #888; padding: 60px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px; }
.card { background: #fff; border: 2px solid #e5d9f7; border-radius: 16px; padding: 16px; box-shadow: 0 6px 18px rgba(80,50,120,.08); transition: transform .15s; }
.card:hover { transform: translateY(-3px); }
.card.owned { border-color: #7e57c2; background: linear-gradient(180deg, #fff, #f3eaff); }
.card-top { display: flex; align-items: center; gap: 10px; }
.ico { width: 46px; height: 46px; display: grid; place-items: center; background: #f3eaff; border-radius: 12px; }
.title { flex: 1; }
.title b { display: block; font-size: 17px; color: #4a2e7a; }
.realm { font-size: 11px; color: #9b8aaa; }
.badge { font-size: 11px; padding: 3px 8px; border-radius: 10px; background: #eee; color: #888; }
.badge.yes { background: #ede7f6; color: #5e35b1; }
.desc { font-size: 12.5px; color: #6b5b7b; line-height: 1.6; min-height: 60px; }
.effect { font-size: 12.5px; color: #2e7d32; background: #e8f5e9; border-radius: 8px; padding: 7px 10px; margin-bottom: 12px; }
.btn { width: 100%; padding: 10px; border: none; border-radius: 10px; background: linear-gradient(145deg, #7e57c2, #5e35b1); color: #fff; font-weight: bold; cursor: pointer; }
.btn:disabled { background: #d7ccc8; cursor: default; }
</style>
