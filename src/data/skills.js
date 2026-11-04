/**
 * 钓鱼功法（钓道修仙设定）
 * ---------------------------------------------------------------
 * 内容取材自网上真实钓鱼口诀与「钓道修仙」类小说设定：
 *   · 静心诀 / 卸力诀 —— 对应搏鱼时控线、借力的实战心法
 *   · 观水诀 —— 对应「阴缓草坎湾汇」等选位辨鱼经验
 *   · 四季钓经 —— 对应「春钓滩、夏钓潭、秋钓荫、冬钓阳」节气口诀
 *   · 潮汐真诀 —— 对应「涨潮满潮鱼来钓」的潮汐规律
 *   · 引灵诀 —— 将钓鱼收益「灵气化」的修仙演绎
 *   · 无钩钓法 —— 姜太公「直钩钓天下」的典故
 *   · 钓道真解 —— 整合「钓形·钓气·钓心」三层次（钓友留步等作品设定）
 *
 * 境界体系：每部功法由 一重天 修炼至 99999 重天，每重天分
 *   入门 → 前期 → 中期 → 后期 → 巅峰 → 圆满 六个小境界，
 *   合计 99999 × 6 = 599994 级（SKILL_LEVEL_MAX）。
 *   前 54 级（一重天·入门 → 九重天·圆满）效果在 base 与 max 间线性成长；
 *   九重天圆满之后转为对数曲线缓慢成长，满级约为 2 × max - base，
 *   保证 99999 重天内效果永不溢出（减益类上限 < 100%）。
 *   提升小境界消耗金石；自某重天「圆满」突破至下一重天「入门」时，需额外消耗贝壳。
 *
 * 前端用它渲染「功法阁」并据此计算被动加成；本地引擎(localEngine.js)
 * 用它校验消耗与生效逻辑；后端(GameService)用同名字段做同构（后端暂未同步境界体系）。
 */

// ---------------- 境界常量 ----------------
export const SUB_REALMS = ['入门', '前期', '中期', '后期', '巅峰', '圆满']
export const SUB_PER_HEAVEN = SUB_REALMS.length
export const HEAVEN_MAX = 99999
/** 单部功法满级等级（99999 × 6 = 599994） */
export const SKILL_LEVEL_MAX = HEAVEN_MAX * SUB_PER_HEAVEN

/** 九重天·圆满对应的等级（前 54 级为线性成长段） */
export const LINEAR_LEVEL_MAX = 9 * SUB_PER_HEAVEN

const HEAVEN_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

const round1 = (v) => Math.round(v * 10) / 10

/**
 * 功法定义：
 *   cost  —— 定价基准（金石），每级消耗 = cost × (0.15 + 0.02 × (重天-1))
 *   base  —— 一重天·入门（1 级）时的效果强度
 *   max   —— 九重天·圆满（54 级）时的效果强度（其后按对数曲线缓增至约 2 × max - base）
 *   fmt   —— 效果展示文案（界面用），引擎按 skillId 自行解释数值语义
 */
export const SKILLS = [
  {
    id: 'jingxin',
    name: '静心诀',
    icon: '🧘',
    cost: 30,
    desc: '心如止水，波澜不惊。搏鱼时鱼线张力上升减缓，更易将张力稳在绿色安全区。',
    effect: '张力上升减缓',
    base: 15,
    max: 45,
    fmt: (v) => `张力上升 -${round1(v)}%`
  },
  {
    id: 'xieli',
    name: '卸力诀',
    icon: '🌊',
    cost: 50,
    desc: '借力打力，四两拨千斤。收线速度提升，巨物也拉得动。',
    effect: '收线速度提升',
    base: 18,
    max: 54,
    fmt: (v) => `收线速度 +${round1(v)}%`
  },
  {
    id: 'guanshui',
    name: '观水诀',
    icon: '👁️',
    cost: 40,
    desc: '察水色、辨鱼踪，于无声处听惊雷。稀有及以上灵鱼现身概率显著提升。',
    effect: '稀有概率提升',
    base: 1.6,
    max: 2.6,
    fmt: (v) => `稀有概率提升 +${round1((v - 1) * 100)}%`
  },
  {
    id: 'siji',
    name: '四季钓经',
    icon: '🍂',
    cost: 35,
    desc: '春钓滩、夏钓潭、秋钓荫、冬钓阳。顺应天时，咬钩等待时间显著缩短。',
    effect: '等待时间缩短',
    base: 25,
    max: 60,
    fmt: (v) => `等待时间 -${round1(v)}%`
  },
  {
    id: 'yinling',
    name: '引灵诀',
    icon: '✨',
    cost: 80,
    desc: '引动天地灵气入竿。钓鱼收益（贝壳 / 金石）提升，钓一尾抵往日数尾。',
    effect: '钓鱼收益提升',
    base: 20,
    max: 60,
    fmt: (v) => `钓鱼收益 +${round1(v)}%`
  },
  {
    id: 'chaoxi',
    name: '潮汐真诀',
    icon: '🌕',
    cost: 45,
    desc: '涨潮满潮鱼来钓，落潮潮平去睡觉。浮漂信号更清晰，提竿命中窗口大幅延长。',
    effect: '命中窗口延长',
    base: 600,
    max: 2000,
    fmt: (v) => `命中窗口 +${round1(v / 1000)}s`
  },
  {
    id: 'wugou',
    name: '无钩钓法',
    icon: '🪝',
    cost: 60,
    desc: '姜太公直钩钓天下，愿者上钩。钓道境界突破所需贝壳降低。',
    effect: '突破消耗降低',
    base: 15,
    max: 40,
    fmt: (v) => `突破消耗 -${round1(v)}%`
  },
  {
    id: 'diaodao',
    name: '钓道真解',
    icon: '📜',
    cost: 120,
    desc: '钓形·钓气·钓心三合一，直指钓道本源。全属性提升（张力、收线、收益）。',
    effect: '全属性提升',
    base: 8,
    max: 24,
    fmt: (v) => `全属性 ±${round1(v)}%`
  }
]

export const SKILL_MAP = new Map(SKILLS.map((s) => [s.id, s]))

// ---------------- 境界计算 ----------------

/**
 * 功法在指定等级的效果强度：
 *   1 ~ 54 级（一重天·入门 → 九重天·圆满）：base 与 max 间线性成长；
 *   54 级之后：对数曲线缓慢成长，满级 599994 ≈ 2 × max - base（永不溢出 100%）。
 * level 传 0 或非法值时返回 0（未修炼，无效果）。
 */
export function skillPower(def, level) {
  if (!def || !Number.isFinite(level) || level < 1) return 0
  const lv = Math.min(Math.floor(level), SKILL_LEVEL_MAX)
  if (lv <= LINEAR_LEVEL_MAX) {
    const t = (lv - 1) / (LINEAR_LEVEL_MAX - 1)
    return def.base + (def.max - def.base) * t
  }
  const t =
    1 +
    Math.log((lv - 1) / (LINEAR_LEVEL_MAX - 1)) /
      Math.log((SKILL_LEVEL_MAX - 1) / (LINEAR_LEVEL_MAX - 1))
  return def.base + (def.max - def.base) * t
}

/** level 所属重天（1..99999；未修炼返回 0） */
export function heavenOf(level) {
  if (!Number.isFinite(level) || level < 1) return 0
  return Math.min(Math.ceil(level / SUB_PER_HEAVEN), HEAVEN_MAX)
}

/** 境界名：如「三重天·中期」「100重天·圆满」；level 为 0 时返回「未入门」 */
export function realmLabel(level) {
  if (!Number.isFinite(level) || level < 1) return '未入门'
  const heaven = heavenOf(level)
  const sub = SUB_REALMS[(Math.min(level, SKILL_LEVEL_MAX) - 1) % SUB_PER_HEAVEN]
  const heavenText = heaven <= HEAVEN_CN.length ? HEAVEN_CN[heaven - 1] : String(heaven)
  return `${heavenText}重天·${sub}`
}

/**
 * 从 level 提升到 level+1 所需金石（level 传 0 表示首次修炼）。
 * 满级时返回 null。按重天计价：cost × (0.15 + 0.02 × (重天 - 1))，
 * 一重天每级约 0.15 × cost，随重天线性缓涨。
 */
export function levelGoldCost(def, level) {
  if (!def) return null
  const lv = Number.isFinite(level) ? level : 0
  if (lv >= SKILL_LEVEL_MAX) return null
  const heaven = lv < 1 ? 1 : heavenOf(lv)
  return Math.max(1, Math.round(def.cost * (0.15 + 0.02 * (heaven - 1))))
}

/**
 * 提升到 nextLevel 时若为「跨重天突破」（自某重天圆满迈入下一重天入门），
 * 返回需额外支付的贝壳：100 × (目标重天 - 1)，与力量境界突破同价；
 * 非跨重天返回 0。
 */
export function heavenShellCost(nextLevel) {
  if (nextLevel > 1 && nextLevel % SUB_PER_HEAVEN === 1) {
    const heaven = Math.ceil(nextLevel / SUB_PER_HEAVEN)
    return 100 * (heaven - 1)
  }
  return 0
}

/** 效果文案：未修炼时展示一重天·入门的效果预览 */
export function effectText(def, level) {
  if (!def) return ''
  return def.fmt(skillPower(def, level >= 1 ? level : 1))
}
