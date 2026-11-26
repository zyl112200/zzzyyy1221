<script setup>
/**
 * 人脸核身弹窗（浏览器本地演示版）
 * ------------------------------------------------------------------
 * 开源依赖：face-api.js（MIT，justadudewhohacks），基于 TensorFlow.js。
 * 隐私说明：
 *   · 摄像头画面只在本机 canvas 内做人脸检测与关键点计算，
 *     绝不上传、不存储人脸图像或特征向量；
 *   · 仅把「是否通过」布尔结果写入本地存档；
 *   · 本组件是交互演示，不是公安权威人证核验，不能作为真实身份依据。
 *
 * 活体检测：依次要求「正视 → 眨眼 → 张嘴」，通过 68 点关键点的
 * 眼/嘴开合度变化判断，防止静态照片蒙混。
 */
import { ref, watch, onBeforeUnmount } from 'vue'
import GameIcon from './GameIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  adult: { type: Boolean, default: false }
})
const emit = defineEmits(['close', 'verified'])

const videoRef = ref(null)
const canvasRef = ref(null)
const status = ref('idle') // idle | loading | ready | detecting | success | error
const message = ref('准备仙镜…')
const steps = ref([
  { key: 'face', label: '正对仙镜', done: false },
  { key: 'blink', label: '眨眨眼', done: false },
  { key: 'mouth', label: '张张嘴', done: false }
])
const progress = ref(0)

let faceapi = null
let stream = null
let detectTimer = null
let blinkCount = 0
let mouthCount = 0
let lastBlink = false
let lastMouth = false
const EYE_OPEN = 0.28 // 眼睛纵横比阈值
const MOUTH_OPEN = 0.55 // 嘴部开合阈值

function eyeAspectRatio(landmarks) {
  // 左眼 points 36-41，右眼 42-47
  const lid = (pts) => {
    const d1 = Math.hypot(pts[1].x - pts[5].x, pts[1].y - pts[5].y)
    const d2 = Math.hypot(pts[2].x - pts[4].x, pts[2].y - pts[4].y)
    const w = Math.hypot(pts[0].x - pts[3].x, pts[0].y - pts[3].y)
    return w > 0 ? (d1 + d2) / (2 * w) : 1
  }
  const left = lid(landmarks.slice(36, 42))
  const right = lid(landmarks.slice(42, 48))
  return (left + right) / 2
}

function mouthAspectRatio(landmarks) {
  // 外唇 51,53,55,57 与 62,66
  const h = Math.hypot(landmarks[51].x - landmarks[57].x, landmarks[51].y - landmarks[57].y)
  const w = Math.hypot(landmarks[53].x - landmarks[59].x, landmarks[53].y - landmarks[59].y)
  return w > 0 ? h / w : 0
}

async function loadLibAndModel() {
  status.value = 'loading'
  message.value = '正在唤醒仙镜（加载本地人脸模型）…'
  try {
    // 动态 import：首屏不加载，点开核身才拉取，避免拖慢游戏
    faceapi = await import('face-api.js')
    const MODEL_URL = (import.meta.env.BASE_URL || '/') + 'models'
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
    status.value = 'ready'
    message.value = '仙镜已就绪，请正对镜头'
  } catch (e) {
    status.value = 'error'
    message.value = '仙镜模型加载失败：' + (e.message || e)
  }
}

async function startCamera() {
  status.value = 'loading'
  message.value = '正在开启摄像头…'
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
      audio: false
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }
    status.value = 'ready'
    message.value = '请正对仙镜，按提示完成动作'
    detectLoop()
  } catch (e) {
    status.value = 'error'
    message.value = '无法开启摄像头：' + (e.message || e) + '（请允许摄像头权限，或改用其他验证方式）'
  }
}

async function detectLoop() {
  if (!videoRef.value || !faceapi || status.value === 'success' || status.value === 'error') return
  const video = videoRef.value
  if (video.readyState < 2) {
    detectTimer = setTimeout(detectLoop, 100)
    return
  }
  try {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
      .withFaceLandmarks(true)

    const canvas = canvasRef.value
    if (canvas && video.videoWidth) {
      const ctx = canvas.getContext('2d')
      canvas.width = 320
      canvas.height = 240
      ctx.drawImage(video, 0, 0, 320, 240)
      if (detection) {
        // 绘制人脸框（仅本地可视反馈）
        const resized = faceapi.resizeResults(detection, { width: 320, height: 240 })
        ctx.strokeStyle = '#7CFC00'
        ctx.lineWidth = 2
        const box = resized.detection.box
        ctx.strokeRect(box.x, box.y, box.width, box.height)
      }
    }

    if (detection) {
      if (!steps.value[0].done) {
        steps.value[0].done = true
        progress.value = 33
        message.value = '已捕捉到仙颜，请眨眨眼'
      } else if (!steps.value[1].done) {
        const ear = eyeAspectRatio(detection.landmarks.positions)
        const closed = ear < EYE_OPEN
        if (closed && !lastBlink) blinkCount++
        lastBlink = closed
        if (blinkCount >= 2) {
          steps.value[1].done = true
          progress.value = 66
          message.value = '神识清明，请张张嘴'
        }
      } else if (!steps.value[2].done) {
        const mar = mouthAspectRatio(detection.landmarks.positions)
        const open = mar > MOUTH_OPEN
        if (open && !lastMouth) mouthCount++
        lastMouth = open
        if (mouthCount >= 2) {
          steps.value[2].done = true
          progress.value = 100
          finish()
          return
        }
      }
    } else {
      if (!steps.value[0].done) message.value = '未检测到仙颜，请正对镜头'
    }
  } catch (e) {
    // 单帧检测失败不影响整体流程
  }
  detectTimer = setTimeout(detectLoop, 150)
}

function finish() {
  status.value = 'success'
  message.value = '仙镜核验完成！'
  stopCamera()
  emit('verified', { faceVerified: true, adult: props.adult })
}

function stopCamera() {
  if (detectTimer) { clearTimeout(detectTimer); detectTimer = null }
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null }
  if (videoRef.value) videoRef.value.srcObject = null
}

function close() {
  stopCamera()
  emit('close')
}

/** 降级：无法开启摄像头时，允许以「实名信息」为准跳过人脸（演示用） */
function skip() {
  stopCamera()
  emit('verified', { faceVerified: false, adult: props.adult, skipped: true })
}

// 监听 open：弹窗打开时加载模型并开启摄像头（组件随父页面挂载，open 初始可能为 false）
watch(() => props.open, (open) => {
  if (open) {
    // 重置状态，允许重复核身
    blinkCount = 0
    mouthCount = 0
    lastBlink = false
    lastMouth = false
    progress.value = 0
    steps.value = steps.value.map((s) => ({ ...s, done: false }))
    loadLibAndModel().then(() => {
      if (status.value === 'ready') startCamera()
    })
  } else {
    stopCamera()
  }
})

onBeforeUnmount(stopCamera)
</script>

<template>
  <div v-if="open" class="overlay" @click.self="close">
    <div class="dialog">
      <button class="close-x" @click="close" aria-label="关闭">×</button>
      <h2>仙镜核身</h2>
      <p class="sub">活体检测 · 本地处理 · 画面不上传</p>

      <div class="stage">
        <video ref="videoRef" class="video" playsinline muted autoplay></video>
        <canvas ref="canvasRef" class="canvas"></canvas>
        <div v-if="status === 'loading'" class="mask">加载中…</div>
        <div v-if="status === 'success'" class="mask ok">核验通过</div>
      </div>

      <div class="steps">
        <div v-for="(s, i) in steps" :key="s.key" class="step" :class="{ done: s.done, active: !s.done && steps.filter(x => x.done).length === i }">
          <span class="dot">{{ s.done ? '✓' : i + 1 }}</span>
          <span>{{ s.label }}</span>
        </div>
      </div>

      <div class="progress"><div class="bar" :style="{ width: progress + '%' }"></div></div>
      <p class="msg" :class="{ err: status === 'error', ok: status === 'success' }">{{ message }}</p>

      <div class="notice">
        <GameIcon name="scroll" :size="14" /> 演示性质：本核验仅在本机进行，不是公安权威人证比对
      </div>

      <div class="actions">
        <button class="btn ghost" @click="skip">以实名信息继续</button>
        <button v-if="status === 'error'" class="btn" @click="startCamera">重试摄像头</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(6, 5, 18, .78); backdrop-filter: blur(6px);
}
.dialog {
  position: relative; width: 420px; max-width: 92vw;
  background: linear-gradient(165deg, rgba(30,26,60,.97), rgba(14,12,34,.98));
  border: 1px solid rgba(212,175,55,.6); border-radius: 20px;
  padding: 26px 28px 24px; text-align: center; color: #f3ecff;
  box-shadow: 0 24px 70px rgba(0,0,0,.6), 0 0 40px rgba(120,90,200,.28);
}
.close-x {
  position: absolute; right: 14px; top: 10px;
  background: none; border: none; color: #d4af37; font-size: 24px; cursor: pointer;
}
h2 { color: #f6e2a8; font-size: 22px; letter-spacing: 4px; margin: 0 0 4px; }
.sub { color: rgba(214,224,255,.7); font-size: 12px; margin: 0 0 16px; }
.stage {
  position: relative; width: 320px; max-width: 100%; height: 240px; margin: 0 auto;
  border-radius: 14px; overflow: hidden; border: 1px solid rgba(212,175,55,.35);
  background: #0a0818;
}
.video, .canvas { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.video { transform: scaleX(-1); }
.canvas { transform: scaleX(-1); }
.mask {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(6,5,18,.72); color: #e8cf88; font-size: 15px; letter-spacing: 2px;
}
.mask.ok { background: rgba(20,60,30,.6); color: #9dffc4; font-size: 20px; }
.steps { display: flex; justify-content: space-around; margin: 16px 0 10px; font-size: 12px; }
.step { display: flex; align-items: center; gap: 5px; color: rgba(214,224,255,.55); }
.step .dot {
  width: 18px; height: 18px; border-radius: 50%; display: inline-flex;
  align-items: center; justify-content: center; font-size: 11px;
  background: rgba(255,255,255,.1);
}
.step.active { color: #f6e2a8; }
.step.active .dot { background: rgba(212,175,55,.4); }
.step.done { color: #9dffc4; }
.step.done .dot { background: #2e7d4f; }
.progress { height: 6px; background: rgba(255,255,255,.1); border-radius: 3px; overflow: hidden; }
.progress .bar { height: 100%; background: linear-gradient(90deg,#d4af37,#f6e2a8); transition: width .3s; }
.msg { min-height: 18px; font-size: 13px; color: #e8cf88; margin: 10px 0; }
.msg.err { color: #ff9a9a; }
.msg.ok { color: #9dffc4; }
.notice {
  display: flex; align-items: center; justify-content: center; gap: 5px;
  font-size: 11px; color: rgba(214,224,255,.55); margin-bottom: 14px;
}
.actions { display: flex; gap: 10px; }
.btn {
  flex: 1; padding: 10px; border-radius: 10px; cursor: pointer;
  border: 1px solid rgba(255,236,170,.6); background: linear-gradient(180deg,#f6dfa0,#d4af37);
  color: #2a1e08; font-weight: bold; font-size: 14px;
}
.btn.ghost { background: rgba(255,255,255,.06); color: #e8cf88; border-color: rgba(212,175,55,.4); }

@media (max-width: 420px) {
  .dialog { padding: 20px 16px; }
  .stage { height: 200px; }
}
</style>
