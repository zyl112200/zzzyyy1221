/**
 * 商店商品目录（离线版内置数据）
 * 与后端 data-h2.sql / sql/spongebob_db.sql 中的 item 表保持一致，
 * 修改商品时请同步这三处。
 */
export const SHOP_ITEMS = [
  { id: 1, name: '初级钓竿', type: 'ROD', price: 0, power: 1, lineStrength: 300, maxCatchWeight: 800, icon: '🎣', description: '比奇堡标配，承重 300 斤，能钓到常见小鱼', sort: 10 },
  { id: 2, name: '银质钓竿', type: 'ROD', price: 200, power: 2, lineStrength: 2000, maxCatchWeight: 5000, icon: '🎣', description: '钓力提升，承重 2000 斤，稀有鱼更易上钩', sort: 20 },
  { id: 3, name: '黄金钓竿', type: 'ROD', price: 800, power: 3, lineStrength: 20000, maxCatchWeight: 50000, icon: '🎣', description: '闪闪发光，承重 2 万斤，传说鱼也拦不住', sort: 30 },
  { id: 4, name: '钻石钓竿', type: 'ROD', price: 3000, power: 4, lineStrength: 200000, maxCatchWeight: 400000, icon: '🎣', description: '深海霸主专用，承重 20 万斤', sort: 40 },
  { id: 8, name: '精钢巨物竿', type: 'ROD', price: 12000, power: 6, lineStrength: 800000, maxCatchWeight: 1200000, icon: '🔱', description: '专为巨物而生，承重 80 万斤', sort: 45 },
  { id: 11, name: '深渊海神竿', type: 'ROD', price: 80000, power: 9, lineStrength: 3000000, maxCatchWeight: 5000000, icon: '🌊', description: '海神遗物，承重 300 万斤，可钓五百万斤', sort: 48 },
  { id: 5, name: '普通鱼饵', type: 'BAIT', price: 10, power: 0, lineStrength: 0, maxCatchWeight: 0, icon: '🪱', description: '每次抛竿消耗 1 个', sort: 50 },
  { id: 6, name: '豪华鱼饵', type: 'BAIT', price: 35, power: 1, lineStrength: 0, maxCatchWeight: 0, icon: '🦐', description: '提升稀有鱼概率', sort: 60 },
  { id: 10, name: '深海秘饵', type: 'BAIT', price: 90, power: 3, lineStrength: 0, maxCatchWeight: 0, icon: '🧪', description: '大幅提升稀有 / 神话鱼概率', sort: 65 },
  { id: 7, name: '幸运四叶草', type: 'LUCK', price: 500, power: 2, lineStrength: 0, maxCatchWeight: 0, icon: '🍀', description: '永久提升稀有 / 传说概率 +8%', sort: 70 },
  { id: 9, name: '螺纹钢航母阻拦索', type: 'LINE', price: 50000, power: 0, lineStrength: 100000, maxCatchWeight: 1000000, icon: '🧵', description: '十万斤内绝不挣断，能钓百万斤巨鱼（装备生效）', sort: 80 }
]

export const ITEM_MAP = new Map(SHOP_ITEMS.map((it) => [it.id, it]))
