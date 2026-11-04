<script setup>
// 修仙主题背景：仙山、明月、祥云、灵气升腾
import { ref } from 'vue'

const spirits = ref(
  Array.from({ length: 20 }, () => {
    const size = 4 + Math.random() * 10
    return {
      width: size + 'px',
      height: size + 'px',
      left: Math.random() * 100 + '%',
      animationDuration: 8 + Math.random() * 12 + 's',
      animationDelay: -Math.random() * 20 + 's',
      hue: Math.random() > 0.5 ? 'rgba(255,236,170,' : 'rgba(180,220,255,'
    }
  })
)

const stars = ref(
  Array.from({ length: 26 }, () => ({
    top: Math.random() * 42 + '%',
    left: Math.random() * 100 + '%',
    size: 1 + Math.random() * 2 + 'px',
    animationDelay: -Math.random() * 4 + 's'
  }))
)
</script>

<template>
  <div class="immortal-bg">
    <!-- 夜空 -->
    <div class="sky"></div>

    <!-- 星斗 -->
    <span
      v-for="(s, i) in stars"
      :key="'star-' + i"
      class="star"
      :style="{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.animationDelay }"
    ></span>

    <!-- 明月 -->
    <div class="moon"></div>

    <!-- 祥云 -->
    <div class="cloud x1"></div>
    <div class="cloud x2"></div>
    <div class="cloud x3"></div>

    <!-- 仙山三层剪影 -->
    <div class="peak peak-far"></div>
    <div class="peak peak-mid"></div>
    <div class="peak peak-near"></div>

    <!-- 云海雾气 -->
    <div class="mist"></div>

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
}

.sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #160f3a 0%, #2b2160 36%, #533b8f 66%, #c79a5a 100%);
}

.star {
  position: absolute;
  background: #fff;
  border-radius: 50%;
  opacity: .8;
  animation: twinkle 3.5s ease-in-out infinite;
}
@keyframes twinkle {
  0%, 100% { opacity: .25; transform: scale(.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.moon {
  position: absolute;
  right: 14%;
  top: 12%;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 38%, #ffffff 0%, #fff3d0 46%, rgba(255,243,208,0) 72%);
  box-shadow: 0 0 70px 28px rgba(255, 240, 200, .42), 0 0 140px 60px rgba(180, 160, 255, .25);
}

/* 祥云：层叠的圆润云朵 */
.cloud {
  position: absolute;
  height: 30px;
  border-radius: 40px;
  background: linear-gradient(180deg, rgba(255,246,224,.9), rgba(220,205,255,.6));
  filter: blur(.3px);
  opacity: .8;
}
.cloud::before, .cloud::after {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: 50%;
}
.cloud::before { width: 46px; height: 46px; top: -22px; left: 18px; }
.cloud::after { width: 34px; height: 34px; top: -16px; right: 20px; }
.x1 { width: 150px; top: 15%; left: 7%; animation: drift 36s linear infinite; }
.x2 { width: 104px; top: 8%; left: 46%; animation: drift 50s linear infinite; opacity: .66; }
.x3 { width: 180px; top: 22%; left: 70%; animation: drift 60s linear infinite; opacity: .5; }
@keyframes drift {
  0% { transform: translateX(-18px); }
  50% { transform: translateX(28px); }
  100% { transform: translateX(-18px); }
}

/* 仙山剪影 */
.peak { position: absolute; bottom: 22%; transform-origin: bottom center; }
.peak-far {
  left: -5%; width: 48%; height: 30%;
  background: linear-gradient(180deg, #6f5fa6 0%, #4a3d77 100%);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  opacity: .5; filter: blur(1px);
}
.peak-mid {
  left: 28%; width: 52%; height: 40%;
  background: linear-gradient(180deg, #5a4a8c 0%, #3a2f63 100%);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  opacity: .72;
}
.peak-near {
  right: -7%; width: 54%; height: 32%;
  background: linear-gradient(180deg, #443663 0%, #2a2150 100%);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  opacity: .88;
}

.mist {
  position: absolute;
  left: 0; right: 0; bottom: 22%;
  height: 66px;
  background: linear-gradient(180deg, rgba(230,220,255,0) 0%, rgba(230,220,255,.55) 50%, rgba(230,220,255,0) 100%);
  filter: blur(6px);
  animation: mistMove 12s ease-in-out infinite;
}
@keyframes mistMove {
  0%, 100% { transform: translateX(-10px); opacity: .6; }
  50% { transform: translateX(10px); opacity: .85; }
}

.spirit {
  position: absolute;
  bottom: -40px;
  border-radius: 50%;
  animation: ascend linear infinite;
}
@keyframes ascend {
  0% { transform: translateY(0) translateX(0) scale(.7); opacity: 0; }
  12% { opacity: .95; }
  50% { transform: translateY(-46vh) translateX(22px) scale(1.05); }
  100% { transform: translateY(-104vh) translateX(-16px) scale(1.2); opacity: 0; }
}
</style>
