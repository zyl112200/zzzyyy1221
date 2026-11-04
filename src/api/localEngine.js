/**
 * 离线本地游戏引擎（纯浏览器端）
 * ---------------------------------------------------------------
 * 目的：让项目在「没有后端 / 没有网络」的情况下也能完整游玩。
 * 它按后端 GameService / UserService 的规则实现了同一套接口，
 * 数据持久化在浏览器 localStorage，接口返回结构与 Spring Boot 的
 * 统一返回体 { code, message, data } 完全一致，因此前端所有页面
 * 无需任何改动即可切换「本地模式 / 后端模式」。
 *
 * 与后端一一对应的接口：
 *   POST /api/auth/register   POST /api/auth/login
 *   GET  /api/game/me         POST /api/game/cast
 *   POST /api/game/settle     POST /api/game/train
 *   POST /api/game/realm-up   POST /api/game/equip
 *   GET  /api/shop/items      POST /api/shop/buy
 *   POST /api/game/ai-dialogs POST /api/game/ai-chat
 */
import { SHOP_ITEMS, ITEM_MAP } from '../data/items.js'
import { getAdminConfig } from '../admin/store.js'
import { SKILLS, SKILL_MAP, SKILL_LEVEL_MAX, skillPower, realmLabel, levelGoldCost, heavenShellCost } from '../data/skills.js'

const DB_KEY = 'bikini_local_db_v3'

/**
 * 读取后台配置的「安全壳」：后台管理配置存于独立的 localStorage 命名空间，
 * 即使读取失败也回退为 null，不影响游戏本身逻辑。
 */
function safeAdminConfig() {
  try {
    const res = getAdminConfig()
    return res && res.code === 200 ? res.data : null
  } catch {
    return null
  }
}

// ============================================================
//  存储层（localStorage 不可用时（隐私模式 / 严格 file://）退化为内存）
// ============================================================
let memoryDb = null

function readDb() {
  if (memoryDb) return memoryDb
  let raw = null
  try {
    raw = localStorage.getItem(DB_KEY)
  } catch {
    raw = null
  }
  if (raw) {
    try {
      memoryDb = JSON.parse(raw)
      return memoryDb
    } catch {
      /* 数据损坏则重建 */
    }
  }
  memoryDb = seedDb()
  persist()
  return memoryDb
}

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(memoryDb))
  } catch {
    /* 写入失败就只在内存里玩，不影响游戏 */
  }
}

// 说明：按需求，用户密码采用明文存储，不做任何加密处理。

function seedDb() {
  const db = {
    version: 3,
    nextUserId: 4,
    nextUserItemId: 7,
    // permission: 0 = 管理员权限（可进后台）；1 = 默认权限（普通玩家，无后台权限）
    users: [
      { id:1, username:'admin', email:'admin@bikini.bottom', password:'admin123', permission:0, shells:0, strength:10, goldStones:0, powerRealm:1, skills:[], createTime:'2024-06-01T08:00:00.000Z' },
      { id:2, username:'spongebob', email:'spongebob@bikini.bottom', password:'123456', permission:1, shells:200000, strength:10, goldStones:200, powerRealm:1, skills:[], createTime:'2024-06-02T09:30:00.000Z' },
      { id:3, username:'patrick', email:'patrick@bikini.bottom', password:'123456', permission:1, shells:50, strength:10, goldStones:0, powerRealm:1, skills:[], createTime:'2024-06-03T10:15:00.000Z' }
    ],
    userItems: [
      { id: 1, userId: 1, itemId: 1, quantity: 1, equipped: 1 },
      { id: 2, userId: 1, itemId: 5, quantity: 5, equipped: 0 },
      { id: 3, userId: 2, itemId: 1, quantity: 1, equipped: 1 },
      { id: 4, userId: 2, itemId: 5, quantity: 5, equipped: 0 },
      { id: 5, userId: 3, itemId: 1, quantity: 1, equipped: 1 },
      { id: 6, userId: 3, itemId: 5, quantity: 5, equipped: 0 }
    ]
  }
  return db
}

/** 清空本地存档（前端「重置存档」按钮用） */
export function resetLocalSave() {
  memoryDb = seedDb()
  pending.clear()
  persist()
}

// ============================================================
//  工具
// ============================================================
const ok = (data, message = 'success') => ({ code: 200, message, data })
const err = (message) => ({ code: 400, message, data: null })

const rand = (n) => Math.floor(Math.random() * n)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const round2 = (v) => Math.round(v * 100) / 100
const round1 = (v) => Math.round(v * 10) / 10

function userByName(name) {
  const db = readDb()
  return db.users.find((u) => u.username === name) || null
}

/**
 * 读取用户功法境界表：{ 功法id: 等级 1..54 }。
 * 旧存档为 id 数组（无境界体系时的「已修炼」列表），自动迁移为
 * 一重天·入门（1 级，效果与旧版持平）；非法 / 缺省回退为空对象。
 */
function userSkillMap(u) {
  const raw = u && u.skills
  if (Array.isArray(raw)) {
    const m = {}
    for (const id of raw) if (SKILL_MAP.has(id)) m[id] = 1
    return m
  }
  return raw && typeof raw === 'object' ? raw : {}
}

/** 某功法当前等级（0 = 未修炼） */
function skillLevel(u, id) {
  const lv = userSkillMap(u)[id]
  return Number.isFinite(lv) ? lv : 0
}

/** 功法效果强度（0 = 未修炼；数值语义由各 skillId 的消费方解释） */
function skillVal(u, id) {
  const lv = skillLevel(u, id)
  return lv > 0 ? skillPower(SKILL_MAP.get(id), lv) : 0
}

/** 无钩钓法：境界突破贝壳消耗折扣系数（无此功法则 1） */
function wugouCostFactor(u) {
  const v = skillVal(u, 'wugou')
  return v > 0 ? 1 - v / 100 : 1
}

function ownedOf(userId) {
  return readDb().userItems.filter((ui) => ui.userId === userId)
}

function findFirst(userId, itemId) {
  const list = ownedOf(userId).filter((ui) => ui.itemId === itemId)
  return list.length ? list[0] : null
}

const REALM_MAX = 999
const REALM_BONUS_PER_LEVEL = 5

function realmNextCost(realm) {
  if (realm >= REALM_MAX) return 0
  // 每次升级线性递增 100：realm→realm+1 需 100 × realm 贝壳（100→200→300…）
  return 100 * realm
}

// ============================================================
//  品级 / 鱼池（与后端 GameService 保持一致）
// ============================================================
const TIERS = {
  COMMON: { code: 'COMMON', label: '普通', minW: 0.5, maxW: 8, shellMul: 1.0, goldMul: 0.6, berserkBase: 0.05, baseWeight: 60 },
  RARE: { code: 'RARE', label: '稀有', minW: 15, maxW: 300, shellMul: 2.5, goldMul: 1.5, berserkBase: 0.22, baseWeight: 24 },
  LEGENDARY: { code: 'LEGENDARY', label: '传说', minW: 300, maxW: 8000, shellMul: 6, goldMul: 3.5, berserkBase: 0.42, baseWeight: 10 },
  MYTHIC: { code: 'MYTHIC', label: '神话', minW: 5000, maxW: 120000, shellMul: 15, goldMul: 8, berserkBase: 0.65, baseWeight: 4 },
  SHANHAI: { code: 'SHANHAI', label: '山海', minW: 20000, maxW: 1000000, shellMul: 30, goldMul: 15, berserkBase: 0.85, baseWeight: 1 }
}
const TIER_ORDER = ['COMMON', 'RARE', 'LEGENDARY', 'MYTHIC', 'SHANHAI']

const POOLS = {
  COMMON: [
    { name: '小丑鱼', icon: '🐠', lore: '比奇堡最常见的邻居，颜色鲜艳。' },
    { name: '热带鱼', icon: '🐟', lore: '礁石间穿梭的小精灵。' },
    { name: '河豚', icon: '🐡', lore: '一生气就鼓成一颗刺球。' },
    { name: '沙丁鱼', icon: '🐟', lore: '成群结队地游过码头。' },
    { name: '鲭鱼', icon: '🐟', lore: '速度极快的洄游鱼。' }
  ],
  RARE: [
    { name: '章鱼', icon: '🐙', lore: '八条腕足力大无穷，吸盘能拽住礁石。' },
    { name: '鱿鱼', icon: '🦑', lore: '深海中的敏捷猎手，喷墨而逃。' },
    { name: '帝王蟹', icon: '🦀', lore: '甲壳厚如铠甲，钳力惊人。' },
    { name: '巨型石斑', icon: '🐟', lore: '礁石缝里的伏击者，体重惊人。' },
    { name: '电鳗', icon: '⚡', lore: '一尾十万伏特，靠近就发麻。' }
  ],
  LEGENDARY: [
    { name: '深海龙鱼', icon: '🐉', lore: '深渊尽头的一点幽光，传说是龙的幼崽。' },
    { name: '独角鲸', icon: '🐋', lore: '额前长角，传说能破开冰层。' },
    { name: '黄金海马', icon: '👑', lore: '蟹老板做梦都想收藏的稀世珍宝。' },
    { name: '大王乌贼', icon: '🦑', lore: '能与巨鲸搏斗的深海巨兽。' },
    { name: '幽灵鲨', icon: '🦈', lore: '只在月圆之夜浮出水面。' }
  ],
  MYTHIC: [
    { name: '鲲', icon: '🐋', lore: '《庄子·逍遥游》：北冥有鱼，其名为鲲，鲲之大，不知其几千里也。' },
    { name: '烛龙', icon: '🐲', lore: '《山海经》：钟山之神，视为昼，瞑为夜，吹为冬，呼为夏。' },
    { name: '九尾狐', icon: '🦊', lore: '《山海经》：青丘之山，有兽焉，其状如狐而九尾。' },
    { name: '白泽', icon: '🦄', lore: '通晓万物之情的神兽，知天下鬼神之名。' },
    { name: '凤凰', icon: '🔥', lore: '浴火重生的百鸟之王，见则天下安宁。' },
    { name: '麒麟', icon: '🦌', lore: '祥瑞之兽，踏云而行，不履生虫。' }
  ],
  SHANHAI: [
    { name: '鲲鹏', icon: '🦅', lore: '《逍遥游》：化而为鸟，其名为鹏，其翼若垂天之云。' },
    { name: '饕餮', icon: '👹', lore: '《山海经》：羊身人面，虎齿人爪，贪食无厌。' },
    { name: '穷奇', icon: '🐯', lore: '《山海经》：状如虎而有翼，音如嗥狗。' },
    { name: '相柳', icon: '🐍', lore: '《山海经》：九首蛇身，所到之处化为沼泽。' },
    { name: '玄武', icon: '🐢', lore: '龟蛇合体，镇守北方之神。' },
    { name: '应龙', icon: '🐉', lore: '有翼之龙，助黄帝斩蚩尤，蓄水为雨。' },
    { name: '巴蛇', icon: '🐍', lore: '《山海经》：巴蛇食象，三年而出其骨。' },
    { name: '陵鱼', icon: '🧜', lore: '《山海经》：人面鱼身，居于海中。' },
    { name: '帝江', icon: '🦋', lore: '《山海经》：状如黄囊，赤如丹火，六足四翼。' },
    { name: '狰', icon: '🐆', lore: '《山海经》：五尾一角，音如击石。' }
  ]
}

// ============================================================
//  档案构建
// ============================================================
function ensureStarterRod(userId) {
  const db = readDb()
  const owned = db.userItems.filter((ui) => ui.userId === userId)
  for (const ui of owned) {
    const it = ITEM_MAP.get(ui.itemId)
    if (it && it.type === 'ROD' && (ui.quantity || 0) > 0) return
  }
  const rod = findFirst(userId, 1)
  if (rod) {
    rod.quantity = 1
    rod.equipped = 1
  } else {
    db.userItems.push({ id: db.nextUserItemId++, userId, itemId: 1, quantity: 1, equipped: 1 })
  }
  persist()
}

function claimReliefBait(userId) {
  const db = readDb()
  const bait = findFirst(userId, 5)
  if (bait) bait.quantity = 3
  else db.userItems.push({ id: db.nextUserItemId++, userId, itemId: 5, quantity: 3, equipped: 0 })
  persist()
}

function buildProfile(u) {
  const owned = ownedOf(u.id)
  const inventory = []
  let totalBait = 0
  let luckOwned = false
  let equippedRod = null
  let equippedLine = null

  for (const ui of owned) {
    const it = ITEM_MAP.get(ui.itemId)
    if (!it) continue
    const qty = ui.quantity || 0
    if (it.type === 'BAIT') totalBait += qty
    if (it.type === 'LUCK' && qty > 0) luckOwned = true
    const equipped = ui.equipped === 1
    if (it.type === 'ROD' && equipped) equippedRod = it
    if (it.type === 'LINE' && equipped) equippedLine = it

    inventory.push({
      userItemId: ui.id,
      itemId: it.id,
      name: it.name,
      type: it.type,
      icon: it.icon,
      price: it.price,
      power: it.power,
      lineStrength: it.lineStrength,
      maxCatchWeight: it.maxCatchWeight,
      description: it.description,
      quantity: qty,
      equipped: ui.equipped || 0
    })
  }

  // 没有显式装备时自动选用最强的一件
  if (!equippedRod) {
    equippedRod =
      inventory
        .filter((d) => d.type === 'ROD' && d.quantity > 0)
        .sort((a, b) => (b.power || 0) - (a.power || 0))
        .map((d) => ITEM_MAP.get(d.itemId))[0] || null
  }
  if (!equippedLine) {
    equippedLine =
      inventory
        .filter((d) => d.type === 'LINE' && d.quantity > 0)
        .sort((a, b) => (b.lineStrength || 0) - (a.lineStrength || 0))
        .map((d) => ITEM_MAP.get(d.itemId))[0] || null
  }

  const rodLine = equippedRod ? equippedRod.lineStrength || 0 : 0
  const lineLine = equippedLine ? equippedLine.lineStrength || 0 : 0
  const rodMax = equippedRod ? equippedRod.maxCatchWeight || 0 : 0
  const lineMax = equippedLine ? equippedLine.maxCatchWeight || 0 : 0
  const realm = u.powerRealm == null ? 1 : u.powerRealm

  return {
    username: u.username,
    shells: u.shells == null ? 0 : u.shells,
    goldStones: u.goldStones == null ? 0 : u.goldStones,
    strength: u.strength == null ? 10 : u.strength,
    powerRealm: realm,
    skills: userSkillMap(u),
    nextRealmCost: (() => {
      let nrc = realmNextCost(realm)
      if (nrc > 0 && nrc < Number.MAX_SAFE_INTEGER) nrc = Math.round(nrc * wugouCostFactor(u))
      return nrc || null
    })(),
    realmBonusPct: (realm - 1) * REALM_BONUS_PER_LEVEL,
    equippedRodName: equippedRod ? equippedRod.name : '无',
    equippedRodPower: equippedRod ? equippedRod.power || 0 : 0,
    equippedLineName: equippedLine ? equippedLine.name : '无',
    lineStrength: Math.max(rodLine, lineLine),
    maxCatchWeight: Math.max(rodMax, lineMax) || 800,
    totalBait,
    luckOwned,
    inventory
  }
}

// ============================================================
//  钓鱼：抛竿 / 结算
// ============================================================
const pending = new Map()
const ENCOUNTER_TTL = 10 * 60 * 1000

function pickTier(maxCatch, rodPower, luck, premium, skillLuck = 1) {
  const luckFactor = 1 + rodPower * 0.12 + (luck ? 0.5 : 0) + (premium ? 0.35 : 0)
  // 后台可覆盖各品级的爆率权重
  const admin = safeAdminConfig()
  const weights = []
  let total = 0
  for (const code of TIER_ORDER) {
    const t = TIERS[code]
    if (t.minW > maxCatch) continue // 装备承重够不到这个品级
    let base = t.baseWeight
    if (admin && admin.dropRates && admin.dropRates[code] != null) base = admin.dropRates[code]
    if (code !== 'COMMON') base *= luckFactor * skillLuck
    weights.push([code, base])
    total += base
  }
  let roll = Math.random() * total
  for (const [code, w] of weights) {
    roll -= w
    if (roll <= 0) return code
  }
  return 'COMMON'
}

function sampleWeight(tier, maxCatch) {
  const t = TIERS[tier]
  const cap = Math.min(t.maxW, maxCatch)
  const low = Math.min(t.minW, cap)
  let w = low + Math.random() * (cap - low)
  if (w < 0.5) w = 0.5
  return round1(w)
}

function consumeBait(userId, baitId) {
  const db = readDb()
  let bait = null
  // 指定鱼饵优先：若指定且库存充足则用之
  if (baitId != null) {
    const target = findFirst(userId, Number(baitId))
    if (target && (target.quantity || 0) > 0) bait = target
  }
  // 未指定或指定鱼饵不足：沿用原逻辑（优先普通鱼饵，否则任意有库存鱼饵）
  if (!bait) {
    bait = findFirst(userId, 5)
    if (!bait || (bait.quantity || 0) <= 0) {
      const all = db.userItems.filter((ui) => ui.userId === userId)
      for (const ui of all) {
        const it = ITEM_MAP.get(ui.itemId)
        if (it && it.type === 'BAIT' && (ui.quantity || 0) > 0) {
          bait = ui
          break
        }
      }
    }
  }
  if (!bait) return null
  bait.quantity = (bait.quantity || 0) - 1
  persist()
  const it = ITEM_MAP.get(bait.itemId)
  return { itemId: bait.itemId, name: it ? it.name : '鱼饵', icon: it ? it.icon : '🪱', power: it ? it.power || 0 : 0 }
}

const RARE_CHEERS = [
  '🎉 哇哦！你竟把「{fish}」这等灵物钓了上来，整个仙钓界都要为你轰动啦！',
  '🌟 不得了！「{fish}」成功上岸，这可是能写进钓道传奇的鱼！',
  '🐠 稀世珍宝「{fish}」被你收入囊中，仙人见了都惊叹！',
  '👑 神话 / 山海级的「{fish}」！你这钓技，连钓圣都得拜你为师！'
]

function cast(username, baitId) {
  const u = userByName(username)
  if (!u) return err('比奇堡查无此人 🐙')
  ensureStarterRod(u.id)

  let profile = buildProfile(u)
  if (!profile.equippedRodPower) return err('你还没有钓竿，先去商店看看 🎣')
  if (profile.totalBait <= 0) {
    const shells = u.shells == null ? 0 : u.shells
    if (shells < 10) {
      claimReliefBait(u.id)
      profile = buildProfile(u)
    }
    if (profile.totalBait <= 0) return err('没有鱼饵了，去商店买点 🪱')
  }

  const bait = consumeBait(u.id, baitId)
  if (!bait) return err('该鱼饵不足或不存在，换一种或去商店买 🪱')
  const premiumBait = bait.power > 0
  const rodPower = profile.equippedRodPower
  const luck = !!profile.luckOwned
  const maxCatch = profile.maxCatchWeight || 800
  const lineStrength = profile.lineStrength || 300
  const strength = profile.strength || 10

  const tier = pickTier(maxCatch, rodPower, luck, premiumBait, skillVal(u, 'guanshui') || 1)
  const weight = sampleWeight(tier, maxCatch)
  const td = TIERS[tier]

  // 后台货币倍率（默认 1）
  const admin = safeAdminConfig()
  const shellMulAdj = admin && admin.currency ? admin.currency.shellMultiplier : 1
  const goldMulAdj = admin && admin.currency ? admin.currency.goldMultiplier : 1

  let rewardShells = Math.round(td.shellMul * (10 + 3 * Math.pow(weight, 0.75)) * (shellMulAdj || 1))
  let rewardGold = Math.max(1, Math.round(td.goldMul * Math.pow(weight, 0.45) * (goldMulAdj || 1)))

  const realm = u.powerRealm == null ? 1 : u.powerRealm
  if (realm > 1) {
    const realmMul = 1 + ((realm - 1) * REALM_BONUS_PER_LEVEL) / 100
    rewardShells = Math.round(rewardShells * realmMul)
    rewardGold = Math.round(rewardGold * realmMul)
  }

  // 钓鱼功法：引灵诀 / 钓道真解按境界线性提升收益（可叠加）
  const skillYield = (1 + skillVal(u, 'yinling') / 100) * (1 + skillVal(u, 'diaodao') / 100)
  rewardShells = Math.round(rewardShells * skillYield)
  rewardGold = Math.round(rewardGold * skillYield)

  const powerScore = 1500 + strength * 600 + rodPower * 2500
  const difficulty = clamp(weight / powerScore, 0.12, 5.0)
  const breakRisk =
    weight <= lineStrength
      ? 0.01 + (0.05 * weight) / Math.max(1, lineStrength)
      : Math.min(0.95, 0.1 + (0.65 * (weight - lineStrength)) / Math.max(1, lineStrength))
  const berserkChance = Math.min(0.95, td.berserkBase + Math.min(1, weight / Math.max(1, maxCatch)) * 0.15)

  const pool = POOLS[tier]
  const def = pool[rand(pool.length)]

  // 清理过期遭遇
  const now = Date.now()
  for (const [k, v] of pending) if (now - v.createdAt > ENCOUNTER_TTL) pending.delete(k)

  const encounterId = 'e' + now.toString(36) + Math.random().toString(36).slice(2, 8)
  pending.set(encounterId, {
    encounterId,
    username,
    fishName: def.name,
    fishIcon: def.icon,
    tier,
    tierName: td.label,
    weight,
    rewardShells,
    rewardGold,
    lore: def.lore,
    baitId: bait.itemId,
    baitName: bait.name,
    baitIcon: bait.icon,
    createdAt: now,
    settled: false
  })

  return ok({
    encounterId,
    fishName: def.name,
    fishIcon: def.icon,
    tier,
    tierName: td.label,
    weight,
    rewardShells,
    rewardGold,
    lore: def.lore,
    baitId: bait.itemId,
    baitName: bait.name,
    baitIcon: bait.icon,
    rodPower,
    lineStrength,
    maxCatchWeight: maxCatch,
    strength,
    difficulty: round2(difficulty),
    breakRisk: round2(breakRisk),
    berserkChance: round2(berserkChance),
    totalBait: profile.totalBait - 1,
    shells: profile.shells,
    goldStones: profile.goldStones,
    realmBonusPct: (realm - 1) * REALM_BONUS_PER_LEVEL,
    message: '有东西咬钩了！握紧鱼竿，开始收线！'
  })
}

function breakEquippedRod(u) {
  const db = readDb()
  const equipped = db.userItems.filter((ui) => ui.userId === u.id && ui.equipped === 1)
  const rod = equipped.find((ui) => {
    const it = ITEM_MAP.get(ui.itemId)
    return it && it.type === 'ROD'
  })
  if (!rod) return
  const q = rod.quantity == null ? 1 : rod.quantity
  if (q <= 1) db.userItems = db.userItems.filter((ui) => ui.id !== rod.id)
  else {
    rod.quantity = q - 1
    rod.equipped = 0
  }
  persist()
}

function settle({ username, encounterId, landed, breakType }) {
  if (!username || !encounterId) return err('结算参数不完整')
  const u = userByName(username)
  if (!u) return err('比奇堡查无此人 🐙')
  const pe = pending.get(encounterId)
  if (!pe || pe.username !== username) return err('这次咬钩已经跑掉了 🐟')
  if (pe.settled) return err('这条鱼已经结算过了')
  pe.settled = true
  pending.delete(encounterId)

  const bt = breakType || 'NONE'
  const r = {
    fishName: pe.fishName,
    fishIcon: pe.fishIcon,
    tier: pe.tier,
    tierName: pe.tierName,
    weight: pe.weight,
    breakType: bt,
    landed: false,
    rodBroken: false,
    rewardShells: 0,
    rewardGold: 0
  }

  if (landed) {
    u.shells = (u.shells == null ? 0 : u.shells) + pe.rewardShells
    u.goldStones = (u.goldStones == null ? 0 : u.goldStones) + pe.rewardGold
    r.landed = true
    r.rewardShells = pe.rewardShells
    r.rewardGold = pe.rewardGold
    r.message = `钓起来了！${pe.fishName} ${pe.weight} 斤，获得 ${pe.rewardShells} 🐚 与 ${pe.rewardGold} 金石 🪙`
    if (pe.tier === 'MYTHIC' || pe.tier === 'SHANHAI') {
      r.celebrateMessage = RARE_CHEERS[rand(RARE_CHEERS.length)].replace('{fish}', pe.fishName)
    }
  } else {
    if (bt === 'ROD') {
      breakEquippedRod(u)
      r.rodBroken = true
      r.message = '啪！鱼竿被暴走的巨物生生拽断，鱼跑了…快去背包换一根 🎣'
    } else if (bt === 'LINE') {
      r.message = `啪！鱼线被 ${pe.weight} 斤的力道挣断，鱼跑了…换更结实的线吧 🧵`
    } else if (bt === 'ESCAPE') {
      r.message = '提竿太慢，鱼儿脱钩溜走了 🐟'
    } else if (bt === 'TIMEOUT') {
      r.message = '收线太久，鱼儿沉底逃走了…'
    } else {
      r.message = '这条鱼还是跑掉了…'
    }
  }
  persist()

  r.shells = u.shells == null ? 0 : u.shells
  r.goldStones = u.goldStones == null ? 0 : u.goldStones
  r.strength = u.strength == null ? 10 : u.strength
  const realm = u.powerRealm == null ? 1 : u.powerRealm
  r.realmBonusPct = (realm - 1) * REALM_BONUS_PER_LEVEL
  return ok(r)
}

// ============================================================
//  成长：力量 / 境界
// ============================================================
function train(username) {
  const u = userByName(username)
  if (!u) return err('比奇堡查无此人 🐙')
  const strength = u.strength == null ? 10 : u.strength
  const gold = u.goldStones == null ? 0 : u.goldStones
  const cost = 20 + strength * 2
  if (gold < cost) return err(`金石不足，升级需要 ${cost} 金石 🪙（多钓稀有巨物能拿到更多）`)
  const gained = 5
  u.goldStones = gold - cost
  u.strength = strength + gained
  persist()
  return ok({
    strength: u.strength,
    cost,
    goldStones: u.goldStones,
    gained,
    message: `💪 力量 +${gained}！现在能更稳地拉起巨物了`
  })
}

function realmUp(username) {
  const u = userByName(username)
  if (!u) return err('比奇堡查无此人 🐙')
  const realm = u.powerRealm == null ? 1 : u.powerRealm
  if (realm >= REALM_MAX) return err('钓道境界已臻至 999 重天巅峰，无需再突破 ✨')
  let cost = realmNextCost(realm)
  if (cost > 0 && cost < Number.MAX_SAFE_INTEGER) cost = Math.round(cost * wugouCostFactor(u))
  const shells = u.shells == null ? 0 : u.shells
  if (shells < cost) return err(`贝壳不足，突破到 ${realm + 1} 重天需要 ${cost} 🐚`)
  u.shells = shells - cost
  u.powerRealm = realm + 1
  persist()
  const bonus = (u.powerRealm - 1) * REALM_BONUS_PER_LEVEL
  let next = realmNextCost(u.powerRealm)
  if (next > 0 && next < Number.MAX_SAFE_INTEGER) next = Math.round(next * wugouCostFactor(u))
  return ok({
    powerRealm: u.powerRealm,
    cost,
    shells: u.shells,
    goldStones: u.goldStones == null ? 0 : u.goldStones,
    realmBonusPct: bonus,
    nextRealmCost: next > 0 ? next : null,
    message: `🌟 突破！力量境界升至 ${u.powerRealm} 重天，钓鱼收益 +${bonus}%`
  })
}

// 根骨一键修炼：耗尽金石，能升几级升几级
function trainAll(username) {
  const u = userByName(username)
  if (!u) return err('比奇堡查无此人 🐙')
  let strength = u.strength == null ? 10 : u.strength
  let gold = u.goldStones == null ? 0 : u.goldStones
  let times = 0
  let totalCost = 0
  while (true) {
    const cost = 20 + strength * 2
    if (gold < cost) break
    gold -= cost
    strength += 5
    totalCost += cost
    times++
  }
  if (times === 0) return err(`金石不足，至少需 ${20 + strength * 2} 金石 🪙`)
  u.goldStones = gold
  u.strength = strength
  persist()
  return ok({
    strength: u.strength,
    cost: totalCost,
    goldStones: u.goldStones,
    gained: times * 5,
    message: `💪 连修 ${times} 次！根骨 +${times * 5}，金石耗尽`
  })
}

// 钓道境界一键突破：耗尽贝壳，能破几重破几重
function realmUpAll(username) {
  const u = userByName(username)
  if (!u) return err('比奇堡查无此人 🐙')
  let realm = u.powerRealm == null ? 1 : u.powerRealm
  if (realm >= REALM_MAX) return err('钓道境界已臻至 999 重天巅峰，无需再突破 ✨')
  let shells = u.shells == null ? 0 : u.shells
  let times = 0
  let totalCost = 0
  while (realm < REALM_MAX) {
    let cost = realmNextCost(realm)
    if (cost > 0 && cost < Number.MAX_SAFE_INTEGER) cost = Math.round(cost * wugouCostFactor(u))
    if (shells < cost) break
    shells -= cost
    realm += 1
    totalCost += cost
    times++
  }
  if (times === 0) {
    let need = realmNextCost(realm)
    if (need > 0 && need < Number.MAX_SAFE_INTEGER) need = Math.round(need * wugouCostFactor(u))
    return err(`贝壳不足，突破到 ${realm + 1} 重天需要 ${need} 🐚`)
  }
  u.shells = shells
  u.powerRealm = realm
  persist()
  const bonus = (u.powerRealm - 1) * REALM_BONUS_PER_LEVEL
  let next = realmNextCost(u.powerRealm)
  if (next > 0 && next < Number.MAX_SAFE_INTEGER) next = Math.round(next * wugouCostFactor(u))
  return ok({
    powerRealm: u.powerRealm,
    cost: totalCost,
    shells: u.shells,
    goldStones: u.goldStones == null ? 0 : u.goldStones,
    realmBonusPct: bonus,
    nextRealmCost: next > 0 ? next : null,
    message: `🌟 连破 ${times} 重天！钓道境界升至 ${u.powerRealm} 重天，收益 +${bonus}%`
  })
}

// ============================================================
//  钓鱼功法：修炼 / 提升境界
// ------------------------------------------------------------
//  每部功法 54 级：一重天→九重天，每重天 入门→前期→中期→后期→巅峰→圆满。
//  提升小境界消耗金石；自某重天「圆满」突破至下一重天「入门」时另扣贝壳。
// ============================================================
function cultivate({ username, skillId }) {
  const u = userByName(username)
  if (!u) return err('查无此人，无法修炼功法')
  const def = SKILL_MAP.get(skillId)
  if (!def) return err('功法不存在，无此传承')
  const map = userSkillMap(u)
  const level = Number.isFinite(map[skillId]) ? map[skillId] : 0
  if (level >= SKILL_LEVEL_MAX) return err(`《${def.name}》已臻至九重天·圆满，进无可进 ✨`)

  const nextLevel = level + 1
  const goldCost = levelGoldCost(def, level)
  const shellCost = heavenShellCost(nextLevel)

  const gold = u.goldStones == null ? 0 : u.goldStones
  if (gold < goldCost) return err(`金石不足，提升《${def.name}》需要 ${goldCost} 金石 🪙`)
  const shells = u.shells == null ? 0 : u.shells
  if (shells < shellCost) return err(`贝壳不足，突破《${def.name}》至下一重天需要 ${shellCost} 贝壳 🐚`)

  u.goldStones = gold - goldCost
  u.shells = shells - shellCost
  map[skillId] = nextLevel
  u.skills = map
  persist()

  const label = realmLabel(nextLevel)
  const message =
    shellCost > 0
      ? `🌟 突破！《${def.name}》迈入${label}（消耗 ${goldCost} 金石 + ${shellCost} 贝壳）`
      : level === 0
        ? `📜 成功修炼《${def.name}》，当前${label}！`
        : `📜 《${def.name}》境界提升：${label}！`
  return ok(
    { goldStones: u.goldStones, shells: u.shells, skills: userSkillMap(u), level: nextLevel },
    message
  )
}

// ============================================================
//  商店：目录 / 购买 / 装备
// ============================================================
function shopItems() {
  return ok(SHOP_ITEMS.slice().sort((a, b) => a.sort - b.sort))
}

function buy(username, itemId, quantity) {
  let qty = Number(quantity)
  if (!qty || qty < 1) qty = 1
  const u = userByName(username)
  if (!u) return err('比奇堡查无此人 🐙')
  const item = ITEM_MAP.get(Number(itemId))
  if (!item) return err('商店里没有这件商品')
  const cost = item.price * qty
  const shells = u.shells == null ? 0 : u.shells
  if (shells < cost) return err('贝壳不够啦，先去钓鱼赚点 🐚')

  u.shells = shells - cost
  const db = readDb()

  const hasEquipped = db.userItems.some((ui) => ui.userId === u.id && ui.equipped === 1)
  const existing = findFirst(u.id, item.id)
  if (existing) {
    existing.quantity = (existing.quantity || 0) + qty
  } else {
    const autoEquip = (item.type === 'ROD' || item.type === 'LINE') && !hasEquipped
    db.userItems.push({
      id: db.nextUserItemId++,
      userId: u.id,
      itemId: item.id,
      quantity: qty,
      equipped: autoEquip ? 1 : 0
    })
  }
  persist()
  return ok(buildProfile(u), '购买成功 🎉')
}

function equip(username, userItemId) {
  const u = userByName(username)
  if (!u) return err('比奇堡查无此人 🐙')
  const db = readDb()
  const target = db.userItems.find((ui) => ui.id === Number(userItemId))
  if (!target || target.userId !== u.id) return err('背包里没有这件道具')
  const it = ITEM_MAP.get(target.itemId)
  if (!it || (it.type !== 'ROD' && it.type !== 'LINE')) return err('只有钓竿或鱼线工具才能装备')

  // 同类型装备全部卸下
  for (const ui of db.userItems.filter((x) => x.userId === u.id && x.equipped === 1)) {
    const other = ITEM_MAP.get(ui.itemId)
    if (other && other.type === it.type) ui.equipped = 0
  }
  target.equipped = 1
  persist()
  return ok(buildProfile(u), '已装备 ' + it.name)
}

// ============================================================
//  账号：注册 / 登录
// ============================================================
function register({ username, email, password }) {
  const name = String(username || '').trim()
  const mail = String(email || '').trim()
  if (!name || !mail || !password) return err('注册信息填写不完整哦 🐚')
  const db = readDb()
  if (db.users.some((u) => u.username === name)) return err('该用户名已被占用，海绵宝宝不答应 🍍')
  if (db.users.some((u) => u.email === mail)) return err('该邮箱已注册过，直接回菠萝屋登录吧 🐌')

  const id = db.nextUserId++
  // 新玩家初始货币：后台可配置，默认贝壳 50 / 金石 0
  const admin = safeAdminConfig()
  const starterShells = admin && admin.currency ? admin.currency.starterShells : 50
  const starterGold = admin && admin.currency ? admin.currency.starterGold : 0
  db.users.push({
    id,
    username: name,
    email: mail,
    password: password, // 按需求：明文存储，不做加密
    permission: 1, // 注册用户默认权限：1 = 默认权限（普通玩家）
    skills: [],
    shells: starterShells,
    strength: 10,
    goldStones: starterGold,
    powerRealm: 1,
    createTime: new Date().toISOString()
  })
  // 新手礼包：1 把初级钓竿（已装备）+ 5 个普通鱼饵
  db.userItems.push({ id: db.nextUserItemId++, userId: id, itemId: 1, quantity: 1, equipped: 1 })
  db.userItems.push({ id: db.nextUserItemId++, userId: id, itemId: 5, quantity: 5, equipped: 0 })
  persist()
  const u = userByName(name)
  return ok(
    { id: u.id, username: u.username, email: u.email, permission: 1, shells: u.shells, strength: u.strength, goldStones: u.goldStones, powerRealm: u.powerRealm },
    '注册成功，欢迎加入比奇堡 🎉'
  )
}

function login({ username, password }) {
  const u = userByName(String(username || '').trim())
  if (!u) return err('用户不存在，比奇堡查无此人 🐙')
  if (u.password !== password) return err('密码错误，蟹黄堡秘方可不是这个 🦀')
  return ok(
    { id: u.id, username: u.username, email: u.email, permission: u.permission, shells: u.shells, strength: u.strength, goldStones: u.goldStones, powerRealm: u.powerRealm },
    `登录成功，欢迎回到比奇堡 🎉`
  )
}

// ============================================================
//  后台鉴权（基于用户表：permission 0 = 管理员，1 = 默认/普通）
// ============================================================
/** 后台登录：必须是权限为 0（管理员）的用户才能进入后台 */
export function adminLogin({ username, password }) {
  const u = userByName(String(username || '').trim())
  if (!u || u.password !== password) {
    return { code: 400, message: '账号或密码错误 🦀', data: null }
  }
  if (u.permission !== 0) {
    return { code: 403, message: '无权限访问后台系统（当前账号不是管理员）', data: null }
  }
  return {
    code: 200,
    message: '管理员登录成功 🎉',
    data: { username: u.username, permission: u.permission, loginAt: Date.now() }
  }
}

/** 修改后台账号密码（明文，与用户表一致） */
export function changeUserPassword({ username, oldPassword, newPassword }) {
  const u = userByName(String(username || '').trim())
  if (!u) return { code: 400, message: '账号不存在' }
  if (u.password !== oldPassword) return { code: 400, message: '原密码不正确' }
  if (!newPassword || String(newPassword).length < 6) return { code: 400, message: '新密码至少 6 位' }
  u.password = newPassword
  persist()
  return { code: 200, message: '密码已修改，请重新登录' }
}

// ============================================================
//  后台用户管理（与后端 AdminUserController 接口契约保持一致）
// ============================================================
/** 脱敏：不返回明文密码 */
function sanitizeUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    permission: u.permission == null ? 1 : u.permission,
    shells: u.shells == null ? 0 : u.shells,
    strength: u.strength == null ? 10 : u.strength,
    goldStones: u.goldStones == null ? 0 : u.goldStones,
    powerRealm: u.powerRealm == null ? 1 : u.powerRealm,
    createTime: u.createTime || null
  }
}

function countAdmins() {
  return readDb().users.filter((u) => u.permission === 0).length
}

/** 用户列表（关键词 / 角色 / 分页） */
function listUsers(params = {}) {
  const db = readDb()
  let list = db.users.slice()
  const kw = String(params.keyword || '').trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (u) => u.username.toLowerCase().includes(kw) || String(u.email || '').toLowerCase().includes(kw)
    )
  }
  if (params.permission !== '' && params.permission != null) {
    list = list.filter((u) => String(u.permission) === String(params.permission))
  }
  list.sort((a, b) => a.id - b.id)
  const total = list.length
  const p = Number(params.page) > 0 ? Number(params.page) : 1
  const ps = Number(params.pageSize) > 0 ? Number(params.pageSize) : 10
  const from = Math.min((p - 1) * ps, Math.max(0, total))
  const to = Math.min(from + ps, total)
  return ok({
    list: list.slice(from, to).map(sanitizeUser),
    total,
    page: p,
    pageSize: ps
  })
}

function getUser(id) {
  const u = readDb().users.find((x) => x.id === Number(id))
  if (!u) return err('用户不存在')
  return ok(sanitizeUser(u))
}

function updateUser(b = {}) {
  const db = readDb()
  const u = db.users.find((x) => x.id === Number(b.id))
  if (!u) return err('用户不存在')
  if (b.email != null) {
    const mail = String(b.email).trim()
    if (!mail) return err('邮箱不能为空')
    if (db.users.some((x) => x.id !== u.id && x.email === mail)) return err('该邮箱已被其他用户使用')
    u.email = mail
  }
  if (b.shells != null) u.shells = clamp(Number(b.shells) || 0, 0, 1e12)
  if (b.strength != null) u.strength = clamp(Math.round(Number(b.strength) || 0), 0, 1e9)
  if (b.goldStones != null) u.goldStones = clamp(Number(b.goldStones) || 0, 0, 1e12)
  if (b.powerRealm != null) u.powerRealm = clamp(Math.round(Number(b.powerRealm) || 1), 1, 999)
  if (b.permission != null) {
    const perm = Number(b.permission) === 0 ? 0 : 1
    if (perm === 1 && u.permission === 0 && countAdmins() <= 1) {
      return err('至少需要保留一名管理员，无法降级最后一名管理员')
    }
    u.permission = perm
  }
  persist()
  return ok(sanitizeUser(u), '用户已更新')
}

function deleteUser(id) {
  const db = readDb()
  const u = db.users.find((x) => x.id === Number(id))
  if (!u) return err('用户不存在')
  if (u.permission === 0 && countAdmins() <= 1) {
    return err('至少需要保留一名管理员，无法删除最后一名管理员')
  }
  db.users = db.users.filter((x) => x.id !== u.id)
  persist()
  return ok(null, '用户已删除')
}

function resetUserPassword(id, newPassword) {
  const u = readDb().users.find((x) => x.id === Number(id))
  if (!u) return err('用户不存在')
  if (!newPassword || String(newPassword).length < 6) return err('新密码至少 6 位')
  u.password = String(newPassword) // 离线模式：明文存储，与既有约定一致
  persist()
  return ok(null, '密码已重置')
}

function createUser(b = {}) {
  const name = String(b.username || '').trim()
  const mail = String(b.email || '').trim()
  if (!name || !mail) return err('用户名和邮箱不能为空')
  if (!b.password || String(b.password).length < 6) return err('密码至少 6 位')
  const db = readDb()
  if (db.users.some((u) => u.username === name)) return err('该用户名已被占用')
  if (db.users.some((u) => u.email === mail)) return err('该邮箱已注册过')
  const id = db.nextUserId++
  const newUser = {
    id,
    username: name,
    email: mail,
    password: String(b.password), // 离线模式：明文存储
    permission: Number(b.permission) === 0 ? 0 : 1,
    shells: b.shells != null ? clamp(Number(b.shells), 0, 1e12) : 50,
    strength: b.strength != null ? clamp(Math.round(Number(b.strength)), 0, 1e9) : 10,
    goldStones: b.goldStones != null ? clamp(Number(b.goldStones), 0, 1e12) : 0,
    powerRealm: b.powerRealm != null ? clamp(Math.round(Number(b.powerRealm)), 1, 999) : 1,
    skills: [],
    createTime: new Date().toISOString()
  }
  db.users.push(newUser)
  persist()
  return ok(sanitizeUser(newUser), '创建成功')
}

// ============================================================
//  AI 助手：内置预设问答（完全离线）
// ============================================================
const AI_DIALOGS = [
  { id: 1, scene: '你好', reply: '嗨～我是比奇堡钓鱼助手海绵宝宝！有什么想知道的尽管问，钓巨物的秘诀我最懂啦 🍍' },
  { id: 2, scene: '怎么玩', reply: '先抛竿 → 浮漂点头出现「咬钩了！」时 2.2 秒内提竿 → 按住屏幕收线、松手泄力，让张力停在绿色安全区，收满 100% 就上岸啦 🎣' },
  { id: 3, scene: '断线', reply: '张力冲到 100% 鱼线就断啦。松手泄力比一直按住更稳，暴走阶段（进度 78%）尤其要小心，鱼竿可能会被拽断 🧵' },
  { id: 4, scene: '力量', reply: '力量越高，收线越稳、能抗衡的鱼越重。用金石修炼，每次 +5；贝壳可以突破力量境界，每重天永久 +5% 钓鱼收益 💪' },
  { id: 5, scene: '金石', reply: '金石靠钓稀有 / 巨物获得，越稀有越重给得越多。钓到 1000 斤以上基本能攒出一大把 🪙' },
  { id: 6, scene: '巨物', reply: '想钓十万斤、百万斤的山海巨兽，需要「螺纹钢航母阻拦索」（十万斤内不挣断）+「深渊海神竿」，两件同时装备取最大承重 🌊' },
  { id: 7, scene: '鱼饵', reply: '每次抛竿消耗 1 个鱼饵。豪华鱼饵 / 深海秘饵能显著提升稀有鱼概率，配合幸运四叶草更香 🪱' },
  { id: 8, scene: '存档', reply: '现在是离线模式，存档就在你自己的浏览器里（localStorage），换浏览器或清缓存会丢，注意备份账号密码哦 💾' }
]

function aiDialogs() {
  return ok(AI_DIALOGS.map((d) => ({ id: d.id, scene: d.scene, reply: d.reply, enabled: 1, sortOrder: d.id })))
}

function aiChat(message) {
  const msg = String(message || '')
  const hit = AI_DIALOGS.find((d) => msg.includes(d.scene))
  if (hit) return { reply: hit.reply, scene: hit.scene }
  const tips = [
    '唔…这个我还在学。不过我知道：张力别拉满，暴走要松手！🎣',
    '试试问我「怎么玩」「力量」「金石」「巨物」「存档」这些关键词吧～',
    '派大星说：钓大鱼最重要的是耐心…还有别忘了买鱼饵 🪱'
  ]
  return { reply: tips[rand(tips.length)], scene: '其他' }
}

// ============================================================
//  路由分发（供 http.js 调用）
// ============================================================
function parseUrl(url) {
  const [path, query] = String(url).split('?')
  const params = {}
  if (query) {
    for (const kv of query.split('&')) {
      const [k, v = ''] = kv.split('=')
      params[decodeURIComponent(k)] = decodeURIComponent(v)
    }
  }
  return { path, params }
}

/** 同步执行一次本地接口调用，返回统一返回体 */
export function localCall(method, url, body) {
  const { path, params } = parseUrl(url)
  const M = (method || 'GET').toUpperCase()
  const b = body || {}

  switch (path) {
    case '/api/auth/register':
      return register(b)
    case '/api/auth/login':
      return login(b)
    case '/api/game/me': {
      const u = userByName(params.username)
      if (!u) return err('比奇堡查无此人 🐙')
      ensureStarterRod(u.id)
      return ok(buildProfile(u))
    }
    case '/api/game/cast':
      return cast(b.username, b.baitId)
    case '/api/game/baits':
      return listBaits(b.username)
    case '/api/game/settle':
      return settle(b)
    case '/api/game/train':
      return train(b.username)
    case '/api/game/realm-up':
      return realmUp(b.username)
    case '/api/game/train-all':
      return trainAll(b.username)
    case '/api/game/realm-up-all':
      return realmUpAll(b.username)
    case '/api/game/equip':
      return equip(b.username, b.userItemId)
    case '/api/game/cultivate':
      return cultivate(b)
    case '/api/game/skills':
      return ok(SKILLS)
    case '/api/shop/items':
      return shopItems()
    case '/api/shop/buy':
      return buy(b.username, b.itemId, b.quantity)
    case '/api/game/ai-dialogs':
      return aiDialogs()
    case '/api/game/ai-chat':
      return ok(aiChat(b.message))
    // ---- 后台用户管理 ----
    case '/api/admin/users':
      if (M === 'GET') return listUsers(params)
      if (M === 'POST') return createUser(b)
      return err('不支持的请求方法：' + M + ' ' + path)
    case '/api/admin/users/detail':
      if (M === 'GET') return getUser(params.id)
      return err('不支持的请求方法：' + M + ' ' + path)
    case '/api/admin/users/update':
      if (M === 'POST') return updateUser(b)
      return err('不支持的请求方法：' + M + ' ' + path)
    case '/api/admin/users/delete':
      if (M === 'POST') return deleteUser(b.id)
      return err('不支持的请求方法：' + M + ' ' + path)
    case '/api/admin/users/reset-password':
      if (M === 'POST') return resetUserPassword(b.id, b.newPassword)
      return err('不支持的请求方法：' + M + ' ' + path)
    default:
      return err('离线模式暂不支持该接口：' + M + ' ' + path)
  }
}

/** 列出当前玩家拥有的鱼饵（仅返回库存 > 0 的），供「切换鱼饵」功能使用 */
export function listBaits(username) {
  const u = userByName(String(username || '').trim())
  if (!u) return { code: 400, message: '比奇堡查无此人 🐙', data: [] }
  const db = readDb()
  const owned = db.userItems.filter((ui) => ui.userId === u.id)
  const rows = []
  for (const it of SHOP_ITEMS) {
    if (it.type !== 'BAIT') continue
    const own = owned.find((ui) => ui.itemId === it.id)
    const qty = own ? own.quantity || 0 : 0
    if (qty > 0) {
      rows.push({ itemId: it.id, name: it.name, icon: it.icon, power: it.power || 0, quantity: qty })
    }
  }
  // 普通鱼饵(power 0)在前，高级鱼饵在后
  rows.sort((a, b) => a.power - b.power)
  return { code: 200, message: 'success', data: rows }
}

/** 是否存在本地存档（用于首页提示） */
export function hasLocalSave() {
  try {
    return !!localStorage.getItem(DB_KEY)
  } catch {
    return false
  }
}

export const LOCAL_DB_KEY = DB_KEY
