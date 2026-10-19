<script setup>
import { ref } from 'vue'
import OceanBackground from '../components/OceanBackground.vue'
import LoginCard from '../components/LoginCard.vue'
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
    <OceanBackground />
    <LoginCard @toast="showToast" />
    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}
</style>
