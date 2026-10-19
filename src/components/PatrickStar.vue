<template>
  <div class="patrick">
    <div class="pt-body">
      <div class="pt-eye left"></div>
      <div class="pt-eye right"></div>
      <div class="pt-brow left"></div>
      <div class="pt-brow right"></div>
      <div class="pt-mouth"></div>
      <div class="pt-shorts"></div>
    </div>
  </div>
</template>

<style scoped>
.patrick {
  position: absolute;
  top: -72px;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 150px;
  animation: wobble 3.4s ease-in-out infinite;
  filter: drop-shadow(0 10px 12px rgba(1, 40, 80, .35));
}
@keyframes wobble {
  0%, 100% { transform: translateX(-50%) translateY(0) rotate(2deg); }
  50%      { transform: translateX(-50%) translateY(-9px) rotate(-2deg); }
}

/* 五角海星身体 */
.pt-body {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #ffb3c1 0%, #ff8fa3 55%, #f76c88 100%);
  clip-path: polygon(
    50% 0%,
    62% 32%,
    95% 30%,
    70% 54%,
    84% 92%,
    50% 70%,
    16% 92%,
    30% 54%,
    5% 30%,
    38% 32%
  );
}

.pt-eye {
  position: absolute;
  top: 34px;
  width: 17px;
  height: 30px;
  background: #fff;
  border-radius: 50%;
  overflow: hidden;
}
.pt-eye.left  { left: 56px; }
.pt-eye.right { right: 56px; }
.pt-eye::before {
  content: "";
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 7px;
  height: 7px;
  background: #222;
  border-radius: 50%;
  animation: pt-blink 5s infinite;
}
@keyframes pt-blink {
  0%, 90%, 100% { transform: translateX(-50%) scaleY(1); }
  94%           { transform: translateX(-50%) scaleY(.1); }
}

.pt-brow {
  position: absolute;
  top: 26px;
  width: 22px;
  height: 10px;
  border: 4px solid transparent;
  border-top-color: #b23a52;
  border-radius: 50%;
}
.pt-brow.left  { left: 50px; transform: rotate(-8deg); }
.pt-brow.right { right: 50px; transform: rotate(8deg); }

/* 傻笑 */
.pt-mouth {
  position: absolute;
  top: 74px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 18px;
  background: #7a1f2e;
  border-radius: 6px 6px 20px 20px;
  overflow: hidden;
}
.pt-mouth::after {
  /* 舌头 */
  content: "";
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 12px;
  background: #ff9fb0;
  border-radius: 50%;
}

/* 绿花短裤 */
.pt-shorts {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 66px;
  height: 30px;
  background:
    radial-gradient(circle 5px at 20% 40%, #a259d9 97%, transparent),
    radial-gradient(circle 5px at 78% 30%, #a259d9 97%, transparent),
    radial-gradient(circle 5px at 50% 70%, #a259d9 97%, transparent),
    #7ec850;
  clip-path: polygon(8% 0, 92% 0, 100% 100%, 62% 100%, 50% 62%, 38% 100%, 0 100%);
}
</style>
