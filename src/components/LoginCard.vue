<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Cultivator from './Cultivator.vue'
import { loginApi } from '../api/auth'
import { setSession } from '../store/session'

const emit = defineEmits(['toast'])
const router = useRouter()

const username = ref('')
const password = ref('')
const remember = ref(true)
const loading = ref(false)

async function onSubmit() {
  if (!username.value.trim()) {
    emit('toast', '请先报上道号 🍃')
    return
  }
  if (!password.value.trim()) {
    emit('toast', '护道法印不可为空，仙尊会失望的 🌫️')
    return
  }
  loading.value = true
  try {
    const res = await loginApi({ username: username.value.trim(), password: password.value })
    if (res.code === 200) {
      setSession(res.data)
      emit('toast', res.message || ('欢迎回到仙钓大陆，' + username.value.trim() + '！✨'))
      setTimeout(() => router.push('/home'), 700)
    } else {
      emit('toast', res.message || '登录失败')
    }
  } catch (e) {
    emit('toast', e.message || '连不上仙门中枢，请确认后端已开启 🌫️')
  } finally {
    loading.value = false
  }
}

function forgot() {
  emit('toast', '忘却法印？速去寻仙盟执事重铸 🗝️')
}
</script>

<template>
  <div class="card">
    <Cultivator variant="jade" />

    <h1>仙门登录</h1>
    <p class="subtitle">道友请留步，入我仙钓大陆 ⛰️</p>

    <form @submit.prevent="onSubmit">
      <div class="field">
        <span class="icon">☯</span>
        <input
          v-model="username"
          type="text"
          placeholder="道号（比如：青云子）"
          autocomplete="username"
        >
      </div>
      <div class="field">
        <span class="icon">🗝️</span>
        <input
          v-model="password"
          type="password"
          placeholder="护道法印（密码）"
          autocomplete="current-password"
        >
      </div>

      <div class="options">
        <label><input v-model="remember" type="checkbox"> 铭记此身</label>
        <a href="#" @click.prevent="forgot">忘却法印？</a>
      </div>

      <button type="submit" class="btn" :disabled="loading">{{ loading ? '凝神中…' : '登 仙' }}</button>
    </form>

    <p class="signup">尚无仙缘？<router-link to="/register">叩仙门入道</router-link></p>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  z-index: 5;
  width: 380px;
  max-width: 92vw;
  background: rgba(255, 255, 255, 0.93);
  border-radius: 28px;
  padding: 150px 36px 36px;
  box-shadow: 0 24px 60px rgba(30, 12, 60, .5), inset 0 0 0 4px #7e57c2;
  text-align: center;
  backdrop-filter: blur(4px);
}

h1 {
  color: #6a3fb0;
  font-size: 26px;
  letter-spacing: 3px;
  text-shadow: 2px 2px 0 #d1c4e9, 4px 4px 0 rgba(106, 63, 176, .18);
  margin-bottom: 4px;
}

.subtitle {
  color: #2e9b78;
  font-size: 13px;
  margin-bottom: 24px;
}

.field {
  position: relative;
  margin-bottom: 16px;
  text-align: left;
}
.field input {
  width: 100%;
  padding: 13px 14px 13px 44px;
  border: 3px solid #c5e1d6;
  border-radius: 14px;
  font-size: 15px;
  outline: none;
  background: #f3fbf7;
  color: #2e4034;
  transition: border-color .25s, box-shadow .25s;
}
.field input:focus {
  border-color: #2e9b78;
  box-shadow: 0 0 0 4px rgba(46, 155, 120, .2);
}
.field .icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 17px;
}

.options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #6a3fb0;
  margin-bottom: 20px;
}
.options label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.options input[type="checkbox"] {
  accent-color: #7e57c2;
  width: 15px;
  height: 15px;
}
.options a {
  color: #2e9b78;
  text-decoration: none;
}
.options a:hover {
  text-decoration: underline;
}

.btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  font-weight: bold;
  letter-spacing: 6px;
  color: #06321f;
  cursor: pointer;
  background: linear-gradient(180deg, #6fe0b6, #2e9b78);
  box-shadow: 0 6px 0 #176b54, 0 10px 18px rgba(30, 12, 60, .3);
  transition: transform .12s, box-shadow .12s;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 0 #176b54, 0 14px 22px rgba(30, 12, 60, .35);
}
.btn:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #176b54, 0 6px 10px rgba(30, 12, 60, .3);
}

.signup {
  margin-top: 18px;
  font-size: 13px;
  color: #6a3fb0;
}
.signup a {
  color: #7e57c2;
  font-weight: bold;
  text-decoration: none;
}
.signup a:hover {
  text-decoration: underline;
}

@media (max-width: 420px) {
  .card { padding: 140px 22px 28px; }
  h1 { font-size: 22px; }
}
</style>
