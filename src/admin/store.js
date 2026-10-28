/**
 * 后台管理系统 —— 本地引擎（离线，纯浏览器 localStorage）
 * ---------------------------------------------------------------
 * 职责：
 *   1) 游戏「爆率配置」与「货币数量配置」的读写，并供游戏本地引擎读取
 *   2) 后台登录会话（session）的读写
 *
 * 说明：后台管理员就是「权限字段 = 0」的游戏用户（见 localEngine.js），
 * 因此后台登录 / 改密码都走用户表（localEngine.adminLogin / changeUserPassword）；
 * 本文件只负责「配置」与「后台会话状态」，不再单独维护一套管理员账号。
 */

const CONFIG_KEY = 'bikini_admin_config'
const SESSION_KEY = 'bikini_admin_session'

/** 鱼品级展示名（与 localEngine.js 中 TIERS 保持一致） */
export const TIER_LABELS = {
  COMMON: '普通',
  RARE: '稀有',
  LEGENDARY: '传说',
  MYTHIC: '神话',
  SHANHAI: '山海'
}
export const TIER_ORDER_LIST = ['COMMON', 'RARE', 'LEGENDARY', 'MYTHIC', 'SHANHAI']

/** 默认配置：爆率为「相对权重」，货币为「倍率 + 新手初始值」 */
export const DEFAULT_CONFIG = {
  dropRates: { COMMON: 60, RARE: 24, LEGENDARY: 10, MYTHIC: 4, SHANHAI: 1 },
  currency: { shellMultiplier: 1.0, goldMultiplier: 1.0, starterShells: 50, starterGold: 0 }
}

// ---------- 工具 ----------
function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function writeJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* 写入失败仅影响管理功能，不阻断游戏 */
  }
}
function clampNum(v, lo, hi, dflt) {
  let n = Number(v)
  if (!isFinite(n)) n = dflt
  return Math.max(lo, Math.min(hi, n))
}

// ---------- 配置读写 ----------
export function getAdminConfig() {
  const saved = readJson(CONFIG_KEY)
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG))
  if (saved && saved.dropRates) Object.assign(cfg.dropRates, saved.dropRates)
  if (saved && saved.currency) Object.assign(cfg.currency, saved.currency)
  return { code: 200, message: 'success', data: cfg }
}

export function saveAdminConfig(cfg) {
  const clean = { dropRates: {}, currency: {} }
  for (const k of TIER_ORDER_LIST) {
    let v = Number(cfg?.dropRates?.[k])
    if (!isFinite(v) || v < 0) v = 0
    clean.dropRates[k] = Math.round(v)
  }
  clean.currency.shellMultiplier = clampNum(cfg?.currency?.shellMultiplier, 0, 100, 1)
  clean.currency.goldMultiplier = clampNum(cfg?.currency?.goldMultiplier, 0, 100, 1)
  clean.currency.starterShells = clampNum(cfg?.currency?.starterShells, 0, 1e12, 50)
  clean.currency.starterGold = clampNum(cfg?.currency?.starterGold, 0, 1e12, 0)
  writeJson(CONFIG_KEY, clean)
  return { code: 200, message: '配置已保存，首页数据已更新 ✅', data: clean }
}

export function resetAdminConfig() {
  try {
    localStorage.removeItem(CONFIG_KEY)
  } catch {
    /* ignore */
  }
  return { code: 200, message: '已恢复默认配置', data: JSON.parse(JSON.stringify(DEFAULT_CONFIG)) }
}

// ---------- 后台会话（仅记录已登录的管理员身份，鉴权在登录时已校验） ----------
export function getAdminSession() {
  return readJson(SESSION_KEY)
}
export function setAdminSession(session) {
  writeJson(SESSION_KEY, session)
}
export function clearAdminSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}
