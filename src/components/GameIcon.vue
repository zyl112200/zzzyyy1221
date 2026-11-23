<script setup>
import { computed } from 'vue'
import { iconOf } from '../data/icons'
import { FISH_SPRITES } from '../data/fishSprites'

const props = defineProps({
  name: { type: String, required: true },   // 图标名或兼容 emoji
  size: { type: [Number, String], default: 20 },
  alt: { type: String, default: '' }
})
const src = computed(() => iconOf(props.name) || FISH_SPRITES[props.name] || null)
const style = computed(() => ({ width: props.size + 'px', height: props.size + 'px' }))
</script>

<template>
  <img v-if="src" :src="src" :style="style" :alt="alt || name" class="game-icon" draggable="false" />
  <span v-else class="game-icon fallback" :style="{ fontSize: (Number(size) * 0.9) + 'px' }">{{ name }}</span>
</template>

<style scoped>
.game-icon {
  display: inline-block;
  object-fit: contain;
  vertical-align: middle;
  flex: none;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .35));
}
.fallback { line-height: 1; }
</style>
