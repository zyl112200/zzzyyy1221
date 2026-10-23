<script setup>
import { useRouter } from 'vue-router'
import { clearSession, getSession } from '../store/session'

const props = defineProps({
  shells: { type: Number, default: 0 },
  goldStones: { type: Number, default: 0 },
  strength: { type: Number, default: 10 },
  powerRealm: { type: Number, default: 1 },
  realmTitle: { type: String, default: '比奇堡萌新' }
})

const router = useRouter()
const session = getSession()
const username = session ? session.username : ''

function logout() {
  clearSession()
  router.push('/')
}
</script>

<template>
  <header class="topbar">
    <div class="brand">🏝️ 比奇堡钓鱼</div>
    <nav class="nav">
      <router-link to="/home">🎣 码头</router-link>
      <router-link to="/shop">🛒 商店</router-link>
      <router-link to="/inventory">🎒 背包</router-link>
      <router-link to="/admin" class="admin-link">🛠 后台</router-link>
    </nav>
    <div class="right">
      <span class="chip shell">🐚 {{ shells }}</span>
      <span class="chip gold">🪙 {{ goldStones }}</span>
      <span class="chip str">💪 {{ strength }}</span>
      <span class="chip realm" :title="powerRealm + ' 重天'">🌟 {{ realmTitle }}</span>
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
  background: rgba(2, 60, 110, 0.82);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
  flex-wrap: wrap;
}
.brand {
  font-weight: bold;
  font-size: 18px;
  letter-spacing: 1px;
  color: #fff;
  text-shadow: 1px 1px 0 #01477f;
}
.nav {
  display: flex;
  gap: 8px;
}
.nav a {
  color: #cdeffd;
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
