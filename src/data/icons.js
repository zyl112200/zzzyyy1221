/**
 * 写实图标统一映射
 * ---------------------------------------------------------------
 * 所有 emoji / 手绘图标集中替换为写实 3D 图标素材（src/assets/icons/）。
 * 通过 icon(name) 取图片 URL；未知名称返回 null，调用方可用文字回退。
 */
import coin from '../assets/icons/coin.png'
import gem from '../assets/icons/gem.png'
import power from '../assets/icons/power.png'
import cultivation from '../assets/icons/cultivation.png'
import shell from '../assets/icons/shell.png'
import hook from '../assets/icons/hook.png'
import line from '../assets/icons/line.png'
import trophy from '../assets/icons/trophy.png'
import clover from '../assets/icons/clover.png'
import baitWorm from '../assets/icons/bait_worm.png'
import baitShrimp from '../assets/icons/bait_shrimp.png'
import potion from '../assets/icons/potion.png'
import mountain from '../assets/icons/mountain.png'
import book from '../assets/icons/book.png'
import cart from '../assets/icons/cart.png'
import backpack from '../assets/icons/backpack.png'
import tools from '../assets/icons/tools.png'
import map from '../assets/icons/map.png'
import chart from '../assets/icons/chart.png'
import medals from '../assets/icons/medals.png'
import key from '../assets/icons/key.png'
import gift from '../assets/icons/gift.png'
import clock from '../assets/icons/clock.png'
import swords from '../assets/icons/swords.png'
import scroll from '../assets/icons/scroll.png'
import signpost from '../assets/icons/signpost.png'
import gong from '../assets/icons/gong.png'
import vibrate from '../assets/icons/vibrate.png'
import lotus from '../assets/icons/lotus.png'
import leaf from '../assets/icons/leaf.png'
import taiji from '../assets/icons/taiji.png'
import star from '../assets/icons/star.png'
import starFilled from '../assets/icons/star_filled.png'
import starEmpty from '../assets/icons/star_empty.png'
import moon from '../assets/icons/moon.png'
import user from '../assets/icons/user.png'
import search from '../assets/icons/search.png'
import plus from '../assets/icons/plus.png'
import edit from '../assets/icons/edit.png'
import warning from '../assets/icons/warning.png'
import save from '../assets/icons/save.png'
import lock from '../assets/icons/lock.png'
import target from '../assets/icons/target.png'
import mapLinghu from '../assets/maps/map_linghu.png'
import mapBeiyuan from '../assets/maps/map_beiyuan.png'
import mapJibei from '../assets/maps/map_jibei.png'
import mapShenyuan from '../assets/maps/map_shenyuan.png'
import mapPenglai from '../assets/maps/map_penglai.png'

const ICONS = {
  map_linghu: mapLinghu,
  map_beiyuan: mapBeiyuan,
  map_jibei: mapJibei,
  map_shenyuan: mapShenyuan,
  map_penglai: mapPenglai,
  coin, gold: coin, shellCoin: coin,
  gem, goldStone: gem,
  power, strength: power,
  cultivation, realm: cultivation, xiuyi: cultivation,
  shell, hook,
  line, fishingLine: line,
  trophy, cup: trophy,
  clover, luck: clover,
  baitWorm, worm: baitWorm,
  baitShrimp, shrimp: baitShrimp,
  potion,
  mountain, peak: mountain,
  book, codex: book,
  cart, shop: cart,
  backpack, bag: backpack,
  tools, admin: tools,
  map, mapRolled: map,
  chart, odds: chart,
  medals, medal: medals,
  key,
  gift,
  clock,
  swords, battle: swords,
  scroll,
  signpost,
  gong, notice: gong,
  vibrate, vibration: vibrate,
  lotus,
  leaf,
  taiji,
  star,
  starFilled,
  starEmpty,
  moon,
  user,
  search,
  plus,
  edit,
  warning,
  save,
  lock,
  target
}

/** 取图标 URL，未知返回 null */
export function icon(name) {
  return ICONS[name] || null
}

/** 根据 emoji 反查写实图标（兼容后端仍返回 emoji icon 的字段） */
const EMOJI_MAP = {
  '🪙': 'coin', '💰': 'coin', '💵': 'coin',
  '🟢': 'gem', '💎': 'gem',
  '💪': 'power',
  '🐚': 'shell',
  '🪝': 'hook',
  '🧵': 'line',
  '🏆': 'trophy', '🥇': 'trophy',
  '🍀': 'clover',
  '🪱': 'baitWorm',
  '🦐': 'baitShrimp',
  '🧪': 'potion',
  '⛰️': 'mountain', '⛰': 'mountain', '🏔️': 'mountain',
  '📖': 'book',
  '🛒': 'cart',
  '🎒': 'backpack',
  '🛠': 'tools', '🛠️': 'tools',
  '🗺️': 'map', '🗺': 'map',
  '📊': 'chart',
  '🏅': 'medals', '🎖': 'medals', '🥈': 'medals', '🥉': 'medals',
  '🗝️': 'key', '🗝': 'key', '🔑': 'key',
  '🎁': 'gift',
  '🕐': 'clock', '🕑': 'clock',
  '⚔️': 'swords', '⚔': 'swords',
  '📜': 'scroll', '📋': 'scroll',
  '📢': 'gong',
  '📳': 'vibrate', '🔕': 'vibrate',
  '🪷': 'lotus',
  '🍃': 'leaf', '🌿': 'leaf',
  '☯️': 'taiji', '☯': 'taiji',
  '✨': 'star', '🌟': 'star',
  '🌕': 'moon',
  '👤': 'user',
  '🔍': 'search',
  '➕': 'plus',
  '✏️': 'edit', '✏': 'edit',
  '⚠️': 'warning', '⚠': 'warning',
  '💾': 'save',
  '🔐': 'lock', '🔒': 'lock',
  '🎯': 'target',
  // 地图场景缩略图
  '🌊': 'map_linghu', '🏔️': 'map_beiyuan', '🏔': 'map_beiyuan',
  '❄️': 'map_jibei', '❄': 'map_jibei',
  '🕳️': 'map_shenyuan', '🕳': 'map_shenyuan',
  '🏝️': 'map_penglai', '🏝': 'map_penglai',
  // 常见鱼 emoji → 用鱼饵/宝石等兜底，真实鱼名优先由 GameIcon 走 FISH_SPRITES
  '🐟': 'baitWorm', '🐠': 'baitShrimp', '🐡': 'potion', '🦀': 'shell'
}

/** 兼容 emoji 字段：传入 emoji 或图标名都能取到 URL */
export function iconOf(value) {
  if (!value) return null
  const name = ICONS[value] ? value : EMOJI_MAP[value]
  return name ? icon(name) : null
}
