<script setup>
defineProps({
  message: { type: String, default: '' },
  visible: { type: Boolean, default: false }
})
</script>

<template>
  <div class="toast" :class="{ show: visible }">{{ message }}</div>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 28px;
  left: 50%;
  transform: translateX(-50%) translateY(-90px);
  background: #fff8e1;
  color: #6d4c00;
  border: 3px solid #ffb300;
  padding: 12px 26px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: bold;
  box-shadow: 0 10px 24px rgba(1, 40, 80, .35);
  transition: transform .4s cubic-bezier(.68, -0.55, .27, 1.55);
  z-index: 99;
}
.toast.show {
  transform: translateX(-50%) translateY(0);
}
</style>
