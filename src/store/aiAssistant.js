/**
 * 游戏内 AI 助手（海绵宝宝）的全局状态。
 * 完全离线：对话内容来自本地预设（src/api/localEngine.js 的 AI_DIALOGS），
 * 不需要任何外部大模型接口。
 */
import { reactive } from 'vue'

export const aiState = reactive({
  open: false,
  messages: [], // { id, role: 'user' | 'bot', text, time }
  unread: 0,
  thinking: false
})

let seq = 1
const newId = () => 'm' + seq++

export function pushBot(text) {
  aiState.messages.push({ id: newId(), role: 'bot', text, time: Date.now() })
  if (!aiState.open) aiState.unread += 1
}

export function pushUser(text) {
  aiState.messages.push({ id: newId(), role: 'user', text, time: Date.now() })
}

/** 钓到神话 / 山海级巨物时，后端返回的祝贺语 → 自动唤起助手播报 */
export function aiCelebrate(text) {
  if (!text) return
  pushBot(text)
  aiState.open = true
}

export function openAssistant() {
  aiState.open = true
  aiState.unread = 0
}

export function closeAssistant() {
  aiState.open = false
}

export function toggleAssistant() {
  aiState.open = !aiState.open
  if (aiState.open) aiState.unread = 0
}

export function clearAssistant() {
  aiState.messages.splice(0, aiState.messages.length)
}

// 首次打开时的欢迎语
export function greetOnce() {
  if (aiState.messages.length) return
  pushBot('嗨～我是比奇堡钓鱼助手 🍍 张力别拉满、暴走要松手，剩下的问我！')
  aiState.unread = 0
}
