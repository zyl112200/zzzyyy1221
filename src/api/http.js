/**
 * 统一请求层：在线后端 / 本地引擎 双通道
 * ---------------------------------------------------------------
 * 默认为「在线模式」：页面由 HTTP 服务提供时，所有 /api 请求发往局域网后端
 * （http://192.168.68.9:8080），由 Spring Boot 处理，数据落库、多设备共享。
 *
 * 模式说明（mode：auto | server | local）：
 *   · auto（默认）：HTTP 打开 → 探测后端健康检查，通了走 server，不通自动退回 local；
 *                   file:// 直接打开 → local，不发任何网络请求。
 *   · server：强制走真实后端（后端没启动会报错并提示地址）。
 *   · local ：强制走浏览器内本地引擎（localStorage 存档）。
 *
 * 切换方式：
 *   1. 网址参数：?api=server / ?api=local（会记到 localStorage）
 *   2. 控制台：localStorage.setItem('bikini_api_mode', 'server')
 *   3. 控制台恢复自动：localStorage.removeItem('bikini_api_mode')
 *   4. 指定其它后端地址：localStorage.setItem('bikini_api_base', 'http://192.168.68.9:8080')
 */
import { localCall } from './localEngine.js'
import { BACKEND_ORIGIN, DEV_PORT, WEB_PORT } from '../config/lan.js'
import { getAdminToken } from '../admin/store.js'

const MODE_KEY = 'bikini_api_mode'
const BASE_KEY = 'bikini_api_base'
const PROBE_TIMEOUT = 1500
const PREVIEW_PORT = '4173'

/** 内网 / 本机访问这两类端口时，走同源 /api（由服务端代理到后端），不产生跨域 */
const PROXY_PORTS = new Set([String(DEV_PORT), PREVIEW_PORT, String(WEB_PORT)])

function readEnvBase() {
  try {
    return (import.meta.env && import.meta.env.VITE_API_BASE) || ''
  } catch {
    return ''
  }
}

function store(key) {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

/** 后端根地址：优先环境变量 / 手动配置，否则按访问方式自动推断 */
export function getServerBase() {
  const custom = (readEnvBase() || store(BASE_KEY)).trim()
  if (custom) return custom.replace(/\/+$/, '')

  const { protocol, port } = window.location
  // 开发服务器 / 预览 / 在线静态站点：已内置 /api 代理
  if (protocol !== 'file:' && PROXY_PORTS.has(String(port))) return ''
  // 其它部署方式（nginx、直接打开文件等）：直连局域网后端
  return BACKEND_ORIGIN
}

/** 显式模式：'server' | 'local' | 'auto' */
export function getApiMode() {
  try {
    const q = new URLSearchParams(window.location.search).get('api')
    if (q === 'server' || q === 'local') {
      localStorage.setItem(MODE_KEY, q)
      return q
    }
    const saved = localStorage.getItem(MODE_KEY)
    if (saved === 'server' || saved === 'local') return saved
    return 'auto'
  } catch {
    return 'auto'
  }
}

export function isLocalMode() {
  return resolvedMode === 'local' || (resolvedMode === null && getApiMode() === 'local')
}

/** 探测后端是否可达（用于 auto 模式） */
function probeServer() {
  const base = getServerBase()
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), PROBE_TIMEOUT) : null
  return fetch(base + '/api/health', {
    method: 'GET',
    cache: 'no-store',
    signal: controller ? controller.signal : undefined
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => timer && clearTimeout(timer))
}

let resolvedMode = null
let resolving = null

/** 解析最终模式（auto 会做一次健康探测，结果缓存到本次会话） */
function resolveMode() {
  const explicit = getApiMode()
  if (explicit !== 'auto') {
    resolvedMode = explicit
    return Promise.resolve(explicit)
  }
  if (resolvedMode) return Promise.resolve(resolvedMode)
  if (window.location.protocol === 'file:') {
    resolvedMode = 'local'
    return Promise.resolve(resolvedMode)
  }
  if (!resolving) {
    resolving = probeServer().then((online) => {
      resolvedMode = online ? 'server' : 'local'
      resolving = null
      if (!online) {
        console.warn(
          `[仙钓大陆] 未探测到后端 ${getServerBase() || window.location.origin}，已自动切换到本地引擎。`
        )
      }
      return resolvedMode
    })
  }
  return resolving
}

function callLocal(method, url, body) {
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

function callServer(method, url, body) {
  const base = getServerBase()
  const init = { method: method.toUpperCase(), headers: {} }
  if (init.method === 'POST') {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body || {})
  }
  // 后台管理接口自动携带管理员 token（登录接口本身不需要，且此时通常还没有 token）
  if (url.startsWith('/api/admin/') && !url.endsWith('/login')) {
    const token = getAdminToken()
    if (token) init.headers['Authorization'] = 'Bearer ' + token
  }
  return fetch(base + url, init)
    .then((res) => {
      if (res.status === 401 && url.startsWith('/api/admin/')) {
        // 管理员 token 失效：清会话并回登录页，避免死循环
        try { localStorage.removeItem('bikini_admin_session') } catch { /* ignore */ }
        if (location.hash !== '#/admin') location.hash = '#/admin'
        throw new Error('管理员登录已过期，请重新登录')
      }
      if (!res.ok) throw new Error(`后端返回 ${res.status}，请查看后端日志️`)
      return res.json()
    })
    .catch((err) => {
      const target = base || window.location.origin
      throw new Error(
        `连不上后端 ${target}${url} —— 请确认后端已启动、且局域网可达（${err.message}）`
      )
    })
}

function call(method, url, body) {
  return resolveMode().then((mode) => (mode === 'local' ? callLocal(method, url, body) : callServer(method, url, body)))
}

/** POST：body 为 JSON 对象 */
export function request(url, body) {
  return call('POST', url, body)
}

/** GET：url 可带 query string */
export function get(url) {
  return call('GET', url)
}
