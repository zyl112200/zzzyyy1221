// 鱼竿 id → 写实立绘映射（素材由 AI 生成，半写实游戏 CG 风格，见 assets/rods/）
// 六根钓竿全部拥有写实建模立绘；商店、背包、钓鱼场景共用此映射。
import rodBasic from '../assets/rods/rod_basic.png'
import rodSilver from '../assets/rods/rod_silver.png'
import rodGold from '../assets/rods/rod_gold.png'
import rodDiamond from '../assets/rods/rod_diamond.png'
import rodTitan from '../assets/rods/rod_titan.png'
import rodPoseidon from '../assets/rods/rod_poseidon.png'

export const ROD_SPRITES = {
  1: rodBasic,     // 初级钓竿
  2: rodSilver,    // 银质钓竿
  3: rodGold,      // 黄金钓竿
  4: rodDiamond,   // 钻石钓竿
  8: rodTitan,     // 精钢巨物竿
  11: rodPoseidon  // 深渊海神竿
}

/** 取鱼竿立绘；没有则返回 null，调用方回退到 emoji */
export const rodSprite = (id) => ROD_SPRITES[id] || null
