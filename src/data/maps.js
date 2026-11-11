/**
 * 地图（钓场）配置
 * ---------------------------------------------------------------
 * 不同地图「专属鱼」现身概率（exclusiveRate）不同：北原、极北之地等寒域
 * 大幅提升钓出专属鱼的概率。专属鱼重量按玩家当前「力量」的倍数生成
 * （exMin ~ exMax），因此越深的地图专属鱼越重，钓起后力量成长越夸张。
 *
 * 力量机制（见 localEngine.js）：
 *   · 力量初始 100，正常钓到的鱼约 = 力量（斤）
 *   · 钓到「自身极限的鱼」（重量 ≥ 力量）力量 +1%~10%
 *   · 钓到「超过自身极限 1.5 倍」的鱼（重量 ≥ 1.5×力量）力量 +10%~50%
 *   · 成长复合计算：100→110→121……（基于当前力量递增）
 */

export const MAPS = [
  {
    id: 'linghu',
    name: '灵湖',
    icon: '🌊',
    desc: '仙门脚下的一汪灵泉，鱼群寻常，适合初窥门径。',
    exclusiveRate: 0,
    recommendPower: 0,
    exMin: 1,
    exMax: 1
  },
  {
    id: 'beiyuan',
    name: '北原',
    icon: '🏔️',
    desc: '北境荒原的寒潭，灵气稀薄却时有异鱼出没，专属鱼现身概率大增。',
    exclusiveRate: 0.30,
    recommendPower: 300,
    exMin: 1.2,
    exMax: 4
  },
  {
    id: 'jibei',
    name: '极北之地',
    icon: '❄️',
    desc: '天地尽头的不冻冰海，传说深处的专属鱼重逾万斤。',
    exclusiveRate: 0.55,
    recommendPower: 2000,
    exMin: 3,
    exMax: 15
  },
  {
    id: 'shenyuan',
    name: '深渊',
    icon: '🕳️',
    desc: '海沟最深处，光无法抵达，巨物横行，专属鱼成群。',
    exclusiveRate: 0.75,
    recommendPower: 20000,
    exMin: 8,
    exMax: 40
  },
  {
    id: 'penglai',
    name: '蓬莱',
    icon: '🏝️',
    desc: '海外仙岛，灵气氤氲，专属鱼遍池，凡钓皆珍。',
    exclusiveRate: 0.85,
    recommendPower: 100000,
    exMin: 20,
    exMax: 120
  }
]

export const MAP_MAP = new Map(MAPS.map((m) => [m.id, m]))

export const DEFAULT_MAP = 'linghu'

/** 专属鱼池：不同地图都会从中抽取，重量由该地图的 exMin~exMax 决定 */
export const EXCLUSIVE_FISH = [
  { name: '冰原王鲑', icon: '🐟', lore: '北原寒潭的霸主，鳞片如霜。' },
  { name: '玄冰巨鲲', icon: '🐋', lore: '极北冰海下的庞然阴影。' },
  { name: '雪峰飞鲤', icon: '🐠', lore: '跃过极北冰瀑的灵鲤。' },
  { name: '幽冥龙王', icon: '🐉', lore: '统御一方寒域的龙王。' },
  { name: '九幽冥鲛', icon: '🦈', lore: '深渊血海中的猎手。' },
  { name: '蓬莱金鳌', icon: '🐢', lore: '仙岛神龟，背负星辰。' },
  { name: '寒渊烛龙', icon: '🐲', lore: '海沟尽头一点幽光，传说是龙的幼崽。' },
  { name: '冰魄银鳗', icon: '🪱', lore: '通体剔透，似一条冻住的闪电。' },
  { name: '霜甲巨蟹', icon: '🦀', lore: '甲壳凝结万年寒霜，钳力惊人。' },
  { name: '极光锦鲤', icon: '🎏', lore: '只在极光最盛时现身的祥瑞。' }
]
