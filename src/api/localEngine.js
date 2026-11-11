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
 *   POST /api/game/settle     GET  /api/game/maps
 *   POST /api/game/equip      GET  /api/shop/items
 *   POST /api/shop/buy        POST /api/game/ai-dialogs
 *   POST /api/game/ai-chat
 */
import { SHOP_ITEMS, ITEM_MAP } from '../data/items.js'
import { getAdminConfig } from '../admin/store.js'
import { MAPS, MAP_MAP, DEFAULT_MAP, EXCLUSIVE_FISH } from '../data/maps.js'

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
      migrateDb(memoryDb)
      return memoryDb
    } catch {
      /* 数据损坏则重建 */
    }
  }
  memoryDb = seedDb()
  persist()
  return memoryDb
}

/**
 * 旧存档迁移（v3 → v4）：
 *   · strength（根骨）→ power（力量），初始 100；
 *   · 移除 powerRealm（钓道境界）与 skills（功法）字段（已取消功法与修炼）。
 */
function migrateDb(db) {
  if (!db || db.version >= 4) return
  db.version = 4
  for (const u of db.users || []) {
    if (u.power == null) u.power = u.strength != null ? u.strength : 100
    if (u.currentMap == null) u.currentMap = DEFAULT_MAP
    delete u.strength
    delete u.powerRealm
    delete u.skills
  }
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
    version: 4,
    nextUserId: 4,
    nextUserItemId: 7,
    // permission: 0 = 管理员权限（可进后台）；1 = 默认权限（普通玩家，无后台权限）
    users: [
      { id:1, username:'admin', email:'admin@bikini.bottom', password:'admin123', permission:0, shells:0, power:100, goldStones:0, currentMap:'linghu', createTime:'2024-06-01T08:00:00.000Z' },
      { id:2, username:'spongebob', email:'spongebob@bikini.bottom', password:'123456', permission:1, shells:200000, power:100, goldStones:200, currentMap:'linghu', createTime:'2024-06-02T09:30:00.000Z' },
      { id:3, username:'patrick', email:'patrick@bikini.bottom', password:'123456', permission:1, shells:50, power:100, goldStones:0, currentMap:'linghu', createTime:'2024-06-03T10:15:00.000Z' }
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

/** 玩家当前力量（力量 = 极限重量，初始 100；正常钓到的鱼约 = 力量 斤） */
function powerOf(u) {
  return u && u.power != null ? u.power : 100
}

/** 根据重量 / 力量 的倍数决定鱼品级（仅用于外观与奖励倍率） */
function tierByMul(m) {
  if (m < 1) return 'COMMON'
  if (m < 1.5) return 'RARE'
  if (m < 5) return 'LEGENDARY'
  if (m < 20) return 'MYTHIC'
  return 'SHANHAI'
}

/** 断线风险：随重量/力量 倍数上升，并受鱼线承重缓冲 */
function computeBreakRisk(weight, power, lineStrength, maxCatch) {
  const m = weight / power
  let base
  if (m <= 1) base = 0.03
  else if (m <= 1.5) base = 0.08 + (m - 1) * 0.25
  else base = 0.25 + Math.min(0.7, (m - 1.5) * 0.08)
  const factor = weight <= lineStrength ? 0.5 : 1 + ((weight - lineStrength) / Math.max(1, lineStrength)) * 0.4
  return clamp(base * factor, 0.02, 0.97)
}

function ownedOf(userId) {
  return readDb().userItems.filter((ui) => ui.userId === userId)
}

function findFirst(userId, itemId) {
  const list = ownedOf(userId).filter((ui) => ui.itemId === itemId)
  return list.length ? list[0] : null
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
    { name: '小丑鱼', icon: '🐠', lore: '灵湖最常见的灵鱼，颜色鲜艳。' },
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
    { name: '黄金海马', icon: '👑', lore: '传闻渊主做梦都想收藏的稀世珍宝。' },
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

  return {
    username: u.username,
    shells: u.shells == null ? 0 : u.shells,
    goldStones: u.goldStones == null ? 0 : u.goldStones,
    power: powerOf(u),
    assocBadge: u.assocBadge || 0,
    maxCaughtWeight: u.maxCaughtWeight || 0,
    currentMap: u.currentMap || DEFAULT_MAP,
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

// 抛竿时根据「当前力量」与「地图」生成目标鱼（重量 / 品级 / 难度）。

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

function cast(username, baitId, mapId) {
  const u = userByName(username)
  if (!u) return err('仙门名录上没有此人 🌫️')
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
  const power = powerOf(u)

  const map = MAP_MAP.get(mapId) || MAP_MAP.get(u.currentMap) || MAP_MAP.get(DEFAULT_MAP)

  // 后台货币倍率（默认 1）
  const admin = safeAdminConfig()
  const shellMulAdj = admin && admin.currency ? admin.currency.shellMultiplier : 1
  const goldMulAdj = admin && admin.currency ? admin.currency.goldMultiplier : 1

  // 鱼饵 / 幸运草小幅提升专属鱼概率
  let exRate = map.exclusiveRate || 0
  if (premiumBait) exRate = Math.min(1, exRate + 0.05)
  if (luck) exRate = Math.min(1, exRate + 0.05)

  let fish, weight, tier
  if (Math.random() < exRate) {
    // 专属鱼：重量 = 力量 × 地图系数（受钓竿承重上限限制）
    fish = EXCLUSIVE_FISH[rand(EXCLUSIVE_FISH.length)]
    const m = map.exMin + Math.random() * (map.exMax - map.exMin)
    weight = round1(power * m)
    if (weight > maxCatch) weight = maxCatch
    tier = tierByMul(weight / power)
  } else {
    // 普通鱼：重量围绕力量分布（正常约 = 力量）
    let m
    const r = Math.random()
    if (r < 0.55) m = 0.4 + Math.random() * 0.6 // 0.4 ~ 1.0
    else if (r < 0.85) m = 1.0 + Math.random() * 0.5 // 1.0 ~ 1.5（自身极限）
    else m = 1.5 + Math.random() * 2.5 // 1.5 ~ 4.0（超极限）
    weight = round1(power * m)
    if (weight > maxCatch) weight = maxCatch
    tier = tierByMul(weight / power)
    const pool = POOLS[tier]
    fish = pool[rand(pool.length)]
  }
  const td = TIERS[tier]

  let rewardShells = Math.round(td.shellMul * (10 + 3 * Math.pow(weight, 0.75)) * (shellMulAdj || 1))
  let rewardGold = Math.max(1, Math.round(td.goldMul * Math.pow(weight, 0.45) * (goldMulAdj || 1)))

  const m = weight / power
  const breakRisk = computeBreakRisk(weight, power, lineStrength, maxCatch)
  const difficulty = clamp(0.3 + m * 0.45, 0.3, 4)
  const berserkChance = Math.min(0.95, td.berserkBase + Math.min(1, m / 4) * 0.15)

  // 清理过期遭遇
  const now = Date.now()
  for (const [k, v] of pending) if (now - v.createdAt > ENCOUNTER_TTL) pending.delete(k)

  const encounterId = 'e' + now.toString(36) + Math.random().toString(36).slice(2, 8)
  pending.set(encounterId, {
    encounterId,
    username,
    fishName: fish.name,
    fishIcon: fish.icon,
    tier,
    tierName: td.label,
    weight,
    rewardShells,
    rewardGold,
    lore: fish.lore,
    baitId: bait.itemId,
    baitName: bait.name,
    baitIcon: bait.icon,
    createdAt: now,
    settled: false
  })

  return ok({
    encounterId,
    fishName: fish.name,
    fishIcon: fish.icon,
    tier,
    tierName: td.label,
    weight,
    rewardShells,
    rewardGold,
    lore: fish.lore,
    baitId: bait.itemId,
    baitName: bait.name,
    baitIcon: bait.icon,
    mapId: map.id,
    mapName: map.name,
    rodPower,
    lineStrength,
    maxCatchWeight: maxCatch,
    power,
    difficulty: round2(difficulty),
    breakRisk: round2(breakRisk),
    berserkChance: round2(berserkChance),
    totalBait: profile.totalBait - 1,
    shells: profile.shells,
    goldStones: profile.goldStones,
    message: `有东西咬钩了！这是${map.name}的${fish.name}，握紧鱼竿，开始收线！`
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
  if (!u) return err('仙门名录上没有此人 🌫️')
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
    // 钓鱼协会挂钩：协会任务进度 / 2 分钟钓鱼比赛 / 认证徽章
    const assocMsgs = assocOnCatch(u, pe.fishName, pe.weight)
    if (assocMsgs.length) r.assocMessages = assocMsgs
    // 力量成长：钓到「自身极限的鱼」（重量 ≥ 力量）+1%~10%；
    // 钓到「超过自身极限 1.5 倍」的鱼（重量 ≥ 1.5×力量）+10%~50%（复合增长）
    const pw = powerOf(u)
    const mul = pe.weight / pw
    let gainPct = 0
    let kind = ''
    if (mul >= 1.5) {
      gainPct = 10 + Math.floor(Math.random() * 41)
      kind = 'beyond'
    } else if (mul >= 1.0) {
      gainPct = 1 + Math.floor(Math.random() * 10)
      kind = 'limit'
    }
    if (gainPct > 0) {
      const newPower = Math.round(pw * (1 + gainPct / 100))
      const gained = newPower - pw
      u.power = newPower
      r.powerGain = gained
      r.powerGainPct = gainPct
      r.powerKind = kind
      const tag = kind === 'beyond' ? '⚡突破极限' : '🔥挑战极限'
      r.message += ` ${tag}！力量 +${gained}（${gainPct}% → 当前力量 ${newPower}）`
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
  r.power = u.power == null ? 100 : u.power
  return ok(r)
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
  if (!u) return err('仙门名录上没有此人 🌫️')
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
  if (!u) return err('仙门名录上没有此人 🌫️')
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
  // 注册界面已取消邮箱：未填写时按道号自动生成占位邮箱，保持数据模型不变
  const mail = String(email || '').trim() || (name ? name + '@xiandao.world' : '')
  if (!name || !password) return err('注册信息填写不完整哦 🐚')
  const db = readDb()
  if (db.users.some((u) => u.username === name)) return err('此道号已被先人占用，另择一名号吧 🍃')
  if (email && email.trim() && db.users.some((u) => u.email === mail)) return err('该仙讯邮箱已注册过，直接回山门登录吧 🕊️')

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
    shells: starterShells,
    goldStones: starterGold,
    power: 100, // 初始力量 = 100
    currentMap: DEFAULT_MAP, // 初始所在地图：灵湖
    createTime: new Date().toISOString()
  })
  // 新手礼包：1 把初级钓竿（已装备）+ 5 个普通鱼饵
  db.userItems.push({ id: db.nextUserItemId++, userId: id, itemId: 1, quantity: 1, equipped: 1 })
  db.userItems.push({ id: db.nextUserItemId++, userId: id, itemId: 5, quantity: 5, equipped: 0 })
  persist()
  const u = userByName(name)
  return ok(
    { id: u.id, username: u.username, email: u.email, permission: 1, shells: u.shells, goldStones: u.goldStones, power: powerOf(u), currentMap: u.currentMap || DEFAULT_MAP },
    '入道成功，欢迎踏入仙钓大陆 🎉'
  )
}

function login({ username, password }) {
  const u = userByName(String(username || '').trim())
  if (!u) return err('查无此道号，仙门名录上没有此人 🌫️')
  if (u.password !== password) return err('护道法印不对，心魔可趁机而入 🗝️')
  return ok(
    { id: u.id, username: u.username, email: u.email, permission: u.permission, shells: u.shells, goldStones: u.goldStones, power: powerOf(u), currentMap: u.currentMap || DEFAULT_MAP },
    `登仙成功，欢迎回到仙钓大陆 🎉`
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
    goldStones: u.goldStones == null ? 0 : u.goldStones,
    power: powerOf(u),
    currentMap: u.currentMap || DEFAULT_MAP,
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
  if (b.power != null) u.power = clamp(Math.round(Number(b.power) || 0), 0, 1e12)
  if (b.goldStones != null) u.goldStones = clamp(Number(b.goldStones) || 0, 0, 1e12)
  if (b.currentMap != null) {
    if (MAP_MAP.get(String(b.currentMap))) u.currentMap = String(b.currentMap)
    else return err('未知地图：' + b.currentMap)
  }
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
    goldStones: b.goldStones != null ? clamp(Number(b.goldStones), 0, 1e12) : 0,
    power: b.power != null ? clamp(Math.round(Number(b.power)), 0, 1e12) : 100,
    currentMap: MAP_MAP.get(String(b.currentMap)) ? String(b.currentMap) : DEFAULT_MAP,
    createTime: new Date().toISOString()
  }
  db.users.push(newUser)
  persist()
  return ok(sanitizeUser(newUser), '创建成功')
}

// ============================================================
//  钓鱼协会：任务 / 2 分钟钓鱼比赛 / 1-9 星认证徽章
// ============================================================
//  - 协会不定时发布钓鱼任务（例：钓起一条指定的灵鱼），完成后可领奖励；
//  - 钓鱼比赛：报名后开赛 2 分钟，与其他玩家（协会成员）比谁钓的鱼总重更高；
//  - 认证徽章：单独钓起一只 ≥ 门槛重量的灵鱼即可获得对应星级认证。
// ============================================================
const BADGE_THRESHOLDS = [1000, 5000, 20000, 100000, 500000, 1000000, 2000000, 5000000, 10000000]
const COMP_DURATION = 2 * 60 * 1000          // 比赛时长：2 分钟
const COMP_NPC_COUNT = 4
const COMP_NPC_NAMES = ['海棉宝宝', '派大星', '章鱼哥', '蟹老板', '珊迪', '痞老板', '小蜗', '珍珍']
const COMP_REWARDS = [
  { rank: 1, shells: 2000, gold: 200, title: '冠军' },
  { rank: 2, shells: 1000, gold: 100, title: '亚军' },
  { rank: 3, shells: 500, gold: 50, title: '季军' }
]
const TASK_LIFETIME_MIN = 20 * 60 * 1000     // 任务有效期：20~40 分钟
const TASK_LIFETIME_MAX = 40 * 60 * 1000
const TASK_GAP_MIN = 5 * 60 * 1000           // 两波任务的发布间隔：5~15 分钟（不定时发布）
const TASK_GAP_MAX = 15 * 60 * 1000

/** 协会任务鱼池：所有品级灵鱼合并（按品级权重抽样，普通鱼常见、山海鱼稀有） */
const ALL_ASSOC_FISH = TIER_ORDER.flatMap((code) =>
  POOLS[code].map((f) => ({ ...f, tier: code, tierName: TIERS[code].label, minW: TIERS[code].minW, maxW: TIERS[code].maxW, shellMul: TIERS[code].shellMul, goldMul: TIERS[code].goldMul }))
)

/** 协会数据惰性初始化（兼容旧存档） */
function ensureAssoc(db) {
  if (!db.assoc) db.assoc = { nextTaskId: 1, nextTaskAt: 0, tasks: [], competition: null, compRecords: [] }
  const a = db.assoc
  if (!Array.isArray(a.tasks)) a.tasks = []
  if (!Array.isArray(a.compRecords)) a.compRecords = []
  if (!a.nextTaskId) a.nextTaskId = 1
  if (a.nextTaskAt == null) a.nextTaskAt = 0
  return a
}

/** 不定时发布协会任务：到点后生成一条「钓指定鱼」任务 */
function ensureAssocTasks(db, now) {
  const a = ensureAssoc(db)
  if (now < a.nextTaskAt) return
  // 随机抽鱼：普通鱼 60% / 稀有 22% / 传说 11% / 神话 5% / 山海 2%
  const roll = Math.random()
  const tierCode = roll < 0.6 ? 'COMMON' : roll < 0.82 ? 'RARE' : roll < 0.93 ? 'LEGENDARY' : roll < 0.98 ? 'MYTHIC' : 'SHANHAI'
  const pool = ALL_ASSOC_FISH.filter((f) => f.tier === tierCode)
  const fish = pool[rand(pool.length)]
  const rewardShells = Math.round(fish.shellMul * (120 + 2 * Math.pow(fish.maxW, 0.6)) * 10)
  const rewardGold = Math.max(5, Math.round(fish.goldMul * Math.pow(fish.maxW, 0.45) * 4))
  a.tasks.push({
    id: a.nextTaskId++,
    fishName: fish.name,
    fishIcon: fish.icon,
    tier: fish.tier,
    tierName: fish.tierName,
    minWeight: fish.minW,
    rewardShells,
    rewardGold,
    publishedAt: now,
    expiresAt: now + TASK_LIFETIME_MIN + rand(TASK_LIFETIME_MAX - TASK_LIFETIME_MIN),
    progress: {},   // { username: 该玩家已钓起该鱼的最大重量 }
    claimedBy: {}   // { username: true 已领奖 }
  })
  // 只保留最近 8 条任务供展示
  while (a.tasks.length > 8) a.tasks.shift()
  a.nextTaskAt = now + TASK_LIFETIME_MAX + TASK_GAP_MIN + rand(TASK_GAP_MAX - TASK_GAP_MIN)
}

/** 协会比赛 NPC 总重抽样：多数对手可以战胜，偶尔冒出钓鱼高手 */
function sampleNpcTotal() {
  const roll = Math.random()
  if (roll < 0.6) return Math.round(30 + Math.random() * 770)        // 30 ~ 800 斤
  if (roll < 0.85) return Math.round(800 + Math.random() * 7200)     // 800 ~ 8000 斤
  if (roll < 0.97) return Math.round(8000 + Math.random() * 92000)   // 8000 ~ 100000 斤
  return Math.round(100000 + Math.random() * 700000)                 // 100000 ~ 800000 斤
}

/** 比赛结算：到点后按总重排名并发放前三名奖励 */
function finalizeComp(db, now) {
  const a = ensureAssoc(db)
  const c = a.competition
  if (!c || c.finalized) return
  c.finalized = true
  // NPC 成绩按其计划总重定型（进行中已按时间展示部分进度）
  for (const e of c.entries) if (!e.isPlayer) e.total = e.planned
  const sorted = c.entries.slice().sort((x, y) => y.total - x.total)
  const rankOfPlayer = sorted.findIndex((e) => e.isPlayer) + 1
  c.rank = rankOfPlayer
  c.reward = null
  const rw = COMP_REWARDS.find((x) => x.rank === rankOfPlayer)
  if (rw) {
    const u = db.users.find((x) => x.username === c.username)
    if (u) {
      u.shells = (u.shells == null ? 0 : u.shells) + rw.shells
      u.goldStones = (u.goldStones == null ? 0 : u.goldStones) + rw.gold
      c.reward = { rank: rw.rank, title: rw.title, shells: rw.shells, gold: rw.gold }
    }
  }
  a.compRecords.unshift({ rank: rankOfPlayer, total: c.entries.find((e) => e.isPlayer)?.total || 0, at: now })
  if (a.compRecords.length > 5) a.compRecords.pop()
}

/** 钓获挂钩：任务进度 / 比赛成绩 / 徽章认证。返回需要播报的消息数组 */
function assocOnCatch(u, fishName, weight) {
  const db = readDb()
  const now = Date.now()
  const a = ensureAssoc(db)
  ensureAssocTasks(db, now)
  const msgs = []

  // 1) 协会任务进度
  for (const t of a.tasks) {
    if (t.fishName !== fishName || now >= t.expiresAt) continue
    const best = t.progress[u.username] || 0
    if (weight > best) {
      const firstDone = !(u.username in t.progress)
      t.progress[u.username] = weight
      if (firstDone) msgs.push(`📋 协会任务达成：「钓起一条${t.fishIcon}${t.fishName}」完成！记得去协会领奖`)
    }
  }

  // 2) 钓鱼比赛：进行中则累计本次钓获重量
  const c = a.competition
  if (c && !c.finalized) {
    if (now >= c.endsAt) finalizeComp(db, now)
    else if (c.username === u.username) {
      c.total = round1((c.total || 0) + weight)
      const me = c.entries.find((e) => e.isPlayer)
      if (me) me.total = c.total
      msgs.push(`⚔️ 比赛中！你已累计 ${fmtW(c.total)} 斤`)
    }
  }

  // 3) 认证徽章：单独钓起一只 ≥ 门槛的灵鱼
  if (weight > (u.maxCaughtWeight || 0)) u.maxCaughtWeight = weight
  let star = 0
  for (let i = 0; i < BADGE_THRESHOLDS.length; i++) if (weight >= BADGE_THRESHOLDS[i]) star = i + 1
  if (star > (u.assocBadge || 0)) {
    u.assocBadge = star
    msgs.push(`🏆 钓鱼协会认证：单尾 ${fmtW(weight)} 斤，授予 ${star} 星专属徽章！`)
  }
  persist()
  return msgs
}

function fmtW(n) {
  return n >= 1e8 ? round1(n / 1e8) + ' 亿' : n >= 1e4 ? round1(n / 1e4) + ' 万' : String(n)
}

/** 协会主页数据 */
function assocInfo(username) {
  const u = userByName(String(username || '').trim())
  if (!u) return err('仙门名录上没有此人 🌫️')
  const db = readDb()
  const now = Date.now()
  const a = ensureAssoc(db)
  ensureAssocTasks(db, now)
  if (a.competition && !a.competition.finalized && now >= a.competition.endsAt) finalizeComp(db, now)
  persist()

  const tasks = a.tasks.slice().reverse().map((t) => ({
    id: t.id,
    fishName: t.fishName,
    fishIcon: t.fishIcon,
    tier: t.tier,
    tierName: t.tierName,
    minWeight: t.minWeight,
    rewardShells: t.rewardShells,
    rewardGold: t.rewardGold,
    publishedAt: t.publishedAt,
    expiresAt: t.expiresAt,
    expired: now >= t.expiresAt,
    done: !!(t.progress && u.username in t.progress),
    claimed: !!(t.claimedBy && u.username in t.claimedBy),
    myWeight: (t.progress && t.progress[u.username]) || 0
  }))

  const star = u.assocBadge || 0
  let comp = null
  if (a.competition) {
    const c = a.competition
    const elapsed = Math.min(COMP_DURATION, now - c.startedAt)
    // NPC 成绩随时间推进逐步浮出（模拟对手同时在钓）
    const entries = c.entries.map((e) => ({
      name: e.name,
      isPlayer: !!e.isPlayer,
      total: e.isPlayer ? c.total || 0 : Math.min(e.planned, Math.round(e.planned * (elapsed / COMP_DURATION)))
    }))
    comp = {
      startedAt: c.startedAt,
      endsAt: c.endsAt,
      duration: COMP_DURATION,
      finalized: !!c.finalized,
      rank: c.rank || null,
      reward: c.reward || null,
      remaining: Math.max(0, c.endsAt - now),
      entries: entries.sort((x, y) => y.total - x.total)
    }
  }

  return ok({
    badgeStar: star,
    maxCaughtWeight: u.maxCaughtWeight || 0,
    badgeThresholds: BADGE_THRESHOLDS,
    nextBadgeTarget: star < BADGE_THRESHOLDS.length ? BADGE_THRESHOLDS[star] : null,
    tasks,
    nextTaskAt: a.nextTaskAt,
    competition: comp,
    compRecords: a.compRecords.slice()
  })
}

/** 领取协会任务奖励 */
function assocTaskClaim(username, taskId) {
  const u = userByName(String(username || '').trim())
  if (!u) return err('仙门名录上没有此人 🌫️')
  const db = readDb()
  const a = ensureAssoc(db)
  const t = a.tasks.find((x) => x.id === Number(taskId))
  if (!t) return err('任务不存在或已下架 📋')
  if (Date.now() >= t.expiresAt) return err('任务已过期，奖励无法领取')
  if (!(u.username in (t.progress || {}))) return err(`还没钓起「${t.fishName}」，先去灵湖完成它吧 🎣`)
  if (u.username in (t.claimedBy || {})) return err('奖励已经领过啦，下一次任务加油 🍃')
  t.claimedBy = t.claimedBy || {}
  t.claimedBy[u.username] = true
  u.shells = (u.shells == null ? 0 : u.shells) + t.rewardShells
  u.goldStones = (u.goldStones == null ? 0 : u.goldStones) + t.rewardGold
  persist()
  return ok(
    { shells: u.shells, goldStones: u.goldStones, taskId: t.id },
    `任务奖励到账：${t.rewardShells} 🐚 + ${t.rewardGold} 金石 🪙`
  )
}

/** 报名并开始一场 2 分钟钓鱼比赛 */
function assocCompStart(username) {
  const u = userByName(String(username || '').trim())
  if (!u) return err('仙门名录上没有此人 🌫️')
  const db = readDb()
  const now = Date.now()
  const a = ensureAssoc(db)
  if (a.competition && !a.competition.finalized) {
    if (now < a.competition.endsAt) return err('你已在一场比赛中，2 分钟后再来 🐟')
    finalizeComp(db, now)
  }
  const npcNames = COMP_NPC_NAMES.slice()
  const entries = [{ name: u.username, isPlayer: true, total: 0 }]
  for (let i = 0; i < COMP_NPC_COUNT; i++) {
    const idx = rand(npcNames.length)
    entries.push({ name: npcNames.splice(idx, 1)[0], isPlayer: false, planned: sampleNpcTotal() })
  }
  a.competition = { username: u.username, startedAt: now, endsAt: now + COMP_DURATION, total: 0, entries, finalized: false, rank: null, reward: null }
  persist()
  return ok(
    { endsAt: a.competition.endsAt, duration: COMP_DURATION },
    '⚔️ 比赛开始！2 分钟内钓的鱼越重越好，快回灵湖抛竿！'
  )
}

/** 查询比赛实时战况（到点自动结算并发放奖励） */
function assocCompState(username) {
  const u = userByName(String(username || '').trim())
  if (!u) return err('仙门名录上没有此人 🌫️')
  const db = readDb()
  const now = Date.now()
  const a = ensureAssoc(db)
  if (!a.competition) return ok({ competition: null, compRecords: a.compRecords.slice() })
  if (!a.competition.finalized && now >= a.competition.endsAt) finalizeComp(db, now)
  persist()
  return assocInfo(u.username)
}

// ============================================================
//  AI 助手：内置预设问答（完全离线）
// ============================================================
const AI_DIALOGS = [
  { id: 1, scene: '你好', reply: '嗨～我是仙钓大陆的小仙童！有什么想知道的尽管问，钓巨物的秘诀我最懂啦 🍃' },
  { id: 2, scene: '怎么玩', reply: '先抛竿 → 浮漂点头出现「咬钩了！」时 2.2 秒内提竿 → 按住屏幕收线、松手泄力，让张力停在绿色安全区，收满 100% 就上岸啦 🎣' },
  { id: 3, scene: '断线', reply: '张力冲到 100% 鱼线就断啦。松手泄力比一直按住更稳，暴走阶段（进度 78%）尤其要小心，鱼竿可能会被拽断 🧵' },
  { id: 4, scene: '根骨', reply: '根骨越高，收线越稳、能抗衡的灵鱼越重。用金石淬炼，每次 +5；贝壳可突破钓道境界，每重天永久 +5% 钓鱼收益 💪' },
  { id: 5, scene: '金石', reply: '金石靠钓稀有 / 巨物获得，越稀有越重给得越多。钓到 1000 斤以上基本能攒出一大把 🪙' },
  { id: 6, scene: '巨物', reply: '想钓十万斤、百万斤的山海巨兽，需要「螺纹钢航母阻拦索」（十万斤内不挣断）+「深渊海神竿」，两件同时装备取最大承重 🌊' },
  { id: 7, scene: '鱼饵', reply: '每次抛竿消耗 1 个鱼饵。豪华鱼饵 / 深海秘饵能显著提升稀有鱼概率，配合幸运四叶草更香 🪱' },
  { id: 8, scene: '存档', reply: '现在是离线模式，存档就在你自己的浏览器里（localStorage），换浏览器或清缓存会丢，注意备份账号密码哦 💾' },
  { id: 9, scene: '协会', reply: '钓鱼协会不定时发布任务（钓指定鱼有奖），还能报名 2 分钟钓鱼比赛跟其他玩家比重量；单尾钓起 1000 斤以上就开始授予 1~9 星认证徽章，越重星星越多 🏆' }
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
    '试试问我「怎么玩」「根骨」「金石」「巨物」「存档」这些关键词吧～',
    '老钓仙说：钓大鱼最重要的是耐心…还有别忘了买鱼饵 🪱'
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
      if (!u) return err('仙门名录上没有此人 🌫️')
      ensureStarterRod(u.id)
      return ok(buildProfile(u))
    }
    case '/api/game/cast':
      return cast(b.username, b.baitId, b.mapId)
    case '/api/game/baits':
      return listBaits(b.username)
    case '/api/game/settle':
      return settle(b)
    case '/api/game/maps':
      return ok(MAPS)
    case '/api/game/equip':
      return equip(b.username, b.userItemId)
    case '/api/shop/items':
      return shopItems()
    case '/api/shop/buy':
      return buy(b.username, b.itemId, b.quantity)
    case '/api/game/ai-dialogs':
      return aiDialogs()
    case '/api/game/ai-chat':
      return ok(aiChat(b.message))
    // ---- 钓鱼协会（任务 / 比赛 / 认证徽章）----
    case '/api/assoc/info':
      return assocInfo(params.username)
    case '/api/assoc/task-claim':
      return assocTaskClaim(b.username, b.taskId)
    case '/api/assoc/comp-start':
      return assocCompStart(b.username)
    case '/api/assoc/comp-state':
      return assocCompState(b.username)
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
  if (!u) return { code: 400, message: '仙门名录上没有此人 🌫️', data: [] }
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
