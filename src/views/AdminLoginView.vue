<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminLogin } from '../api/localEngine.js'
import { setAdminSession, getAdminSession } from '../admin/store.js'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

onMounted(() => {
  // 已是管理员则直接进后台
  if (getAdminSession()) router.replace('/admin/home')
})

async function submit() {
  if (!username.value.trim() || !password.value) {
    error.value = '请输入账号和密码'
    return
  }
  loading.value = true
  error.value = ''
  // 模拟一点网络延迟，体验更自然
  setTimeout(() => {
    const res = adminLogin({ username: username.value, password: password.value })
    loading.value = false
    if (res.code === 200) {
      setAdminSession(res.data)
      router.push('/admin/home')
    } else {
      error.value = res.message
    }
  }, 200)
}
</script>

<template>
  <div class="admin-login">
    <div class="card">
      <div class="badge">🛠</div>
      <h1>后台管理系统</h1>
      <p class="sub">比奇堡钓鱼 · 数据管理后台</p>

      <form @submit.prevent="submit">
        <label>管理员账号</label>
        <input v-model="username" type="text" placeholder="请输入管理员账号" autocomplete="username" />

        <label>密码</label>
        <input v-model="password" type="password" placeholder="请输入密码" autocomplete="current-password" />

        <p v-if="error" class="err">{{ error }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? '登录中…' : '登 录' }}
        </button>
      </form>

      <p class="hint">本页面仅提供登录功能，不开放注册。仅「管理员权限」账号可登录。</p>
    </div>
  </div>
</template>

<style scoped>
.admin-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(1100px 600px at 50% -10%, #1b6fb0 0%, rgba(27, 111, 176, 0) 60%),
    linear-gradient(160deg, #04203c 0%, #072c4f 45%, #04131f 100%);
}
.card {
  width: min(380px, 100%);
  background: rgba(255, 255, 255, 0.96);
  border-radius: 22px;
  padding: 32px 28px 26px;
  text-align: center;
  box-shadow: 0 26px 60px rgba(0, 0, 0, 0.5), inset 0 0 0 4px #ffd54f;
  color: #263238;
}
.badge {
  width: 64px;
  height: 64px;
  margin: 0 auto 10px;
  border-radius: 18px;
  background: linear-gradient(160deg, #ffd54f, #ffb300);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  box-shadow: 0 8px 18px rgba(255, 179, 0, 0.4);
}
h1 {
  font-size: 24px;
  margin: 6px 0 2px;
  color: #0d3b66;
}
.sub {
  font-size: 13px;
  color: #607d8b;
  margin-bottom: 22px;
}
form {
  display: flex;
  flex-direction: column;
  text-align: left;
  gap: 6px;
}
label {
  font-size: 13px;
  font-weight: bold;
  color: #37474f;
  margin-top: 8px;
}
input {
  padding: 11px 14px;
  border: 1.5px solid #cfd8dc;
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
input:focus {
  border-color: #29b6f6;
  box-shadow: 0 0 0 3px rgba(41, 182, 246, 0.18);
}
.err {
  color: #d32f2f;
  font-size: 13px;
  font-weight: bold;
  margin: 6px 0 0;
}
button {
  margin-top: 18px;
  padding: 13px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 4px;
  color: #4e2600;
  cursor: pointer;
  background: linear-gradient(180deg, #ffe14d, #ffb300);
  box-shadow: 0 5px 0 #c17900;
  transition: transform 0.1s, box-shadow 0.1s;
}
button:hover:not(:disabled) {
  transform: translateY(-1px);
}
button:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #c17900;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.hint {
  margin-top: 16px;
  font-size: 12px;
  color: #90a4ae;
}
</style>
