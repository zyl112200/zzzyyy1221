<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
  width: 400px;
  max-width: 92vw;
  background: linear-gradient(165deg, rgba(30, 26, 60, .52), rgba(14, 12, 34, .64));
  border: 1px solid rgba(212, 175, 55, .5);
  border-radius: 22px;
  padding: 40px 38px 34px;
  box-shadow:
    0 30px 80px rgba(0, 0, 0, .5),
    inset 0 0 0 1px rgba(255, 240, 190, .12),
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 0 40px rgba(120, 90, 200, .22);
  text-align: center;
  backdrop-filter: blur(16px) saturate(1.15);
  -webkit-backdrop-filter: blur(16px) saturate(1.15);
}

/* 顶部/底部鎏金装饰线 */
.card::before,
.card::after {
  content: '';
  position: absolute;
  left: 12%;
  right: 12%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212, 175, 55, .75), transparent);
}
.card::before { top: 12px; }
.card::after { bottom: 12px; }

h1 {
  color: #f6e2a8;
  font-size: 28px;
  letter-spacing: 6px;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(0, 0, 0, .6), 0 0 22px rgba(212, 175, 55, .35);
  margin: 4px 0 6px;
}

.subtitle {
  color: rgba(214, 224, 255, .78);
  font-size: 13px;
  letter-spacing: 1px;
  margin-bottom: 26px;
}

.field {
  position: relative;
  margin-bottom: 16px;
  text-align: left;
}
.field input {
  width: 100%;
  padding: 14px 14px 14px 46px;
  border: 1px solid rgba(212, 175, 55, .32);
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  background: rgba(8, 8, 24, .55);
  color: #f3ecff;
  transition: border-color .25s, box-shadow .25s, background .25s;
}
.field input::placeholder { color: rgba(200, 195, 230, .45); }
.field input:focus {
  border-color: rgba(212, 175, 55, .85);
  background: rgba(12, 10, 32, .8);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, .15), 0 0 18px rgba(212, 175, 55, .12);
}
.field .icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 17px;
  opacity: .9;
}

.options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: rgba(230, 220, 190, .9);
  margin: 6px 2px 22px;
}
.options label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.options input[type="checkbox"] {
  accent-color: #d4af37;
  width: 15px;
  height: 15px;
}
.options a {
  color: #e8cf88;
  text-decoration: none;
}
.options a:hover { text-decoration: underline; }

.btn {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(255, 236, 170, .6);
  border-radius: 12px;
  font-size: 17px;
  font-weight: bold;
  letter-spacing: 8px;
  color: #2a1e08;
  cursor: pointer;
  background: linear-gradient(180deg, #f6dfa0, #d4af37 60%, #b8912a);
  box-shadow: 0 6px 20px rgba(212, 175, 55, .28), inset 0 1px 0 rgba(255, 255, 255, .5);
  transition: transform .12s, box-shadow .12s, filter .12s;
}
.btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow: 0 10px 26px rgba(212, 175, 55, .4), inset 0 1px 0 rgba(255, 255, 255, .5);
}
.btn:active {
  transform: translateY(1px);
  box-shadow: 0 3px 12px rgba(212, 175, 55, .3);
}
.btn:disabled { opacity: .65; cursor: wait; }

.signup {
  margin-top: 20px;
  font-size: 13px;
  color: rgba(214, 224, 255, .72);
}
.signup a {
  color: #f0d68f;
  font-weight: bold;
  text-decoration: none;
}
.signup a:hover { text-decoration: underline; }

@media (max-width: 420px) {
  .card { padding: 30px 24px 26px; }
  h1 { font-size: 23px; }
}
</style>
