/**
 * 登录会话：把当前玩家存到 localStorage，用于前端路由守卫与展示。
 * 说明：本项目后端未做鉴权，这里仅做前端状态的轻量持久化。
 */
const KEY = 'bikini_session'

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function setSession(user) {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(KEY)
}
