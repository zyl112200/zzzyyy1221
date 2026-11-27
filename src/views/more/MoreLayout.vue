<script setup>
import GameIcon from '../../components/GameIcon.vue'
import { ref, onMounted } from 'vue'
import TopBar from '../../components/TopBar.vue'
import { getSession } from '../../store/session'
import { meApi } from '../../api/game.js'

const session = getSession()
const username = session ? session.username : ''
// 顶栏金币/力量/修为是全局账户状态：子页面架构下由布局统一加载，
// 否则四个子页顶栏都显示 0（金币不同步）。
const shells = ref(0)
const power = ref(100)
const cultivation = ref(0)

onMounted(async () => {
  if (!username) return
  try {
    const me = await meApi(username)
    if (me && me.code === 200 && me.data) {
      shells.value = me.data.shells == null ? 0 : me.data.shells
      power.value = me.data.power == null ? 100 : me.data.power
      cultivation.value = me.data.cultivation == null ? 0 : me.data.cultivation
    }
  } catch { /* 顶栏数值读取失败不影响玩法 */ }
})

const tabs = [
  { to: '/more/abyss', label: '无尽塔', icon: '⚔️', desc: '爬塔检定战力，冲层拿金币与道韵' },
  { to: '/more/vein', label: '灵脉', icon: '💎', desc: '离线挂机产金币与灵气，升级提产' },
  { to: '/more/rebirth', label: '轮回', icon: '🔄', desc: '耗道韵转永久道印，无限轮回' },
  { to: '/more/pass', label: '战令', icon: '📜', desc: '每日任务攒经验，升级领永久加成' }
]
</script>

<template>
  <div class="more-page">
    <TopBar :shells="shells" :power="power" :cultivation="cultivation" />
    <div class="wrap">
      <header class="more-head">
        <div>
          <h1><GameIcon name="map" :size="22" /> 更多 · 道途深处</h1>
          <p>四条长期养成主线彼此联动：钓鱼淬力量 → 爬塔攒道韵 → 轮回铸道印 → 战令每日修炼，永久加成反哺每一次抛竿。</p>
        </div>
      </header>

      <nav class="subnav">
        <router-link v-for="t in tabs" :key="t.to" :to="t.to" class="tab">
          <span class="tab-ico">{{ t.icon }}</span>
          <span class="tab-txt"><b>{{ t.label }}</b><small>{{ t.desc }}</small></span>
        </router-link>
      </nav>

      <router-view />
    </div>
  </div>
</template>

<style scoped>
.more-page { min-height: 100vh; background: linear-gradient(180deg, rgba(7,15,30,.52), rgba(5,11,24,.74)), url('../../assets/maps/scenes/scene_shenyuan.png') center center / cover fixed no-repeat; padding-bottom: 40px; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 18px 16px; }
.more-head { margin: 8px 0 18px; }
.more-head h1 { margin: 0 0 6px; font-size: 26px; color: #3730a3; }
.more-head p { margin: 0; color: #6b6a8a; font-size: 13px; line-height: 1.6; max-width: 760px; }
.subnav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
.tab {
  display: flex; align-items: center; gap: 10px; text-decoration: none;
  background: #fff; border: 2px solid #e3d7f5; border-radius: 14px; padding: 12px;
  box-shadow: 0 4px 14px rgba(60,40,120,.06); transition: transform .15s, border-color .15s, background .15s;
}
.tab:hover { transform: translateY(-2px); border-color: #a5b4fc; }
.tab.router-link-active { border-color: #4f46e5; background: linear-gradient(145deg, #eef2ff, #f5f3ff); box-shadow: 0 6px 18px rgba(79,70,229,.18); }
.tab-ico { font-size: 26px; flex: 0 0 auto; }
.tab-txt { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tab-txt b { color: #4338ca; font-size: 15px; }
.tab-txt small { color: #8a8aa0; font-size: 11px; line-height: 1.35; }
@media (max-width: 900px) {
  .subnav { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .tab { padding: 9px; gap: 7px; }
  .tab-txt small { display: none; }
}
</style>
