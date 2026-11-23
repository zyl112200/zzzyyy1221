<script setup>
import { ref } from 'vue'

// 写实景深：真实海底摄影大图 + 上升气泡（弱化，用于营造水下感）
const bubbles = ref(
  Array.from({ length: 18 }, () => {
    const size = 5 + Math.random() * 16
    return {
      width: size + 'px',
      height: size + 'px',
      left: Math.random() * 100 + '%',
      animationDuration: 8 + Math.random() * 12 + 's',
      animationDelay: -Math.random() * 14 + 's'
    }
  })
)
</script>

<template>
  <div class="ocean-bg">
    <div class="art"></div>
    <div class="shade"></div>
    <div
      v-for="(b, i) in bubbles"
      :key="'bubble-' + i"
      class="bubble"
      :style="b"
    ></div>
  </div>
</template>

<style scoped>
.ocean-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  background: #062634;
  pointer-events: none;
}
.art {
  position: absolute;
  inset: 0;
  background-image: url('../assets/ocean_bg.png');
  background-size: cover;
  background-position: center 42%;
  animation: oceanZoom 34s ease-in-out infinite alternate;
}
@keyframes oceanZoom {
  0%   { transform: scale(1); }
  100% { transform: scale(1.08); }
}
/* 压暗并偏蓝，保证前景卡片文字可读 */
.shade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 80% at 50% 45%, rgba(2, 22, 36, .55) 0%, rgba(2, 22, 36, .74) 60%, rgba(2, 22, 36, .88) 100%),
    linear-gradient(180deg, rgba(2, 18, 30, .35) 0%, rgba(2, 18, 30, .15) 40%, rgba(1, 12, 22, .6) 100%);
}
.bubble {
  position: absolute;
  bottom: -40px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, .55), rgba(255, 255, 255, .06) 70%);
  border: 1px solid rgba(255, 255, 255, .22);
  animation: rise linear infinite;
  opacity: .5;
}
@keyframes rise {
  0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
  12%  { opacity: .5; }
  50%  { transform: translateY(-50vh) translateX(14px) scale(1.05); }
  100% { transform: translateY(-105vh) translateX(-10px) scale(1.15); opacity: 0; }
}
</style>
