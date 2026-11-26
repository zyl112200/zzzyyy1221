<script setup>
import { useRouter } from 'vue-router'
import { clearSession, getSession } from '../store/session'
import GameIcon from './GameIcon.vue'

const props = defineProps({
  shells: { type: Number, default: 0 },
  // 金石为兼容字段（货币已统一为金币，恒为 0），保留 prop 以免父组件传参被丢弃
  goldStones: { type: Number, default: 0 },
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
      <router-link to="/skills"><GameIcon name="taiji" :size="17" /> 功法</router-link>
      <router-link to="/achievements"><GameIcon name="medals" :size="17" /> 成就</router-link>
      <router-link to="/pond"><GameIcon name="lotus" :size="17" /> 洞天</router-link>
      <router-link to="/bond"><GameIcon name="star" :size="17" /> 灵契</router-link>
      <router-link to="/more" class="more-link"><span class="more-emoji">🌌</span> 更多</router-link>
      <router-link to="/quests"><GameIcon name="scroll" :size="17" /> 悬赏</router-link>
      <router-link to="/leaderboard"><GameIcon name="chart" :size="17" /> 天榜</router-link>
      <router-link to="/shop"><GameIcon name="cart" :size="17" /> 仙市</router-link>
      <router-link to="/inventory"><GameIcon name="backpack" :size="17" /> 行囊</router-link>
      <router-link to="/identity" class="identity-link"><GameIcon name="lock" :size="17" /> 实名</router-link>
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
.nav a.identity-link {
  background: rgba(124, 252, 0, 0.14);
  color: #d6ffb0;
}
.nav a.identity-link:hover { background: rgba(124, 252, 0, 0.26); }
.nav a.more-link {
  background: linear-gradient(135deg, rgba(129, 140, 248, 0.45), rgba(168, 85, 247, 0.45));
  color: #fff;
  border: 1px solid rgba(196, 181, 253, 0.6);
}
.nav a.more-link:hover, .nav a.more-link.router-link-active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(147, 51, 234, 0.7));
}
.more-emoji { font-size: 15px; line-height: 1; }
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

/* 移动端：导航改为横向滚动，避免 8 个入口挤爆一行；状态条自动换行居中 */
@media (max-width: 900px) {
  .topbar { gap: 8px; padding: 8px 12px; }
  .brand { font-size: 16px; }
  .nav {
    order: 3; width: 100%; overflow-x: auto; gap: 6px;
    -webkit-overflow-scrolling: touch; scrollbar-width: none;
  }
  .nav::-webkit-scrollbar { display: none; }
  .nav a { white-space: nowrap; padding: 6px 10px; font-size: 13px; }
  .right { gap: 6px; }
  .chip { padding: 4px 9px; font-size: 12px; }
  .user { font-size: 12px; }
  .logout { padding: 5px 10px; font-size: 12px; }
}
@media (max-width: 480px) {
  .chip.cul { display: none; } /* 窄屏隐藏修为 chip，力量/金币仍可见 */
}
</style>
