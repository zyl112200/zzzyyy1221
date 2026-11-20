<script setup>
import { ref } from 'vue'
import ImmortalBackground from '../components/ImmortalBackground.vue'
import Cultivator from '../components/Cultivator.vue'
import RegisterCard from '../components/RegisterCard.vue'
import ToastMessage from '../components/ToastMessage.vue'

const toastVisible = ref(false)
const toastMessage = ref('')
let timer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { toastVisible.value = false }, 2600)
}
</script>

<template>
  <div class="page">
    <ImmortalBackground />
    <div class="stage">
      <RegisterCard @toast="showToast" />
      <Cultivator variant="violet" class="hero-slot" />
    </div>
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 32px;
  position: relative;
}
.stage {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 4vw, 70px);
  width: 100%;
  max-width: 1080px;
}
.hero-slot {
  flex: 0 1 auto;
  min-width: 0;
}

/* 窄屏：改为上下布局，人物在下、卡片在上，均完整可见 */
@media (max-width: 760px) {
  .page { padding: 16px 14px 24px; align-items: flex-start; }
  .stage { flex-direction: column; gap: 4px; }
  .hero-slot { align-self: center; }
}
</style>
