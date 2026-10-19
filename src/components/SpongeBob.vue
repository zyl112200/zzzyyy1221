<template>
  <div class="spongebob">
    <div class="sb-body"></div>
    <div class="sb-eye left"></div>
    <div class="sb-eye right"></div>
    <div class="sb-nose"></div>
    <div class="sb-smile"></div>
    <div class="sb-teeth"><span></span><span></span></div>
    <div class="sb-pants"></div>
  </div>
</template>

<style scoped>
.spongebob {
  position: absolute;
  top: -78px;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 160px;
  animation: bob 3s ease-in-out infinite;
  filter: drop-shadow(0 10px 12px rgba(1, 40, 80, .35));
}
@keyframes bob {
  0%, 100% { transform: translateX(-50%) translateY(0) rotate(-2deg); }
  50%      { transform: translateX(-50%) translateY(-10px) rotate(2deg); }
}

.sb-body {
  position: absolute;
  inset: 0 0 26px 0;
  background: #ffe14d;
  border: 4px solid #e0a800;
  border-radius: 18px 22px 14px 16px;
}
.sb-body::before {
  /* 海绵孔洞 */
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle 9px at 22% 30%, #e6c200 97%, transparent),
    radial-gradient(circle 7px at 75% 22%, #e6c200 97%, transparent),
    radial-gradient(circle 6px at 85% 60%, #e6c200 97%, transparent),
    radial-gradient(circle 8px at 14% 68%, #e6c200 97%, transparent),
    radial-gradient(circle 5px at 50% 12%, #e6c200 97%, transparent);
}

.sb-eye {
  position: absolute;
  top: 34px;
  width: 42px;
  height: 46px;
  background: #fff;
  border: 3px solid #e0a800;
  border-radius: 50%;
}
.sb-eye.left  { left: 22px; }
.sb-eye.right { right: 22px; }
.sb-eye::before {
  content: "";
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 18px;
  background: radial-gradient(circle at 40% 35%, #fff 18%, #4fc3f7 20%, #1565c0 70%);
  border-radius: 50%;
  animation: blink 4.5s infinite;
}
@keyframes blink {
  0%, 92%, 100% { transform: translateX(-50%) scaleY(1); }
  95%           { transform: translateX(-50%) scaleY(.1); }
}

.sb-nose {
  position: absolute;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 20px;
  background: #ffe14d;
  border: 3px solid #e0a800;
  border-radius: 8px;
  z-index: 2;
}

.sb-smile {
  position: absolute;
  top: 92px;
  left: 50%;
  transform: translateX(-50%);
  width: 62px;
  height: 26px;
  border: 4px solid transparent;
  border-bottom-color: #8d5a00;
  border-radius: 50%;
}

.sb-teeth {
  position: absolute;
  top: 104px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 3px;
}
.sb-teeth span {
  width: 12px;
  height: 14px;
  background: #fff;
  border: 2px solid #e0a800;
  border-radius: 0 0 4px 4px;
}

.sb-pants {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 30px;
  background: linear-gradient(#fff 0 30%, #8d5524 30% 100%);
  border: 4px solid #6d3f14;
  border-top-width: 3px;
  border-radius: 6px 6px 12px 12px;
}
.sb-pants::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 30%;
  transform: translateX(-50%);
  width: 4px;
  height: 70%;
  background: #d32f2f; /* 红领带 */
  border-radius: 2px;
}
</style>
