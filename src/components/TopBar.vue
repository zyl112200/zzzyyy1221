<script setup>
import { useRouter } from 'vue-router'
import { clearSession, getSession } from '../store/session'
import GameIcon from './GameIcon.vue'

const props = defineProps({
  shells: { type: Number, default: 0 },
  power: { type: Number, default: 100 },
  cultivation: { type: Number, default: 0 }
})

const router = useRouter()
const session = getSession()
const username = session ? session.username : ''
// 仅「管理员权限」（permission === 0）的用户才能在首页看到后台入口
const isAdmin = !!(session && session.permission === 0)

function logout() {
  clearSession()
  router.push('/')
}
</script>

<template>
  <header class="topbar">
    <div class="brand"><GameIcon name="mountain" :size="20" /> 仙钓大陆</div>
    <nav class="nav">
      <router-link to="/home"><GameIcon name="hook" :size="17" /> 灵湖</router-link>
      <router-link to="/assoc"><GameIcon name="trophy" :size="17" /> 协会</router-link>
      <router-link to="/codex"><GameIcon name="book" :size="17" /> 图鉴</router-link>
      <router-link to="/shop"><GameIcon name="cart" :size="17" /> 仙市</router-link>
      <router-link to="/inventory"><GameIcon name="backpack" :size="17" /> 行囊</router-link>
      <router-link v-if="isAdmin" to="/admin" class="admin-link"><GameIcon name="tools" :size="17" /> 后台</router-link>
    </nav>
    <div class="right">
      <span class="chip gold"><GameIcon name="coin" :size="19" /> {{ shells }}</span>
      <span class="chip str" :title="`基础力量 × (1 + 修为 ${cultivation}%)`"><GameIcon name="power" :size="19" /> {{ power }}</span>
      <span class="chip cul" title="修为：单独加成在基础力量上，无上限"><GameIcon name="cultivation" :size="19" /> 修为 {{ cultivation }}%</span>
      <span class="user">{{ username }}</span>
      <button class="logout" @click="logout">退出</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  background: rgba(14, 22, 36, 0.92);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
  flex-wrap: wrap;
}
.brand {
  font-weight: bold;
  font-size: 18px;
  letter-spacing: 1px;
  color: #ffd54f;
  text-shadow: 1px 1px 0 #4a148c;
}
.nav {
  display: flex;
  gap: 8px;
}
.nav a, .brand, .chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.nav a {
  color: #e1d5ff;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 10px;
  font-weight: bold;
  transition: background .2s, color .2s;
}
.nav a:hover { background: rgba(255, 255, 255, 0.12); }
.nav a.router-link-active {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}
.nav a.admin-link {
  background: rgba(255, 213, 79, 0.30);
  color: #fff3c4;
}
.nav a.admin-link:hover { background: rgba(255, 213, 79, 0.45); }
.right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  background: rgba(255, 255, 255, 0.18);
  padding: 5px 12px;
  border-radius: 14px;
  font-weight: bold;
  font-size: 14px;
  color: #fff;
  white-space: nowrap;
}
.chip.shell { background: rgba(255, 193, 7, 0.28); }
.chip.gold { background: rgba(255, 215, 0, 0.22); color: #ffe082; }
.chip.str { background: rgba(102, 187, 106, 0.28); }
.chip.cul { background: rgba(0, 200, 170, 0.26); color: #b9fff0; }
.chip.realm { background: rgba(186, 104, 200, 0.30); color: #f3e5f5; }
.user { color: #e3f4ff; opacity: .9; }
.logout {
  background: #ff6b6b;
  border: none;
  color: #fff;
  padding: 6px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
}
.logout:hover { background: #ff5252; }
</style>
