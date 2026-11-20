<script setup>
// 写实仙侠背景：写实 CG 仙山月夜大图 + 渐变遮罩 + 少量灵气光点
import { ref } from 'vue'

const spirits = ref(
  Array.from({ length: 16 }, () => {
    const size = 3 + Math.random() * 8
    return {
      width: size + 'px',
      height: size + 'px',
      left: Math.random() * 100 + '%',
      animationDuration: 9 + Math.random() * 12 + 's',
      animationDelay: -Math.random() * 20 + 's',
      hue: Math.random() > 0.5 ? 'rgba(255,224,160,' : 'rgba(170,220,255,'
    }
  })
)
</script>

<template>
  <div class="immortal-bg">
    <!-- 写实仙山月夜背景图 -->
    <div class="art"></div>
    <!-- 暗角 + 中央压暗，保证卡片可读 -->
    <div class="shade"></div>
    <!-- 升腾的灵气光点 -->
    <span
      v-for="(p, i) in spirits"
      :key="'spirit-' + i"
      class="spirit"
      :style="{
        left: p.left,
        width: p.width,
        height: p.height,
        background: p.hue + '0.9)',
        boxShadow: '0 0 8px ' + p.hue + '0.8)',
        animationDuration: p.animationDuration,
        animationDelay: p.animationDelay
      }"
    ></span>
  </div>
</template>

<style scoped>
.immortal-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  background: #0b1024;
}

.art {
  position: absolute;
  inset: 0;
  background-image: url('../assets/login_bg.jpg');
  background-size: cover;
  background-position: center 42%;
  animation: slowZoom 28s ease-in-out infinite alternate;
}
@keyframes slowZoom {
  0%   { transform: scale(1); }
  100% { transform: scale(1.08); }
}

/* 中央暗化 + 四周暗角，让卡片和文字浮起来 */
.shade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 46% 62% at 50% 52%, rgba(8, 10, 28, .72) 0%, rgba(8, 10, 28, .28) 55%, rgba(8, 10, 28, 0) 100%),
    linear-gradient(180deg, rgba(6, 8, 24, .28) 0%, rgba(6, 8, 24, 0) 30%, rgba(6, 8, 24, .35) 100%);
}

.spirit {
  position: absolute;
  bottom: -40px;
  border-radius: 50%;
  animation: ascend linear infinite;
}
@keyframes ascend {
  0%   { transform: translateY(0) translateX(0) scale(.7); opacity: 0; }
  12%  { opacity: .9; }
  50%  { transform: translateY(-46vh) translateX(20px) scale(1.05); }
  100% { transform: translateY(-104vh) translateX(-14px) scale(1.2); opacity: 0; }
}
</style>
