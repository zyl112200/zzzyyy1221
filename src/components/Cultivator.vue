<script setup>
// 修仙人物（纯 CSS 绘制）：发髻、道袍、飞剑御空、灵气光环
defineProps({
  variant: { type: String, default: 'jade' } // jade | violet
})
</script>

<template>
  <div class="cultivator" :class="variant">
    <div class="aura"></div>
    <div class="sword"></div>
    <div class="figure">
      <!-- 发髻 + 发簪 -->
      <div class="hair">
        <div class="bun"></div>
        <div class="pin"></div>
      </div>
      <!-- 脸 -->
      <div class="face">
        <div class="eye left"></div>
        <div class="eye right"></div>
        <div class="cheek left"></div>
        <div class="cheek right"></div>
        <div class="smile"></div>
      </div>
      <!-- 道袍 -->
      <div class="robe">
        <div class="collar"></div>
        <div class="sash"></div>
        <div class="taiji">☯</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cultivator {
  position: absolute;
  top: -84px;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 188px;
  z-index: 6;
  animation: bob 3.2s ease-in-out infinite;
  filter: drop-shadow(0 10px 14px rgba(40, 10, 60, .42));
}
@keyframes bob {
  0%, 100% { transform: translateX(-50%) translateY(0) rotate(-2deg); }
  50%      { transform: translateX(-50%) translateY(-10px) rotate(2deg); }
}

/* 灵气光环 */
.aura {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 122px;
  height: 122px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 44%, rgba(180,140,255,.55), rgba(120,80,200,.16) 55%, rgba(120,80,200,0) 72%);
  animation: pulse 3.6s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: .72; }
  50%      { transform: translateX(-50%) scale(1.12); opacity: 1; }
}

/* 御空飞剑 */
.sword {
  position: absolute;
  top: 52px;
  right: -6px;
  width: 80px;
  height: 10px;
  transform: rotate(-26deg);
  animation: swordFloat 4.2s ease-in-out infinite;
}
.sword::before {
  content: '';
  position: absolute;
  left: 8px; top: 50%;
  transform: translateY(-50%);
  width: 64px; height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, #b2ebf2, #ffffff 68%, #e0f7fa);
  box-shadow: 0 0 10px rgba(180, 245, 255, .85);
}
.sword::after {
  content: '';
  position: absolute;
  left: -2px; top: 50%;
  transform: translateY(-50%);
  width: 11px; height: 17px;
  border-radius: 3px;
  background: linear-gradient(180deg, #b388ff, #7e57c2);
  box-shadow: 0 0 7px rgba(126, 87, 194, .7);
}
@keyframes swordFloat {
  0%, 100% { transform: rotate(-26deg) translateY(0); }
  50%      { transform: rotate(-22deg) translateY(-7px); }
}

.figure {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 122px;
  height: 156px;
}

/* 头发盖 */
.hair {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 86px;
  height: 48px;
  background: linear-gradient(180deg, #6b4a36, #4a3325);
  border-radius: 50% 50% 42% 42% / 72% 72% 30% 30%;
  z-index: 3;
  clip-path: polygon(0 0, 100% 0, 100% 68%, 82% 100%, 18% 100%, 0 68%);
}
.bun {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(180deg, #6b4a36, #3e2a1e);
  border: 2px solid #2a1812;
  z-index: 4;
}
.pin {
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 26px;
  border-radius: 3px;
  background: linear-gradient(180deg, #ffe082, #f9a825);
  box-shadow: 0 0 8px rgba(255, 213, 79, .85);
  z-index: 5;
}

/* 脸 */
.face {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 82px;
  background: radial-gradient(circle at 50% 38%, #fff4e6, #ffe0bd 72%);
  border: 3px solid #e0b483;
  border-radius: 50% 50% 46% 46%;
  z-index: 2;
}
.eye {
  position: absolute;
  top: 44px;
  width: 9px;
  height: 13px;
  background: #3a2a25;
  border-radius: 50%;
  animation: blink 5s infinite;
}
.eye.left { left: 23px; }
.eye.right { right: 23px; }
@keyframes blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95%           { transform: scaleY(.1); }
}
.cheek {
  position: absolute;
  top: 56px;
  width: 14px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 140, 140, .5);
}
.cheek.left { left: 13px; }
.cheek.right { right: 13px; }
.smile {
  position: absolute;
  top: 62px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 14px;
  border: 3px solid transparent;
  border-bottom-color: #b5654a;
  border-radius: 50%;
}

/* 道袍 */
.robe {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 112px;
  height: 98px;
  background: linear-gradient(180deg, #46b08a 0%, #2e9b78 46%, #1f7d63 100%);
  clip-path: polygon(28% 0, 72% 0, 100% 100%, 0 100%);
  z-index: 1;
}
.cultivator.violet .robe {
  background: linear-gradient(180deg, #8e7bd6 0%, #7e57c2 46%, #5e3fa0 100%);
}
.collar {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 62px;
  height: 20px;
  background: linear-gradient(180deg, #ffe082, #f9a825);
  border-radius: 0 0 46% 46%;
}
.sash {
  position: absolute;
  top: 30px;
  left: 0; right: 0;
  height: 15px;
  background: linear-gradient(90deg, #9b6dd1, #7e57c2);
  transform: rotate(-4deg) scaleX(1.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, .22);
}
.cultivator.jade .sash {
  background: linear-gradient(90deg, #2e9b78, #176b54);
}
.taiji {
  position: absolute;
  top: 44px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 22px;
  color: #fff;
  text-shadow: 0 0 6px rgba(255, 255, 255, .6);
}
</style>
