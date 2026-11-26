// 仙缘奇遇：抛竿瞬间约 22% 触发的一次性机缘
// ---------------------------------------------------------------
// 奇遇给这一竿叠加临时加成（稀有几率 / 鱼重 / 收益 / 张力），并按 id
// 追加一笔额外金币。与后端 FortuneUtil / 本地引擎同构。
//
// 导出：
//   · FORTUNES / FORTUNE_MAP : 奇遇目录（id -> 配置，含 name/desc/文案与倍率）
//   · rollFortune()          : 抽取本次奇遇（约 22% 命中，否则 null）
//   · fortuneBonusShells(id) : 该奇遇的额外金币奖励

export const FORTUNES = [
  {
    id: 'winding', name: '风起云涌', icon: '🌬', weight: 30,
    desc: '天边异云翻涌，今日灵鱼格外活跃。',
    rareBoost: 0.03, weightMul: 1.08, coinMul: 1.05, tensionMul: 1.05, bonusShells: 20
  },
  {
    id: 'spirit_rain', name: '灵雨甘霖', icon: '🌧', weight: 24,
    desc: '一场灵雨落入湖中，水气氤氲，鱼群争饵。',
    rareBoost: 0.06, weightMul: 1.15, coinMul: 1.12, tensionMul: 1.08, bonusShells: 60
  },
  {
    id: 'moon_bless', name: '月老牵缘', icon: '🌙', weight: 18,
    desc: '月下银线牵缘，稀世灵鱼似有感应。',
    rareBoost: 0.12, weightMul: 1.22, coinMul: 1.2, tensionMul: 1.1, bonusShells: 150
  },
  {
    id: 'dragon_omen', name: '龙吟震荡', icon: '🐉', weight: 12,
    desc: '渊底传来一声龙吟，巨物被惊动，竿线绷紧。',
    rareBoost: 0.16, weightMul: 1.35, coinMul: 1.3, tensionMul: 1.28, bonusShells: 400
  },
  {
    id: 'immortal_cloud', name: '仙人指路', icon: '☁', weight: 9,
    desc: '祥云之中似有仙人指点，此竿必有奇获。',
    rareBoost: 0.2, weightMul: 1.4, coinMul: 1.45, tensionMul: 1.15, bonusShells: 800
  },
  {
    id: 'treasure', name: '宝光乍现', icon: '✨', weight: 7,
    desc: '湖面泛起一阵宝光，落竿之处暗藏机缘。',
    rareBoost: 0.08, weightMul: 1.1, coinMul: 1.8, tensionMul: 1.05, bonusShells: 1500
  }
]

export const FORTUNE_MAP = new Map(FORTUNES.map((f) => [f.id, f]))

/** 触发概率 */
const TRIGGER_RATE = 0.22

/** 抽取本次奇遇：约 22% 触发，其余返回 null */
export function rollFortune(random = Math.random) {
  if (random() >= TRIGGER_RATE) return null
  const total = FORTUNES.reduce((s, f) => s + f.weight, 0)
  let r = random() * total
  for (const f of FORTUNES) {
    r -= f.weight
    if (r < 0) return f
  }
  return FORTUNES[FORTUNES.length - 1]
}

/** 奇遇额外金币（未知 id 返回 0） */
export function fortuneBonusShells(id) {
  const f = FORTUNE_MAP.get(id)
  return f ? f.bonusShells || 0 : 0
}

export default { FORTUNES, FORTUNE_MAP, rollFortune, fortuneBonusShells }
