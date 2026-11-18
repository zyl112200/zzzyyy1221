// 鱼竿 id → 写实立绘映射（素材由 AI 生成，半写实游戏 CG 风格，见 assets/rods/）
// 未在此映射中的鱼竿仍使用 emoji 图标，后续生成新图后在此追加即可。
import rodBasic from '../assets/rods/rod_basic.png'
import rodPoseidon from '../assets/rods/rod_poseidon.png'

export const ROD_SPRITES = {
  1: rodBasic,   // 初级钓竿
  11: rodPoseidon // 深渊海神竿
}

/** 取鱼竿立绘；没有则返回 null，调用方回退到 emoji */
export const rodSprite = (id) => ROD_SPRITES[id] || null
