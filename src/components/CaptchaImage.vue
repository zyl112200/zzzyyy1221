<script setup>
/**
 * 图形验证码组件（借鉴开源 vue3-captcha-canvas / fox-captcha 的绘制思路）
 * - 用 canvas 绘制随机字符 + 旋转 + 干扰线 + 噪点
 * - 点击图片立即刷新
 * - 通过 defineExpose 暴露 refresh() 和 currentCode（仅用于本地校验，不上报）
 */
import { ref, onMounted } from 'vue'
import { createChallenge, drawSpec, noiseSpec, codeMatches } from '../data/captcha.js'

const props = defineProps({
  width: { type: Number, default: 118 },
  height: { type: Number, default: 40 },
  length: { type: Number, default: 4 }
})

const emit = defineEmits(['change'])
const canvasRef = ref(null)
const challenge = ref(createChallenge({ length: props.length }))

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const { width, height } = props
  // 高清屏适配
  const dpr = window.devicePixelRatio || 1
  canvas.width = width * dpr
  canvas.height = height * dpr
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  ctx.scale(dpr, dpr)

  // 背景
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, 'rgba(18,16,42,.92)')
  grad.addColorStop(1, 'rgba(34,26,66,.92)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  const noise = noiseSpec(width, height)
  // 干扰线
  for (const l of noise.lines) {
    ctx.strokeStyle = l.color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(l.x1, l.y1)
    ctx.lineTo(l.x2, l.y2)
    ctx.stroke()
  }
  // 噪点
  for (const d of noise.dots) {
    ctx.fillStyle = d.color
    ctx.beginPath()
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
    ctx.fill()
  }
  // 字符
  const spec = drawSpec(challenge.value.code)
  const step = width / (spec.length + 1)
  spec.forEach((s, i) => {
    ctx.save()
    ctx.translate(step * (i + 1), height / 2 + s.dy)
    ctx.rotate((s.rotate * Math.PI) / 180)
    ctx.font = `bold ${s.fontSize}px "Trebuchet MS", "Microsoft YaHei", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,.6)'
    ctx.shadowBlur = 4
    ctx.fillStyle = s.color
    ctx.fillText(s.ch, 0, 0)
    ctx.restore()
  })
}

function refresh() {
  challenge.value = createChallenge({ length: props.length })
  draw()
  emit('change', challenge.value)
}

/** 校验用户输入（一次性：校验后无论成败都刷新） */
function verify(input) {
  const ok = codeMatches(input, challenge.value.code)
  refresh()
  return ok
}

onMounted(() => {
  draw()
  emit('change', challenge.value)
})

defineExpose({ refresh, verify, getChallenge: () => challenge.value })
</script>

<template>
  <canvas
    ref="canvasRef"
    class="captcha-canvas"
    :width="width"
    :height="height"
    title="点击更换验证码"
    @click="refresh"
  />
</template>

<style scoped>
.captcha-canvas {
  display: block;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid rgba(212, 175, 55, .35);
  box-shadow: inset 0 0 12px rgba(0, 0, 0, .4);
  transition: border-color .2s, box-shadow .2s;
}
.captcha-canvas:hover {
  border-color: rgba(212, 175, 55, .8);
  box-shadow: 0 0 12px rgba(212, 175, 55, .25), inset 0 0 12px rgba(0, 0, 0, .4);
}
</style>
