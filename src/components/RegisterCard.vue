<script setup>
import GameIcon from './GameIcon.vue'
import CaptchaImage from './CaptchaImage.vue'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerApi } from '../api/auth'
import { setSession } from '../store/session'

const emit = defineEmits(['toast'])
const router = useRouter()
const loading = ref(false)
const captchaInput = ref('')
const captchaRef = ref(null)

const form = reactive({
  username: '',
  password: '',
  confirm: '',
  agree: false
})

async function onSubmit() {
  if (!form.username.trim()) return emit('toast', '给自己起个道号吧')
  if (form.password.length < 6) return emit('toast', '护道法印至少 6 位，莫让邪修轻易破译')
  if (form.password !== form.confirm) return emit('toast', '两次法印不一，道童都替你记下了')
  if (!form.agree) return emit('toast', '需先立誓遵《仙门弟子戒律》')
  if (!captchaInput.value.trim()) return emit('toast', '请先填写仙符（验证码）')
  if (!captchaRef.value || !captchaRef.value.verify(captchaInput.value)) {
    emit('toast', '仙符不对，看仔细再填一次')
    captchaInput.value = ''
    return
  }

  loading.value = true
  try {
    const res = await registerApi({
      username: form.username.trim(),
      password: form.password,
      captchaOk: true
    })
    if (res.code === 200) {
      setSession(res.data)
      emit('toast', (res.message || '入道成功！') + ' 请前往「实名认证」完善仙籍')
      captchaInput.value = ''
      setTimeout(() => router.push('/home'), 1200)
    } else {
      emit('toast', res.message || '入道失败')
    }
  } catch (e) {
    emit('toast', e.message || '连不上仙门中枢，请确认后端已开启️')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card">
    <h1>叩仙门</h1>
    <p class="subtitle">道童引路：入道很简单，本座都会</p>

    <form @submit.prevent="onSubmit">
      <div class="field">
        <GameIcon class="icon" name="taiji" :size="20" />
        <input v-model="form.username" type="text" placeholder="道号（比如：凌霄子）" autocomplete="username">
      </div>
      <div class="field">
        <GameIcon class="icon" name="key" :size="20" />
        <input v-model="form.password" type="password" placeholder="护道法印（至少 6 位）" autocomplete="new-password">
      </div>
      <div class="field">
        <span class="icon"></span>
        <input v-model="form.confirm" type="password" placeholder="再塑一次法印" autocomplete="new-password">
      </div>

      <div class="field captcha-field">
        <span class="icon"></span>
        <input
          v-model="captchaInput"
          type="text"
          maxlength="6"
          placeholder="仙符（验证码）"
          autocomplete="off"
        >
        <CaptchaImage ref="captchaRef" class="captcha-img" />
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
  width: 400px;
  max-width: 92vw;
  background: linear-gradient(165deg, rgba(40, 30, 72, .52), rgba(18, 12, 38, .64));
  border: 1px solid rgba(179, 136, 255, .5);
  border-radius: 22px;
  padding: 40px 38px 34px;
  box-shadow:
    0 30px 80px rgba(0, 0, 0, .5),
    inset 0 0 0 1px rgba(240, 225, 255, .12),
    inset 0 1px 0 rgba(255, 255, 255, .08),
    0 0 40px rgba(150, 100, 230, .25);
  text-align: center;
  backdrop-filter: blur(16px) saturate(1.15);
  -webkit-backdrop-filter: blur(16px) saturate(1.15);
}

.card::before,
.card::after {
  content: '';
  position: absolute;
  left: 12%;
  right: 12%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200, 160, 255, .75), transparent);
}
.card::before { top: 12px; }
.card::after { bottom: 12px; }

h1 {
  color: #e8d4ff;
  font-size: 28px;
  letter-spacing: 6px;
  font-weight: 700;
  text-shadow: 0 2px 10px rgba(0, 0, 0, .6), 0 0 22px rgba(179, 136, 255, .4);
  margin: 4px 0 6px;
}

.subtitle {
  color: rgba(220, 214, 255, .8);
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
  border: 1px solid rgba(179, 136, 255, .32);
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  background: rgba(10, 8, 30, .55);
  color: #f3ecff;
  transition: border-color .25s, box-shadow .25s, background .25s;
}
.field input::placeholder { color: rgba(205, 195, 235, .45); }
.field input:focus {
  border-color: rgba(200, 160, 255, .85);
  background: rgba(14, 10, 36, .8);
  box-shadow: 0 0 0 3px rgba(179, 136, 255, .15), 0 0 18px rgba(179, 136, 255, .14);
}
.field .icon {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 17px;
  opacity: .9;
}

.captcha-field input { padding-right: 128px; }
.captcha-img {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.options {
  display: flex;
  justify-content: center;
  font-size: 13px;
  color: rgba(226, 216, 255, .9);
  margin: 6px 2px 22px;
}
.options label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.options input[type="checkbox"] { accent-color: #b388ff; width: 15px; height: 15px; }

.btn {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(235, 215, 255, .6);
  border-radius: 12px;
  font-size: 17px;
  font-weight: bold;
  letter-spacing: 8px;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(180deg, #c9a6ff, #9b6fe0 60%, #7e57c2);
  box-shadow: 0 6px 20px rgba(155, 111, 224, .32), inset 0 1px 0 rgba(255, 255, 255, .35);
  transition: transform .12s, box-shadow .12s, filter .12s;
}
.btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.06);
  box-shadow: 0 10px 26px rgba(155, 111, 224, .45), inset 0 1px 0 rgba(255, 255, 255, .35);
}
.btn:active { transform: translateY(1px); box-shadow: 0 3px 12px rgba(155, 111, 224, .3); }
.btn:disabled { opacity: .65; cursor: wait; }

.signup {
  margin-top: 20px;
  font-size: 13px;
  color: rgba(220, 214, 255, .72);
}
.signup a {
  color: #d9bcff;
  font-weight: bold;
  text-decoration: none;
}
.signup a:hover { text-decoration: underline; }

@media (max-width: 420px) {
  .card { padding: 30px 24px 26px; }
  h1 { font-size: 23px; }
}
</style>
