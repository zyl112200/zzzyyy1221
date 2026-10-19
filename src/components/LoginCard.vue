<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SpongeBob from './SpongeBob.vue'
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
    emit('toast', '请输入用户名哦～ 🍍')
    return
  }
  if (!password.value.trim()) {
    emit('toast', '密码不能是空的，海绵宝宝会伤心的 😢')
    return
  }
  loading.value = true
  try {
    const res = await loginApi({ username: username.value.trim(), password: password.value })
    if (res.code === 200) {
      setSession(res.data)
      emit('toast', res.message || ('欢迎回到比奇堡，' + username.value.trim() + '！🎉'))
      setTimeout(() => router.push('/home'), 700)
    } else {
      emit('toast', res.message || '登录失败')
    }
  } catch (e) {
    emit('toast', e.message || '连不上蟹堡王服务器，请确认后端已启动 🌊')
  } finally {
    loading.value = false
  }
}

function forgot() {
  emit('toast', '秘方被痞老板偷走了？快打给蟹老板！🦀')
}
</script>

<template>
  <div class="card">
    <SpongeBob />

    <h1>比奇堡登录</h1>
    <p class="subtitle">我准备好了！我准备好了！⭐</p>

    <form @submit.prevent="onSubmit">
      <div class="field">
        <span class="icon">🍍</span>
        <input
          v-model="username"
          type="text"
          placeholder="用户名（比如：海绵宝宝）"
          autocomplete="username"
        >
      </div>
      <div class="field">
        <span class="icon">🦀</span>
        <input
          v-model="password"
          type="password"
          placeholder="密码（蟹黄堡秘方）"
          autocomplete="current-password"
        >
      </div>

      <div class="options">
        <label><input v-model="remember" type="checkbox"> 记住我</label>
        <a href="#" @click.prevent="forgot">忘记密码？</a>
      </div>

      <button type="submit" class="btn" :disabled="loading">{{ loading ? '下潜中…' : '出发！' }}</button>
    </form>

    <p class="signup">还没有账号？<router-link to="/register">找章鱼哥注册</router-link></p>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  z-index: 5;
  width: 380px;
  max-width: 92vw;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 28px;
  padding: 150px 36px 36px;
  box-shadow: 0 24px 60px rgba(1, 40, 80, .45), inset 0 0 0 4px #ffd54f;
  text-align: center;
  backdrop-filter: blur(4px);
}

h1 {
  color: #f9a825;
  font-size: 26px;
  letter-spacing: 2px;
  text-shadow: 2px 2px 0 #0277bd, 4px 4px 0 rgba(2, 119, 189, .25);
  margin-bottom: 4px;
}

.subtitle {
  color: #0288d1;
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
  border: 3px solid #ffe082;
  border-radius: 14px;
  font-size: 15px;
  outline: none;
  background: #fffde7;
  color: #4e342e;
  transition: border-color .25s, box-shadow .25s;
}
.field input:focus {
  border-color: #ffb300;
  box-shadow: 0 0 0 4px rgba(255, 179, 0, .2);
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
  color: #0277bd;
  margin-bottom: 20px;
}
.options label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.options input[type="checkbox"] {
  accent-color: #ffb300;
  width: 15px;
  height: 15px;
}
.options a {
  color: #0277bd;
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
  letter-spacing: 4px;
  color: #4e2600;
  cursor: pointer;
  background: linear-gradient(180deg, #ffe14d, #ffb300);
  box-shadow: 0 6px 0 #c17900, 0 10px 18px rgba(1, 40, 80, .3);
  transition: transform .12s, box-shadow .12s;
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 0 #c17900, 0 14px 22px rgba(1, 40, 80, .35);
}
.btn:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #c17900, 0 6px 10px rgba(1, 40, 80, .3);
}

.signup {
  margin-top: 18px;
  font-size: 13px;
  color: #0277bd;
}
.signup a {
  color: #f9a825;
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
