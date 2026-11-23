/**
 * 地图（钓场）配置
 * ---------------------------------------------------------------
 * 不同地图「专属鱼」现身概率（exclusiveRate）不同：北原、极北之地等寒域
 * 大幅提升钓出专属鱼的概率。专属鱼重量按玩家当前「力量」的倍数生成
 * （exMin ~ exMax），因此越深的地图专属鱼越重，钓起后力量成长越夸张。
 *
 * 力量机制（见 localEngine.js / GameService.java）：
 *   · 力量即「自身重量上限」，本地引擎初始 100，正常钓到的鱼约 = 力量（斤）
 *   · 只有成功钓起「重量超过自身上限 10%」的鱼才成长
 *   · 每次成长固定 +10%（基于当前力量，复合计算：100→110→121……）
 */

export const MAPS = [
  {
    id: 'linghu',
    name: '灵湖',
    icon: 'map_linghu',
    desc: '仙门脚下的一汪灵泉，鱼群寻常，适合初窥门径。',
    exclusiveRate: 0,
    recommendPower: 0,
    exMin: 1,
    exMax: 1
  },
  {
    id: 'beiyuan',
    name: '北原',
    icon: 'map_beiyuan',
    desc: '北境荒原的寒潭，灵气稀薄却时有异鱼出没，专属鱼现身概率大增。',
    exclusiveRate: 0.30,
    recommendPower: 300,
    exMin: 1.2,
    exMax: 4
  },
  {
    id: 'jibei',
    name: '极北之地',
    icon: 'map_jibei',
    desc: '天地尽头的不冻冰海，传说深处的专属鱼重逾万斤。',
    exclusiveRate: 0.55,
    recommendPower: 2000,
    exMin: 3,
    exMax: 15
  },
  {
    id: 'shenyuan',
    name: '深渊',
    icon: 'map_shenyuan',
    desc: '海沟最深处，光无法抵达，巨物横行，专属鱼成群。',
    exclusiveRate: 0.75,
    recommendPower: 20000,
    exMin: 8,
    exMax: 40
  },
  {
    id: 'penglai',
    name: '蓬莱',
    icon: 'map_penglai',
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
  { name: '冰原王鲑', icon: '冰原王鲑', lore: '北原寒潭的霸主，鳞片如霜。' },
  { name: '玄冰巨鲲', icon: '玄冰巨鲲', lore: '极北冰海下的庞然阴影。' },
  { name: '雪峰飞鲤', icon: '雪峰飞鲤', lore: '跃过极北冰瀑的灵鲤。' },
  { name: '幽冥龙王', icon: '幽冥龙王', lore: '统御一方寒域的龙王。' },
  { name: '九幽冥鲛', icon: '九幽冥鲛', lore: '深渊血海中的猎手。' },
  { name: '蓬莱金鳌', icon: '蓬莱金鳌', lore: '仙岛神龟，背负星辰。' },
  { name: '寒渊烛龙', icon: '寒渊烛龙', lore: '海沟尽头一点幽光，传说是龙的幼崽。' },
  { name: '冰魄银鳗', icon: '冰魄银鳗', lore: '通体剔透，似一条冻住的闪电。' },
  { name: '霜甲巨蟹', icon: '霜甲巨蟹', lore: '甲壳凝结万年寒霜，钳力惊人。' },
  { name: '极光锦鲤', icon: '极光锦鲤', lore: '只在极光最盛时现身的祥瑞。' }
]
