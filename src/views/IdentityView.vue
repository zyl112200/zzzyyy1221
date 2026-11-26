<script setup>
/**
 * 实名认证 / 防沉迷中心
 * - 提交姓名 + 身份证（仅本地校验位算法 + 脱敏存储，不落盘完整号码）
 * - 人脸核身（浏览器本地活体检测演示，抓帧不上传）
 * - 展示防沉迷状态：成年/未成年、宵禁时段、当日时长
 */
import { ref, computed, onMounted } from 'vue'
import GameIcon from '../components/GameIcon.vue'
import FaceVerifyDialog from '../components/FaceVerifyDialog.vue'
import TopBar from '../components/TopBar.vue'
import {
  buildRealnameRecord, normalizeRealname, validateIdCard,
  ANTI_ADDICTION, remainingMinutes, isWeekend, localDateKey
} from '../data/identity.js'
import {
  loadRealname, saveRealname, loadPlayState, savePlayState
} from '../api/identityApi.js'

const emit = defineEmits(['toast'])

const realname = ref(normalizeRealname(null))
const playState = ref({ date: localDateKey(), minutes: 0 })
const form = ref({ name: '', idCard: '' })
const faceOpen = ref(false)
const loading = ref(false)

const adult = computed(() => realname.value.verified && realname.value.adult)
const isMinor = computed(() => realname.value.verified && !realname.value.adult)
const remaining = computed(() => remainingMinutes(realname.value, playState.value))
const todayLabel = computed(() => isWeekend() ? '节假日' : '工作日')
const dailyLimit = computed(() => isWeekend() ? ANTI_ADDICTION.minorHolidayMinutes : ANTI_ADDICTION.minorDailyMinutes)

onMounted(async () => {
  try {
    realname.value = normalizeRealname(await loadRealname())
    playState.value = await loadPlayState()
  } catch { /* 读取失败不影响展示 */ }
})

async function submit() {
  const name = String(form.value.name || '').trim()
  const id = String(form.value.idCard || '').trim()
  const built = buildRealnameRecord(name, id)
  if (!built.ok) return emit('toast', built.reason)
  loading.value = true
  try {
    await saveRealname(built.data)
    realname.value = built.data
    emit('toast', built.data.adult ? '实名认证成功，已确认为成年道友' : '实名认证成功，将为你开启防沉迷守护')
    form.value = { name: '', idCard: '' }
  } catch (e) {
    emit('toast', e.message || '实名信息保存失败')
  } finally {
    loading.value = false
  }
}

function onFaceVerified(payload) {
  faceOpen.value = false
  const next = normalizeRealname({
    ...realname.value,
    faceVerified: payload.faceVerified,
    verified: true,
    adult: realname.value.adult || payload.adult
  })
  saveRealname(next).then(() => {
    realname.value = next
    emit('toast', payload.skipped ? '已以实名信息继续（人脸核验未通过）' : '仙镜核身通过')
  })
}

function reset() {
  if (!window.confirm('确定要清除本机实名信息吗？防沉迷设置将重置。')) return
  saveRealname(normalizeRealname(null)).then(() => {
    realname.value = normalizeRealname(null)
    emit('toast', '已清除本机实名信息')
  })
}

/** 实时校验身份证输入（仅提示，不上传） */
const idHint = computed(() => {
  const v = String(form.value.idCard || '').trim()
  if (!v) return ''
  return validateIdCard(v).valid ? '✓ 号码格式与校验位正确' : ''
})
</script>

<template>
  <div class="identity-page">
    <TopBar @toast="(m) => emit('toast', m)" />
    <section class="wrap">
      <header class="page-head">
        <h1>实名认证 · 防沉迷</h1>
        <p>护佑道友身心，修行有度，方得长生</p>
      </header>

      <!-- 状态卡 -->
      <div class="card status-card">
        <div class="status-row">
          <div class="badge" :class="adult ? 'adult' : isMinor ? 'minor' : 'none'">
            <GameIcon :name="adult ? 'star' : 'scroll'" :size="20" />
            {{ adult ? '成年道友' : isMinor ? '未成年道友 · 防沉迷中' : '未实名' }}
          </div>
          <span v-if="realname.verified" class="verified-at">{{ new Date(realname.verifiedAt).toLocaleDateString() }} 认证</span>
        </div>

        <template v-if="realname.verified">
          <div class="info-grid">
            <div class="info"><label>姓名</label><b>{{ realname.nameMasked }}</b></div>
            <div class="info"><label>证件</label><b>{{ realname.idMasked }}</b></div>
            <div class="info"><label>年龄</label><b>{{ realname.age }} 周岁</b></div>
            <div class="info"><label>人脸核身</label><b :class="realname.faceVerified ? 'yes' : 'no'">{{ realname.faceVerified ? '已通过' : '未进行' }}</b></div>
          </div>

          <div v-if="isMinor" class="anti-box">
            <h3><GameIcon name="taiji" :size="16" /> 防沉迷守护规则</h3>
            <ul>
              <li>宵禁时段：<b>{{ ANTI_ADDICTION.minorNightStart }}:00 - 次日 {{ ANTI_ADDICTION.minorNightEnd }}:00</b> 不可登录</li>
              <li>今日（{{ todayLabel }}）时长上限：<b>{{ dailyLimit }} 分钟</b></li>
              <li>当日已修行：<b>{{ playState.minutes }} 分钟</b>，剩余 <b>{{ remaining }} 分钟</b></li>
            </ul>
          </div>
        </template>
      </div>

      <!-- 认证表单 -->
      <div v-if="!realname.verified" class="card form-card">
        <h2>登记仙籍</h2>
        <p class="tip">仅需填写一次，信息仅在本机做格式校验并脱敏保存</p>
        <div class="field">
          <GameIcon class="icon" name="taiji" :size="18" />
          <input v-model="form.name" type="text" placeholder="真实姓名" autocomplete="name">
        </div>
        <div class="field">
          <GameIcon class="icon" name="key" :size="18" />
          <input v-model="form.idCard" type="text" maxlength="18" placeholder="18 位身份证号" autocomplete="off">
        </div>
        <p v-if="idHint" class="hint ok">{{ idHint }}</p>
        <button class="btn" :disabled="loading" @click="submit">{{ loading ? '校验中…' : '完成实名认证' }}</button>
      </div>

      <!-- 人脸核身 -->
      <div v-else class="card face-card">
        <h2>仙镜核身</h2>
        <p class="tip">可选 · 通过眨眼与张嘴动作确认道友本人（本地演示）</p>
        <button class="btn" @click="faceOpen = true">
          <GameIcon name="star" :size="16" /> {{ realname.faceVerified ? '重新核身' : '开始人脸核身' }}
        </button>
        <button class="btn ghost" @click="reset">清除本机实名信息</button>
      </div>

      <div class="disclaimer">
        <GameIcon name="scroll" :size="14" />
        <span>合规说明：本项目为个人开源演示，实名仅做格式与校验位校验、不接入公安权威核验；人脸画面在本机处理、不上传、不存储，不能作为真实身份凭证。</span>
      </div>
    </section>

    <FaceVerifyDialog
      :open="faceOpen"
      :adult="adult"
      @close="faceOpen = false"
      @verified="onFaceVerified"
    />
  </div>
</template>

<style scoped>
.identity-page { min-height: 100vh; background: linear-gradient(160deg, #12102c, #0a0818); color: #f3ecff; }
.wrap { max-width: 680px; margin: 0 auto; padding: 24px 18px 60px; }
.page-head { text-align: center; margin-bottom: 22px; }
.page-head h1 { color: #f6e2a8; font-size: 26px; letter-spacing: 4px; margin: 0 0 6px; }
.page-head p { color: rgba(214,224,255,.7); font-size: 13px; margin: 0; }
.card {
  background: linear-gradient(165deg, rgba(30,26,60,.7), rgba(14,12,34,.8));
  border: 1px solid rgba(212,175,55,.4); border-radius: 18px;
  padding: 22px 24px; margin-bottom: 18px;
  box-shadow: 0 12px 36px rgba(0,0,0,.35);
}
.status-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px;
  border-radius: 20px; font-size: 14px; font-weight: bold;
}
.badge.adult { background: rgba(212,175,55,.22); color: #f6e2a8; }
.badge.minor { background: rgba(179,136,255,.22); color: #d9bcff; }
.badge.none { background: rgba(255,255,255,.08); color: rgba(214,224,255,.7); }
.verified-at { font-size: 12px; color: rgba(214,224,255,.6); }
.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.info { background: rgba(8,8,24,.5); border-radius: 10px; padding: 10px 12px; }
.info label { display: block; font-size: 11px; color: rgba(214,224,255,.55); margin-bottom: 4px; }
.info b { font-size: 15px; }
.info b.yes { color: #9dffc4; }
.info b.no { color: #ffb0b0; }
.anti-box { margin-top: 16px; border: 1px solid rgba(179,136,255,.35); border-radius: 12px; padding: 12px 16px; background: rgba(179,136,255,.07); }
.anti-box h3 { display: flex; align-items: center; gap: 6px; color: #d9bcff; font-size: 14px; margin: 0 0 8px; }
.anti-box ul { margin: 0; padding-left: 18px; font-size: 13px; color: rgba(230,225,255,.85); line-height: 1.9; }
.form-card h2, .face-card h2 { color: #f6e2a8; font-size: 18px; margin: 0 0 4px; }
.tip { color: rgba(214,224,255,.6); font-size: 12px; margin: 0 0 16px; }
.field { position: relative; margin-bottom: 14px; }
.field input {
  width: 100%; padding: 12px 12px 12px 42px; border-radius: 10px;
  border: 1px solid rgba(212,175,55,.32); background: rgba(8,8,24,.6);
  color: #f3ecff; font-size: 15px; outline: none;
}
.field input:focus { border-color: rgba(212,175,55,.85); }
.field .icon { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); opacity: .9; }
.hint { font-size: 12px; margin: -6px 0 10px; }
.hint.ok { color: #9dffc4; }
.btn {
  width: 100%; padding: 12px; border-radius: 10px; cursor: pointer; font-weight: bold; font-size: 15px;
  border: 1px solid rgba(255,236,170,.6); background: linear-gradient(180deg,#f6dfa0,#d4af37);
  color: #2a1e08; margin-top: 6px;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.btn.ghost { background: rgba(255,255,255,.06); color: #e8cf88; border-color: rgba(212,175,55,.4); margin-top: 10px; }
.btn:disabled { opacity: .6; cursor: wait; }
.disclaimer {
  display: flex; gap: 8px; align-items: flex-start; padding: 12px 14px;
  border-radius: 10px; background: rgba(255,255,255,.04);
  font-size: 11px; line-height: 1.6; color: rgba(214,224,255,.55);
}
@media (max-width: 420px) { .info-grid { grid-template-columns: 1fr; } }
</style>
