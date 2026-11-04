<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Cultivator from './Cultivator.vue'
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
  if (!form.username.trim()) return emit('toast', '给自己起个道号吧 🍃')
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return emit('toast', '仙讯邮箱格式不对，仙鹤都看出来了 🕊️')
  if (form.password.length < 6) return emit('toast', '护道法印至少 6 位，莫让邪修轻易破译 🗝️')
  if (form.password !== form.confirm) return emit('toast', '两次法印不一，道童都替你记下了 ⛰️')
  if (!form.agree) return emit('toast', '需先立誓遵《仙门弟子戒律》🌿')

  loading.value = true
  try {
    const res = await registerApi({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password
    })
    if (res.code === 200) {
      setSession(res.data)
      emit('toast', res.message || '入道成功！道童引你踏仙途 ✨')
      setTimeout(() => router.push('/home'), 1200)
    } else {
      emit('toast', res.message || '入道失败')
    }
  } catch (e) {
    emit('toast', e.message || '连不上仙门中枢，请确认后端已开启 🌫️')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card">
    <Cultivator variant="violet" />

    <h1>叩仙门</h1>
    <p class="subtitle">道童引路：入道很简单，本座都会 ⛰️</p>

    <form @submit.prevent="onSubmit">
      <div class="field">
        <span class="icon">☯</span>
        <input v-model="form.username" type="text" placeholder="道号（比如：凌霄子）" autocomplete="username">
      </div>
      <div class="field">
        <span class="icon">📮</span>
        <input v-model="form.email" type="email" placeholder="仙讯邮箱（用于找回法印）" autocomplete="email">
      </div>
      <div class="field">
        <span class="icon">🗝️</span>
        <input v-model="form.password" type="password" placeholder="护道法印（至少 6 位）" autocomplete="new-password">
      </div>
      <div class="field">
        <span class="icon">🪷</span>
        <input v-model="form.confirm" type="password" placeholder="再塑一次法印" autocomplete="new-password">
      </div>

      <div class="options">
        <label><input v-model="form.agree" type="checkbox"> 立誓遵《仙门弟子戒律》</label>
      </div>

      <button type="submit" class="btn" :disabled="loading">{{ loading ? '凝神中…' : '入 道' }}</button>
    </form>

    <p class="signup">已入仙门？<router-link to="/">回仙门登录</router-link></p>
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
  padding: 140px 36px 36px;
  box-shadow: 0 24px 60px rgba(30, 12, 60, .5), inset 0 0 0 4px #b388ff;
  text-align: center;
  backdrop-filter: blur(4px);
}

h1 {
  color: #7e57c2;
  font-size: 26px;
  letter-spacing: 3px;
  text-shadow: 2px 2px 0 #e1d5ff, 4px 4px 0 rgba(126, 87, 194, .18);
  margin-bottom: 4px;
}
.subtitle {
  color: #2e9b78;
  font-size: 13px;
  margin-bottom: 24px;
}

.field { position: relative; margin-bottom: 16px; text-align: left; }
.field input {
  width: 100%;
  padding: 13px 14px 13px 44px;
  border: 3px solid #e1d5ff;
  border-radius: 14px;
  font-size: 15px;
  outline: none;
  background: #f7f3ff;
  color: #2e2a4a;
  transition: border-color .25s, box-shadow .25s;
}
.field input:focus {
  border-color: #7e57c2;
  box-shadow: 0 0 0 4px rgba(126, 87, 194, .2);
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
  color: #7e57c2;
  margin-bottom: 20px;
}
.options label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.options input[type="checkbox"] { accent-color: #7e57c2; width: 15px; height: 15px; }

.btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 16px;
  font-size: 17px;
  font-weight: bold;
  letter-spacing: 6px;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(180deg, #b388ff, #7e57c2);
  box-shadow: 0 6px 0 #5e3fa0, 0 10px 18px rgba(30, 12, 60, .3);
  transition: transform .12s, box-shadow .12s;
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 8px 0 #5e3fa0, 0 14px 22px rgba(30, 12, 60, .35); }
.btn:active { transform: translateY(3px); box-shadow: 0 2px 0 #5e3fa0, 0 6px 10px rgba(30, 12, 60, .3); }

.signup { margin-top: 18px; font-size: 13px; color: #7e57c2; }
.signup a { color: #6a3fb0; font-weight: bold; text-decoration: none; }
.signup a:hover { text-decoration: underline; }

@media (max-width: 420px) {
  .card { padding: 130px 22px 28px; }
  h1 { font-size: 22px; }
}
</style>
