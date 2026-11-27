<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import GameIcon from '../components/GameIcon.vue'
import { getSession } from '../store/session'
import { meApi, leaderboardOverviewApi, leaderboardBoardApi } from '../api/game.js'

const session = getSession()
const username = session ? session.username : ''
const shells = ref(0)
const boards = ref({})
const board = ref(null)
const myRank = ref(null)
const myScore = ref(0)
const type = ref('achievement')
const loading = ref(true)
const toastVisible = ref(false)
const toastMessage = ref('')
let timer = null

const TYPES = [
  { key: 'achievement', name: '综合榜', icon: 'medals' },
  { key: 'wealth', name: '财富榜', icon: 'coin' },
  { key: 'weight', name: '巨物榜', icon: 'hook' },
  { key: 'codex', name: '图鉴榜', icon: 'book' },
  { key: 'signin', name: '勤修榜', icon: 'gift' }
]

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { toastVisible.value = false }, 2600)
}

const rows = computed(() => (board.value && board.value.rows) || [])
const boardLabel = computed(() => (board.value && board.value.label) || '榜单')

function valueText(v) {
  return Number(v || 0).toLocaleString('zh-CN')
}

async function loadBoard(t) {
  loading.value = true
  try {
    const res = await leaderboardBoardApi(t, 100)
    if (res && res.code === 200 && res.data) board.value = res.data
  } catch (e) {
    showToast(e.message || '榜单加载失败')
  } finally {
    loading.value = false
  }
}

function switchType(t) {
  type.value = t
  loadBoard(t)
}

async function load() {
  try {
    const me = await meApi(username)
    if (me && me.code === 200) shells.value = me.data.shells || 0
  } catch (e) { /* 忽略 */ }
  try {
    const res = await leaderboardOverviewApi(username)
    if (res && res.code === 200 && res.data) {
      boards.value = res.data
      myRank.value = res.data.myRank
      myScore.value = res.data.myScore || 0
    }
  } catch (e) { /* 忽略 */ }
  loadBoard(type.value)
}

onMounted(load)
</script>

<template>
  <div class="lb-page">
    <TopBar :shells="shells" />
    <div class="wrap">
      <header class="head">
        <h1><GameIcon name="trophy" :size="22" /> 仙钓天榜</h1>
        <p>各路钓修同台论道，测一测你在仙钓大陆的名次。</p>
      </header>

      <div class="my-rank" v-if="myRank">
        <span>我的名次</span>
        <b>第 {{ myRank }} 名</b>
        <span>综合积分 {{ valueText(myScore) }}</span>
      </div>

      <div class="tabs">
        <button
          v-for="t in TYPES"
          :key="t.key"
          :class="{ active: type === t.key }"
          @click="switchType(t.key)"
        >
          <GameIcon :name="t.icon" :size="15" /> {{ t.name }}
        </button>
      </div>

      <div class="panel">
        <div class="panel-head">
          <b>{{ boardLabel }}</b>
          <span v-if="board && board.totalUsers != null">共 {{ board.totalUsers }} 位钓修</span>
        </div>
        <div v-if="loading" class="loading">榜单加载中…</div>
        <div v-else-if="!rows.length" class="loading">暂无榜单数据</div>
        <div v-else>
          <div
            class="row"
            v-for="r in rows"
            :key="r.username"
            :class="{ me: r.username === username, top: r.rank <= 3 }"
          >
            <span class="rk" :class="'r' + r.rank">{{ r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : r.rank }}</span>
            <span class="nm">{{ r.username }}<em v-if="r.username === username">（我）</em></span>
            <span class="vl">{{ valueText(r.value) }}</span>
          </div>
        </div>
      </div>
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.lb-page { min-height: 100vh; background: linear-gradient(180deg, rgba(7,15,30,.52), rgba(5,11,24,.74)), url('../assets/login_bg.jpg') center center / cover fixed no-repeat; padding-bottom: 40px; }
.wrap { max-width: 760px; margin: 0 auto; padding: 20px 16px; }
.head { text-align: center; margin: 12px 0 20px; }
.head h1 { margin: 0 0 6px; font-size: 26px; color: #8a4b00; }
.head p { margin: 0; color: #a0825c; font-size: 13px; }
.my-rank { display: flex; justify-content: center; gap: 18px; align-items: center; background: #fff; border: 2px solid #ffb300; border-radius: 14px; padding: 12px; margin-bottom: 16px; font-size: 14px; color: #8a4b00; }
.my-rank b { font-size: 19px; color: #e65100; }
.tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; }
.tabs button { flex: 0 0 auto; display: flex; align-items: center; gap: 5px; padding: 8px 14px; border: 2px solid #ffd28a; background: #fff; border-radius: 20px; cursor: pointer; font-size: 13px; color: #8a4b00; }
.tabs button.active { background: #ffb300; color: #fff; border-color: #ff8f00; }
.panel { background: #fff; border: 2px solid #ffe0a8; border-radius: 16px; overflow: hidden; }
.panel-head { display: flex; justify-content: space-between; padding: 12px 16px; background: #fff6e0; color: #8a4b00; font-size: 14px; }
.loading { text-align: center; color: #aaa; padding: 40px; }
.row { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-top: 1px solid #f5ead6; font-size: 14px; }
.row.me { background: #fff8e1; }
.row .rk { width: 34px; text-align: center; font-weight: bold; color: #9b7a4a; }
.row .rk.r1, .row .rk.r2, .row .rk.r3 { font-size: 18px; }
.row .nm { flex: 1; color: #5d4a30; }
.row .nm em { color: #e65100; font-style: normal; font-size: 12px; }
.row .vl { color: #c62828; font-weight: bold; }
</style>
