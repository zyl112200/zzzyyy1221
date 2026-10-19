<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PatrickStar from './PatrickStar.vue'
import { registerApi } from '../api/auth'
import { setSession } from '../store/session'

const emit = defineEmits(['toast'])
const router = useRouter()
const loading = ref(false)

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirm: '',
  agree: false
})

async function onSubmit() {
  if (!form.username.trim()) return emit('toast', '给自己起个海底名字吧～ 🍍')
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return emit('toast', '邮箱格式不对，小蜗都看出来了 🐌')
  if (form.password.length < 6) return emit('toast', '密码至少 6 位，不然痞老板一下就猜到了 🦠')
  if (form.password !== form.confirm) return emit('toast', '两次密码不一样，派大星都记住了你呢 ⭐')
  if (!form.agree) return emit('toast', '要先同意《蟹堡王员工守则》哦 🍔')

  loading.value = true
  try {
    const res = await registerApi({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password
    })
    if (res.code === 200) {
      setSession(res.data)
      emit('toast', res.message || '注册成功！派大星欢迎你加入比奇堡 🎉')
      setTimeout(() => router.push('/home'), 1200)
    } else {
      emit('toast', res.message || '注册失败')
    }
  } catch (e) {
    emit('toast', e.message || '连不上蟹堡王服务器，请确认后端已启动 🌊')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card">
    <PatrickStar />

    <h1>加入比奇堡</h1>
    <p class="subtitle">派大星：注册很简单，我都会！⭐</p>

    <form @submit.prevent="onSubmit">
      <div class="field">
        <span class="icon">🍍</span>
        <input v-model="form.username" type="text" placeholder="用户名（比如：派大星）" autocomplete="username">
      </div>
      <div class="field">
        <span class="icon">📮</span>
        <input v-model="form.email" type="email" placeholder="邮箱（海螺信号接收用）" autocomplete="email">
      </div>
      <div class="field">
        <span class="icon">🦀</span>
        <input v-model="form.password" type="password" placeholder="密码（至少 6 位）" autocomplete="new-password">
      </div>
      <div class="field">
        <span class="icon">🐚</span>
        <input v-model="form.confirm" type="password" placeholder="再输一次密码" autocomplete="new-password">
      </div>

      <div class="options">
        <label><input v-model="form.agree" type="checkbox"> 同意《蟹堡王员工守则》</label>
      </div>

      <button type="submit" class="btn" :disabled="loading">{{ loading ? '下潜中…' : '注册！' }}</button>
    </form>

    <p class="signup">已有账号？<router-link to="/">回菠萝屋登录</router-link></p>
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
  padding: 140px 36px 36px;
  box-shadow: 0 24px 60px rgba(1, 40, 80, .45), inset 0 0 0 4px #ff8fa3;
  text-align: center;
  backdrop-filter: blur(4px);
}

h1 {
  color: #f76c88;
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

.field { position: relative; margin-bottom: 16px; text-align: left; }
.field input {
  width: 100%;
  padding: 13px 14px 13px 44px;
  border: 3px solid #ffd0da;
  border-radius: 14px;
  font-size: 15px;
  outline: none;
  background: #fff5f7;
  color: #4e342e;
  transition: border-color .25s, box-shadow .25s;
}
.field input:focus {
  border-color: #ff8fa3;
  box-shadow: 0 0 0 4px rgba(255, 143, 163, .2);
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
  justify-content: center;
  font-size: 13px;
  color: #0277bd;
  margin-bottom: 20px;
}
.options label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.options input[type="checkbox"] { accent-color: #f76c88; width: 15px; height: 15px; }

.btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  font-weight: bold;
  letter-spacing: 4px;
  color: #5c1020;
  cursor: pointer;
  background: linear-gradient(180deg, #ffb3c1, #f76c88);
  box-shadow: 0 6px 0 #c94a66, 0 10px 18px rgba(1, 40, 80, .3);
  transition: transform .12s, box-shadow .12s;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 8px 0 #c94a66, 0 14px 22px rgba(1, 40, 80, .35); }
.btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #c94a66, 0 6px 10px rgba(1, 40, 80, .3); }

.signup { margin-top: 18px; font-size: 13px; color: #0277bd; }
.signup a { color: #f76c88; font-weight: bold; text-decoration: none; }
.signup a:hover { text-decoration: underline; }

@media (max-width: 420px) {
  .card { padding: 130px 22px 28px; }
  h1 { font-size: 22px; }
}
</style>
