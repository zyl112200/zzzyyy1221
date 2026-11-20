<script setup>
import { ref, computed, onMounted } from 'vue'
import OceanBackground from '../components/OceanBackground.vue'
import TopBar from '../components/TopBar.vue'
import ToastMessage from '../components/ToastMessage.vue'
import { getSession } from '../store/session'
import { meApi } from '../api/game'
import { CODEX_GROUPS, CODEX_ALL, CODEX_TOTAL } from '../data/fishCodex'

const session = getSession()
const username = session ? session.username : ''
const shells = ref(0)
const power = ref(100)
const unlocked = ref([]) // 已解锁鱼名列表
const toastVisible = ref(false)
const toastMessage = ref('')
const selected = ref(null) // 当前查看的鱼详情
let timer = null

function showToast(msg) {
  toastMessage.value = msg
  toastVisible.value = true
  clearTimeout(timer)
  timer = setTimeout(() => { toastVisible.value = false }, 2600)
}

const unlockedSet = computed(() => new Set(unlocked.value))
const unlockedCount = computed(() => CODEX_ALL.filter((f) => unlockedSet.value.has(f.name)).length)
const progressPct = computed(() => Math.round((unlockedCount.value / CODEX_TOTAL) * 100))

const groupCount = (group) => group.fish.filter((f) => unlockedSet.value.has(f.name)).length
const isUnlocked = (fish) => unlockedSet.value.has(fish.name)

function openFish(fish) {
  if (!isUnlocked(fish)) return
  selected.value = fish
}

async function load() {
  try {
    const res = await meApi(username)
    if (res.code === 200) {
      shells.value = res.data.shells || 0
      power.value = res.data.power || 100
      unlocked.value = Array.isArray(res.data.codex) ? res.data.codex : []
    } else showToast(res.message || '加载失败')
  } catch (e) { showToast(e.message || '后端未启动 🌊') }
}

onMounted(load)
</script>

<template>
  <div class="codex-page">
    <OceanBackground />
    <TopBar :shells="shells" :power="power" />

    <main class="wrap">
      <div class="head">
        <h2>📖 灵鱼图鉴</h2>
        <span class="sub">钓起灵鱼，解锁它的故事</span>
      </div>

      <!-- 总收集进度 -->
      <div class="progress-card">
        <div class="progress-top">
          <span class="p-title">收集进度</span>
          <span class="p-num"><b>{{ unlockedCount }}</b> / {{ CODEX_TOTAL }}</span>
        </div>
        <div class="bar">
          <div class="bar-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <div class="p-foot">{{ progressPct }}% · 还有 {{ CODEX_TOTAL - unlockedCount }} 种灵鱼待解锁</div>
      </div>

      <!-- 按品级分组 -->
      <section v-for="g in CODEX_GROUPS" :key="g.code" class="group">
        <div class="group-head">
          <span class="tier-dot" :style="{ background: g.color, boxShadow: '0 0 10px ' + g.color }"></span>
          <h3>{{ g.label }}</h3>
          <span class="g-count">{{ groupCount(g) }}/{{ g.fish.length }}</span>
        </div>
        <div class="grid">
          <div
            v-for="fish in g.fish"
            :key="fish.name"
            class="fish-card"
            :class="{ locked: !isUnlocked(fish) }"
            :style="{ '--tier-color': g.color }"
            @click="openFish(fish)"
          >
            <template v-if="isUnlocked(fish)">
              <div class="fish-img">
                <img :src="fish.sprite" :alt="fish.name" v-if="fish.sprite">
                <span v-else class="big-emoji">🐟</span>
              </div>
              <div class="fish-name">{{ fish.name }}</div>
              <div class="fish-lore">{{ fish.lore }}</div>
            </template>
            <template v-else>
              <div class="fish-img locked-img">
                <span class="question">?</span>
              </div>
              <div class="fish-name locked-name">？？？</div>
              <div class="fish-lore">未解锁</div>
            </template>
          </div>
        </div>
      </section>
    </main>

    <!-- 详情弹层 -->
    <div v-if="selected" class="modal-mask" @click.self="selected = null">
      <div class="modal">
        <button class="close" @click="selected = null">✕</button>
        <div class="modal-art">
          <img :src="selected.sprite" :alt="selected.name" v-if="selected.sprite">
        </div>
        <div class="modal-body">
          <div class="modal-tier">{{ selected.tierName }}灵鱼</div>
          <h3>{{ selected.name }}</h3>
          <div class="divider"></div>
          <p class="story">{{ selected.story }}</p>
          <div class="lore-box"><b>典籍 · </b>{{ selected.lore }}</div>
        </div>
      </div>
    </div>

    <ToastMessage :message="toastMessage" :visible="toastVisible" />
  </div>
</template>

<style scoped>
.codex-page { position: relative; min-height: 100vh; color: #eaf6ff; }
.wrap { position: relative; z-index: 1; max-width: 1000px; margin: 0 auto; padding: 20px 16px 60px; }
.head { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
.head h2 { margin: 0; font-size: 26px; letter-spacing: 2px; color: #ffd54f; text-shadow: 0 2px 8px rgba(0,0,0,.5); }
.head .sub { font-size: 13px; color: #b3d9ff; }

/* 进度卡 */
.progress-card {
  background: linear-gradient(120deg, rgba(30,26,60,.85), rgba(16,14,38,.88));
  border: 1px solid rgba(212,175,55,.45); border-radius: 16px; padding: 16px 20px; margin-bottom: 22px;
  box-shadow: 0 10px 28px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);
}
.progress-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.p-title { font-size: 15px; font-weight: bold; color: #ffe6a8; letter-spacing: 1px; }
.p-num { font-size: 15px; color: #b3d9ff; }
.p-num b { font-size: 22px; color: #ffd54f; }
.bar { height: 12px; border-radius: 8px; background: rgba(0,0,0,.4); overflow: hidden; border: 1px solid rgba(255,255,255,.12); }
.bar-fill { height: 100%; border-radius: 8px; background: linear-gradient(90deg, #66bb6a, #ffd54f, #ffa726); transition: width .5s ease; box-shadow: 0 0 12px rgba(255,213,79,.5); }
.p-foot { font-size: 12px; color: #9fc3e8; margin-top: 8px; }

/* 分组 */
.group { margin-bottom: 26px; }
.group-head { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
.tier-dot { width: 11px; height: 11px; border-radius: 50%; }
.group-head h3 { margin: 0; font-size: 18px; color: #fff; letter-spacing: 1px; }
.g-count { font-size: 13px; color: #9fc3e8; margin-left: 4px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }

.fish-card {
  position: relative; border-radius: 14px; padding: 12px 10px 14px; cursor: pointer; text-align: center;
  background: linear-gradient(165deg, rgba(38,34,72,.78), rgba(16,14,38,.85));
  border: 1px solid var(--tier-color); box-shadow: 0 8px 20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06);
  transition: transform .15s, box-shadow .15s;
}
.fish-card:hover { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(0,0,0,.5), 0 0 16px var(--tier-color); }
.fish-img { height: 108px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.fish-img img { max-height: 104px; max-width: 100%; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,.5)); }
.big-emoji { font-size: 54px; }
.fish-name { font-size: 15px; font-weight: bold; color: #fff; margin-bottom: 4px; }
.fish-lore { font-size: 11px; color: #a9c8e8; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.fish-card.locked { cursor: default; border-color: rgba(255,255,255,.12); background: linear-gradient(165deg, rgba(30,28,50,.6), rgba(14,12,28,.7)); }
.fish-card.locked:hover { transform: none; box-shadow: 0 8px 20px rgba(0,0,0,.35); }
.locked-img { filter: grayscale(1); opacity: .45; }
.question { font-size: 56px; font-weight: bold; color: #7d8ba3; text-shadow: 0 0 20px rgba(255,255,255,.15); }
.locked-name { color: #8a97ad; }

/* 详情弹层 */
.modal-mask { position: fixed; inset: 0; z-index: 100; background: rgba(4,6,18,.72); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal {
  position: relative; width: min(760px, 96vw); max-height: 90vh; overflow: auto;
  display: flex; gap: 0; flex-wrap: wrap;
  background: linear-gradient(135deg, rgba(34,28,66,.96), rgba(14,12,34,.98));
  border: 1px solid rgba(212,175,55,.55); border-radius: 20px;
  box-shadow: 0 30px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.08), 0 0 40px rgba(120,90,200,.25);
}
.close { position: absolute; top: 12px; right: 14px; z-index: 2; background: rgba(255,255,255,.12); border: none; color: #fff; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 15px; }
.close:hover { background: rgba(255,255,255,.25); }
.modal-art { flex: 0 0 280px; min-height: 320px; display: flex; align-items: center; justify-content: center; padding: 20px; background: radial-gradient(circle at 50% 40%, rgba(120,100,200,.16), transparent 70%); }
.modal-art img { max-height: 380px; max-width: 100%; object-fit: contain; filter: drop-shadow(0 12px 24px rgba(0,0,0,.6)); }
.modal-body { flex: 1; min-width: 240px; padding: 34px 26px 30px 6px; }
.modal-tier { font-size: 13px; color: #ffd54f; letter-spacing: 2px; }
.modal-body h3 { margin: 6px 0 0; font-size: 30px; color: #fff; letter-spacing: 3px; text-shadow: 0 2px 12px rgba(0,0,0,.6); }
.divider { height: 1px; background: linear-gradient(90deg, rgba(212,175,55,.7), transparent); margin: 16px 0; }
.story { font-size: 14px; line-height: 2; color: #dfe9ff; margin: 0 0 18px; }
.lore-box { font-size: 13px; line-height: 1.8; color: #b9c9e8; background: rgba(255,255,255,.06); border-left: 3px solid #ffd54f; border-radius: 8px; padding: 10px 14px; }
.lore-box b { color: #ffe6a8; }

@media (max-width: 560px) {
  .modal-art { flex-basis: 100%; min-height: 220px; }
  .modal-body { padding: 10px 22px 26px; }
}
</style>
