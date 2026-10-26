<template>
  <div class="ai-assistant" :class="{ hidden }">
    <!-- 悬浮按钮 -->
    <button class="ai-fab" :class="{ active: aiState.open }" type="button" @click="toggle">
      <span class="face">🧽</span>
      <span v-if="aiState.unread" class="badge">{{ aiState.unread > 9 ? '9+' : aiState.unread }}</span>
    </button>

    <!-- 对话面板 -->
    <transition name="pop">
      <section v-if="aiState.open" class="ai-panel">
        <header>
          <div class="who">
            <span class="avatar">🧽</span>
            <div>
              <strong>海绵宝宝助手</strong>
              <small>离线可用 · 比奇堡本地知识</small>
            </div>
          </div>
          <button class="close" type="button" title="收起" @click="closeAssistant">×</button>
        </header>

        <div ref="listEl" class="messages">
          <div v-for="m in aiState.messages" :key="m.id" class="msg" :class="m.role">
            <span class="bubble">{{ m.text }}</span>
          </div>
          <div v-if="aiState.thinking" class="msg bot">
            <span class="bubble typing"><i></i><i></i><i></i></span>
          </div>
          <p v-if="!aiState.messages.length" class="empty">问我点关于钓鱼的问题吧 🎣</p>
        </div>

        <div class="quick">
          <button v-for="d in dialogs" :key="d.id" type="button" @click="ask(d.scene)">{{ d.scene }}</button>
        </div>

        <form class="composer" @submit.prevent="send">
          <input v-model="draft" type="text" maxlength="60" placeholder="和海绵宝宝说点什么…" />
          <button type="submit" :disabled="!draft.trim()">发送</button>
        </form>
      </section>
    </transition>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { aiState, toggleAssistant, closeAssistant, greetOnce, pushBot, pushUser } from '../store/aiAssistant'
import { aiDialogsApi, aiChatApi } from '../api/game'
import { getSession } from '../store/session'

const route = useRoute()
const draft = ref('')
const dialogs = ref([])
const listEl = ref(null)

const QUICK = ['怎么玩', '力量', '金石', '巨物', '存档']

async function loadDialogs() {
  try {
    const res = await aiDialogsApi()
    if (res.code === 200) {
      dialogs.value = res.data.slice(0, 6)
      return
    }
  } catch {
    /* 离线也不该失败，兜底用内置关键词 */
  }
  dialogs.value = QUICK.map((s, i) => ({ id: i + 1, scene: s, reply: '' }))
}

async function ask(text) {
  const msg = String(text || '').trim()
  if (!msg || aiState.thinking) return
  pushUser(msg)
  aiState.thinking = true
  try {
    const session = getSession()
    const res = await aiChatApi(session ? session.username : 'guest', msg)
    const reply =
      res && res.code === 200 && res.data && res.data.reply
        ? res.data.reply
        : '唔…这个问题我还没学会，先专心钓鱼吧 🎣'
    pushBot(reply)
  } catch {
    pushBot('唔…我没听清，再说一遍好吗 🐙')
  } finally {
    aiState.thinking = false
  }
}

function send() {
  const text = draft.value
  draft.value = ''
  ask(text)
}

function toggle() {
  toggleAssistant()
  if (aiState.open) {
    greetOnce()
    loadDialogs()
  }
}

watch(
  () => [aiState.messages.length, aiState.open, aiState.thinking],
  async () => {
    await nextTick()
    if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
  }
)

// 登录页 / 注册页不显示助手
const hidden = ref(false)
watch(
  () => route.path,
  (p) => {
    hidden.value = p === '/' || p === '/register'
    if (hidden.value) closeAssistant()
  },
  { immediate: true }
)

onMounted(() => {
  loadDialogs()
  greetOnce()
})
</script>

<style scoped>
.ai-assistant {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 60;
  display: contents;
}

/* 登录/注册页隐藏 */
.ai-assistant.hidden { display: none; }

.ai-fab {
  position: fixed;
  right: 22px;
  bottom: 22px;
  width: 62px;
  height: 62px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  background: radial-gradient(circle at 35% 28%, #ffe94d, #f6c800 62%, #d9a400);
  box-shadow: 0 10px 24px rgba(0, 60, 100, 0.35), inset 0 -4px 0 rgba(0, 0, 0, 0.12);
  display: grid;
  place-items: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  animation: bob 3.4s ease-in-out infinite;
}
.ai-fab:hover { transform: translateY(-3px) scale(1.04); }
.ai-fab.active { animation: none; transform: scale(0.94); }
.ai-fab .face { font-size: 28px; line-height: 1; }
.ai-fab .badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: #ff5252;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.ai-panel {
  position: fixed;
  right: 22px;
  bottom: 96px;
  width: 340px;
  max-height: min(66vh, 560px);
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
  background: #f4fbff;
  border: 3px solid #ffd633;
  box-shadow: 0 22px 48px rgba(0, 46, 82, 0.35);
}

.ai-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #ffe14d, #ffc400);
  color: #10344f;
}
.ai-panel .who { display: flex; align-items: center; gap: 9px; }
.ai-panel .avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 19px;
  background: rgba(255, 255, 255, 0.7);
}
.ai-panel .who strong { display: block; font-size: 14px; line-height: 1.2; }
.ai-panel .who small { font-size: 11px; opacity: 0.75; }
.ai-panel .close {
  border: none;
  background: rgba(255, 255, 255, 0.55);
  color: #10344f;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
}
.ai-panel .close:hover { background: #fff; }

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  background:
    radial-gradient(circle at 88% 8%, rgba(79, 195, 247, 0.22), transparent 55%),
    radial-gradient(circle at 6% 92%, rgba(41, 182, 246, 0.18), transparent 50%),
    #f7fcff;
}
.msg { display: flex; }
.msg.user { justify-content: flex-end; }
.msg .bubble {
  max-width: 84%;
  padding: 8px 11px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #10344f;
  background: #fff;
  box-shadow: 0 2px 8px rgba(2, 60, 100, 0.1);
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.bot .bubble { border-bottom-left-radius: 5px; border: 2px solid #cdeaff; }
.msg.user .bubble {
  color: #08324d;
  background: linear-gradient(135deg, #b3ecff, #8fdcff);
  border-bottom-right-radius: 5px;
}
.empty { text-align: center; color: #7aa8c0; font-size: 12px; margin-top: 14px; }

.typing { display: inline-flex; gap: 4px; align-items: center; }
.typing i {
  width: 6px; height: 6px; border-radius: 50%;
  background: #58b6dd; opacity: 0.7;
  animation: blink 1s infinite ease-in-out;
}
.typing i:nth-child(2) { animation-delay: 0.15s; }
.typing i:nth-child(3) { animation-delay: 0.3s; }

.quick {
  display: flex;
  gap: 6px;
  padding: 8px 10px 0;
  overflow-x: auto;
  background: #f7fcff;
}
.quick button {
  flex: none;
  border: 2px solid #bfe8ff;
  background: #fff;
  color: #1b6f96;
  font-size: 12px;
  padding: 4px 9px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
}
.quick button:hover { background: #e6f7ff; border-color: #7cc9ee; }

.composer {
  display: flex;
  gap: 7px;
  padding: 10px;
  background: #f7fcff;
}
.composer input {
  flex: 1;
  min-width: 0;
  border: 2px solid #bfe8ff;
  border-radius: 12px;
  padding: 8px 11px;
  font-size: 13px;
  font-family: inherit;
  color: #10344f;
  background: #fff;
  outline: none;
}
.composer input:focus { border-color: #58b6dd; box-shadow: 0 0 0 3px rgba(88, 182, 221, 0.18); }
.composer button {
  border: none;
  border-radius: 12px;
  padding: 0 15px;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  color: #10344f;
  background: linear-gradient(135deg, #ffe14d, #ffc400);
  cursor: pointer;
}
.composer button:disabled { opacity: 0.5; cursor: not-allowed; }

.pop-enter-active, .pop-leave-active { transition: all 0.18s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(12px) scale(0.96); }

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
@keyframes blink {
  0%, 100% { opacity: 0.25; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

@media (max-width: 520px) {
  .ai-panel { right: 10px; left: 10px; width: auto; bottom: 88px; }
  .ai-fab { right: 14px; bottom: 14px; }
}
</style>
