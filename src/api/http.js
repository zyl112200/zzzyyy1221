/**
 * 统一请求层：本地引擎 / 后端服务 双通道
 * ---------------------------------------------------------------
 * 默认走「本地离线模式」：所有 /api 请求由 src/api/localEngine.js 在浏览器内
 * 直接处理，不需要后端、不需要网络，双击 HTML 就能玩。
 *
 * 想改回真实后端（Spring Boot :8080）？三种方式任选其一：
 *   1. 网址后面加参数：?api=server
 *   2. 控制台执行：localStorage.setItem('bikini_api_mode', 'server')
 *   3. 控制台执行：localStorage.removeItem('bikini_api_mode')  ← 恢复离线
 */
import { localCall } from './localEngine.js'

const MODE_KEY = 'bikini_api_mode'
const SERVER_BASE = '' // 开发模式由 Vite 代理转发 /api → localhost:8080

/** 当前使用的通道：'local' | 'server' */
export function getApiMode() {
  try {
    const q = new URLSearchParams(window.location.search).get('api')
    if (q === 'server' || q === 'local') {
      localStorage.setItem(MODE_KEY, q)
      return q
    }
    return localStorage.getItem(MODE_KEY) === 'server' ? 'server' : 'local'
  } catch {
    return 'local'
  }
}

export function isLocalMode() {
  return getApiMode() === 'local'
}

function callServer(method, url, body) {
  const init = { method: method.toUpperCase(), headers: {} }
  if (init.method === 'POST') {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body || {})
  }
  return fetch(SERVER_BASE + url, init).then((res) => {
    if (!res.ok) throw new Error('服务器开小差了，请稍后再试 🌊')
    return res.json()
  })
}

function call(method, url, body) {
  if (getApiMode() === 'local') {
    // 用极小的异步延迟模拟网络往返，保持 loading 态的自然观感
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(localCall(method, url, body))
        } catch (e) {
          reject(e)
        }
      }, 30)
    })
  }
  return callServer(method, url, body)
}

/** POST：body 为 JSON 对象 */
export function request(url, body) {
  return call('POST', url, body)
}

/** GET：url 可带 query string */
export function get(url) {
  return call('GET', url)
}
