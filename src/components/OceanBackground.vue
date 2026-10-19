<script setup>
import { ref } from 'vue'

// 随机生成的泡泡
const bubbles = ref(
  Array.from({ length: 22 }, () => {
    const size = 8 + Math.random() * 34
    return {
      width: size + 'px',
      height: size + 'px',
      left: Math.random() * 100 + '%',
      animationDuration: 6 + Math.random() * 10 + 's',
      animationDelay: Math.random() * 12 + 's'
    }
  })
)

// 游过的小鱼
const fishEmojis = ['🐠', '🐟', '🐡', '🐠', '🦀', '⭐']
const fishes = ref(
  fishEmojis.map((emoji) => ({
    emoji,
    top: 8 + Math.random() * 60 + '%',
    fontSize: 18 + Math.random() * 22 + 'px',
    animationDuration: 14 + Math.random() * 18 + 's',
    animationDelay: -Math.random() * 20 + 's'
  }))
)
</script>

<template>
  <!-- 透入海水的阳光 -->
  <div class="light-ray r1"></div>
  <div class="light-ray r2"></div>
  <div class="light-ray r3"></div>

  <!-- 沙滩 -->
  <div class="sand"></div>

  <!-- 花形云（比奇堡天空） -->
  <svg class="flower-cloud" style="top:8%;left:6%;" width="90" height="90" viewBox="0 0 100 100">
    <g fill="none" stroke="#fff" stroke-width="5">
      <path d="M50 10 Q65 30 50 50 Q35 30 50 10Z" />
      <path d="M90 50 Q70 65 50 50 Q70 35 90 50Z" />
      <path d="M50 90 Q35 70 50 50 Q65 70 50 90Z" />
      <path d="M10 50 Q30 35 50 50 Q30 65 10 50Z" />
    </g>
  </svg>
  <svg class="flower-cloud" style="top:14%;right:10%;animation-delay:3s;" width="70" height="70" viewBox="0 0 100 100">
    <g fill="none" stroke="#fff" stroke-width="6">
      <path d="M50 10 Q65 30 50 50 Q35 30 50 10Z" />
      <path d="M90 50 Q70 65 50 50 Q70 35 90 50Z" />
      <path d="M50 90 Q35 70 50 50 Q65 70 50 90Z" />
      <path d="M10 50 Q30 35 50 50 Q30 65 10 50Z" />
    </g>
  </svg>

  <!-- 水母 -->
  <div class="jellyfish" style="top:20%;left:14%;font-size:44px;">🪼</div>
  <div class="jellyfish" style="top:34%;right:14%;font-size:32px;animation-delay:2s;">🪼</div>

  <!-- 上升的泡泡 -->
  <div
    v-for="(b, i) in bubbles"
    :key="'bubble-' + i"
    class="bubble"
    :style="b"
  ></div>

  <!-- 游动的小鱼 -->
  <div
    v-for="(f, i) in fishes"
    :key="'fish-' + i"
    class="fish"
    :style="f"
  >{{ f.emoji }}</div>
</template>

<style scoped>
.sand {
  position: absolute;
  bottom: -40px;
  left: 0;
  right: 0;
  height: 140px;
  background: radial-gradient(ellipse at 50% 0%, #f7e08b 0%, #e8c96a 60%, #d4a94e 100%);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  z-index: 0;
}

.light-ray {
  position: absolute;
  top: -50px;
  width: 140px;
  height: 70vh;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0));
  transform: skewX(-18deg);
  filter: blur(6px);
  animation: sway 8s ease-in-out infinite alternate;
  z-index: 0;
}
.light-ray.r1 { left: 12%; }
.light-ray.r2 { left: 42%; animation-delay: 2s; height: 55vh; opacity: .7; }
.light-ray.r3 { right: 8%; animation-delay: 4s; opacity: .5; }
@keyframes sway {
  from { transform: skewX(-14deg) translateX(0); }
  to   { transform: skewX(-22deg) translateX(30px); }
}

.bubble {
  position: absolute;
  bottom: -60px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, .9), rgba(255, 255, 255, .15));
  border: 1px solid rgba(255, 255, 255, .4);
  animation: rise linear infinite;
  z-index: 1;
}
@keyframes rise {
  0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
  10%  { opacity: .9; }
  50%  { transform: translateY(-50vh) translateX(20px) scale(1.05); }
  100% { transform: translateY(-110vh) translateX(-15px) scale(1.15); opacity: 0; }
}

.fish {
  position: absolute;
  font-size: 28px;
  animation: swim linear infinite;
  z-index: 1;
  opacity: .85;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, .2));
}
@keyframes swim {
  from { left: -8%; }
  to   { left: 108%; }
}

.flower-cloud {
  position: absolute;
  z-index: 0;
  opacity: .35;
  animation: floatFlower 14s ease-in-out infinite alternate;
}
@keyframes floatFlower {
  from { transform: translateY(0) rotate(-3deg); }
  to   { transform: translateY(-18px) rotate(3deg); }
}

.jellyfish {
  position: absolute;
  z-index: 1;
  animation: jelly 9s ease-in-out infinite alternate;
  opacity: .8;
}
@keyframes jelly {
  from { transform: translateY(0); }
  to   { transform: translateY(-46px); }
}
</style>
