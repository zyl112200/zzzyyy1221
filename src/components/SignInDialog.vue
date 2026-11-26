<script setup>
import { ref, computed, onMounted } from 'vue'
import { getSession } from '../store/session'
import { signInInfoApi, signInApi } from '../api/game.js'

const emit = defineEmits(['signed', 'toast'])

const open = ref(false)
const loading = ref(false)
const signing = ref(false)
const info = ref({
  signed: false,
  todaySigned: false,
  streak: 0,
  total: 0,
  rewardShells: 0,
  weekRewards: [100, 150, 200, 250, 300, 350, 850],
  shells: 0
})

const session = getSession()
const username = computed(() => (session && session.username) || '')

async function load() {
  if (!username.value) return
  loading.value = true
  try {
    const res = await signInInfoApi(username.value)
    if (res && res.code === 200 && res.data) info.value = { ...info.value, ...res.data }
  } catch (e) {
    emit('toast', e.message || '签到信息暂时无法获取')
  } finally {
    loading.value = false
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) load()
}

async function doSign() {
  if (signing.value || info.value.todaySigned) return
  signing.value = true
  try {
    const res = await signInApi(username.value)
    if (res && res.code === 200 && res.data) {
      info.value = { ...info.value, ...res.data }
      if (res.data.shells != null) emit('signed', res.data.shells)
      emit('toast', res.data.message || `签到成功，获得 ${res.data.rewardShells} 金币`)
    } else {
      emit('toast', (res && res.message) || '签到失败')
    }
  } catch (e) {
    emit('toast', e.message || '签到失败，请稍后再试')
  } finally {
    signing.value = false
    load()
  }
}

onMounted(load)
</script>

<template>
  <div class="signin-root">
    <!-- 右下角悬浮礼物按钮 -->
    <button
      class="signin-fab"
      :class="{ done: info.todaySigned }"
      @click="toggle"
      :title="info.todaySigned ? '今日已签到' : '每日签到领金币'"
    >
      <span class="gift">🎁</span>
      <span v-if="!info.todaySigned" class="dot"></span>
    </button>

    <!-- 签到面板 -->
    <transition name="pop">
      <div class="signin-panel" v-if="open">
        <div class="si-head">
          <div>
            <b>📜 每日签到</b>
            <span class="si-sub">连签越长，赏赐越厚</span>
          </div>
          <button class="si-close" @click="open = false" aria-label="关闭">×</button>
        </div>

        <div class="si-streak">
          <span>已连签 <b>{{ info.streak }}</b> 日</span>
          <span>累计 <b>{{ info.total }}</b> 日</span>
        </div>

        <div class="si-week">
          <div
            class="si-day"
            v-for="(reward, i) in info.weekRewards"
            :key="i"
            :class="{ today: i === (info.streak - 1) % 7, got: i < info.streak % 7, milestone: i === 6 }"
          >
            <span class="d">第{{ i + 1 }}天</span>
            <span class="r">🪙{{ reward }}</span>
            <span v-if="i === 6" class="m">里程碑</span>
          </div>
        </div>

        <button
          class="si-btn"
          :class="{ disabled: info.todaySigned }"
          :disabled="info.todaySigned || signing || loading"
          @click="doSign"
        >
          {{ info.todaySigned ? '今日已签 · 明日再来' : signing ? '签到中…' : '立即签到' }}
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.signin-root { position: fixed; right: 18px; bottom: 92px; z-index: 60; }
.signin-fab {
  width: 50px; height: 50px; border-radius: 50%; border: 2px solid #ffd54f;
  background: linear-gradient(145deg, #fff3c4, #ffcc80); cursor: pointer;
  font-size: 24px; position: relative; box-shadow: 0 6px 16px rgba(0,0,0,.3);
  transition: transform .15s;
}
.signin-fab:hover { transform: translateY(-3px); }
.signin-fab.done { filter: grayscale(.4); opacity: .75; }
.signin-fab .gift { line-height: 1; }
.signin-fab .dot {
  position: absolute; top: 2px; right: 2px; width: 12px; height: 12px;
  background: #e53935; border-radius: 50%; border: 2px solid #fff;
  animation: blink 1.2s infinite;
}
@keyframes blink { 50% { transform: scale(.7); opacity: .6; } }

.signin-panel {
  position: absolute; right: 0; bottom: 62px; width: 320px; max-width: calc(100vw - 36px);
  background: linear-gradient(180deg, #fffdf5, #fff3d6);
  border: 3px solid #ffb300; border-radius: 18px; padding: 16px;
  box-shadow: 0 16px 40px rgba(0,0,0,.4); color: #5d3a00;
}
.si-head { display: flex; justify-content: space-between; align-items: flex-start; }
.si-head b { font-size: 17px; }
.si-sub { display: block; font-size: 12px; color: #a17a2e; margin-top: 2px; }
.si-close { border: none; background: transparent; font-size: 22px; cursor: pointer; color: #a17a2e; line-height: 1; }
.si-streak {
  display: flex; justify-content: space-around; margin: 12px 0;
  font-size: 13px; background: #ffe9a8; border-radius: 10px; padding: 8px;
}
.si-streak b { font-size: 16px; color: #c62828; }
.si-week { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.si-day {
  background: #fff; border: 1px solid #ffd28a; border-radius: 9px;
  padding: 7px 3px; text-align: center; font-size: 11px; position: relative;
}
.si-day .d { display: block; color: #a17a2e; }
.si-day .r { display: block; font-weight: bold; color: #e65100; margin-top: 2px; }
.si-day .m { display: block; font-size: 9px; color: #c62828; }
.si-day.today { border-color: #ff7043; box-shadow: 0 0 0 2px #ffab91; }
.si-day.got { opacity: .55; }
.si-day.milestone { background: #fff3e0; }
.si-btn {
  width: 100%; margin-top: 14px; padding: 11px; border: none; border-radius: 11px;
  background: linear-gradient(145deg, #ffb300, #ff8f00); color: #fff;
  font-size: 15px; font-weight: bold; cursor: pointer;
}
.si-btn.disabled { background: #d7ccc8; cursor: default; }
.pop-enter-active, .pop-leave-active { transition: opacity .2s, transform .2s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(10px); }
</style>
