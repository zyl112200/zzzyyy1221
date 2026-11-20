<script setup>
// 写实修仙者全身立绘：作为登录/注册界面主体大幅展示，不再裁成圆形头像
defineProps({
  variant: { type: String, default: 'jade' } // jade | violet
})
</script>

<template>
  <div class="hero" :class="variant">
    <div class="aura"></div>
    <img
      v-if="variant === 'violet'"
      src="../assets/cultivator_violet_male.png"
      alt="紫霄剑尊"
      draggable="false"
    >
    <img
      v-else
      src="../assets/cultivator_jade_male.png"
      alt="青玉剑仙"
      draggable="false"
    >
    <div class="ground-glow"></div>
  </div>
</template>

<style scoped>
.hero {
  position: relative;
  height: min(86vh, 860px);
  aspect-ratio: 640 / 903;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: hover 5.5s ease-in-out infinite;
  will-change: transform;
}
@keyframes hover {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}

/* 人物背后光晕 */
.aura {
  position: absolute;
  inset: 6% 4% 10%;
  border-radius: 50%;
  background: radial-gradient(ellipse at 50% 42%, rgba(120, 220, 170, .28), rgba(120, 220, 170, 0) 68%);
  filter: blur(24px);
  z-index: 0;
}
.hero.violet .aura {
  background: radial-gradient(ellipse at 50% 42%, rgba(180, 130, 255, .3), rgba(180, 130, 255, 0) 68%);
}

.hero img {
  position: relative;
  z-index: 1;
  height: 100%;
  width: auto;
  max-width: none;
  object-fit: contain;
  display: block;
  filter: saturate(1.06) contrast(1.04)
          drop-shadow(0 18px 30px rgba(0, 0, 0, .55))
          drop-shadow(0 0 26px rgba(150, 210, 180, .18));
}
.hero.violet img {
  filter: saturate(1.06) contrast(1.04)
          drop-shadow(0 18px 30px rgba(0, 0, 0, .55))
          drop-shadow(0 0 26px rgba(160, 120, 230, .22));
}

/* 脚下地面光晕，增强立绘落地感 */
.ground-glow {
  position: absolute;
  z-index: 0;
  bottom: 1.5%;
  left: 50%;
  transform: translateX(-50%);
  width: 58%;
  height: 5%;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(150, 235, 185, .5), rgba(150, 235, 185, 0) 70%);
  filter: blur(7px);
}
.hero.violet .ground-glow {
  background: radial-gradient(ellipse, rgba(190, 150, 255, .5), rgba(190, 150, 255, 0) 70%);
}

@media (max-width: 900px) {
  .hero { height: min(48vh, 440px); }
}
</style>
