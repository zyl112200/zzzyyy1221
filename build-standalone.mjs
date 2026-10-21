// 把 Vite 打包产物（dist/）内联成单个可直接双击打开的 HTML。
// 背景：Vite 产物默认是 <script type="module">，Chrome 在 file:// 下会因 CORS 拦截，
// 改成普通 <script>（IIFE 已编译进单一 chunk）后即可离线双击打开。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const dist = resolve(root, 'dist')
const htmlPath = resolve(dist, 'index.html')
const jsPath = resolve(dist, 'assets', 'index.js')

const html = readFileSync(htmlPath, 'utf8')
const js = readFileSync(jsPath, 'utf8')

// 1) 单文件版本：把 JS 内联，移除 type="module" / crossorigin
const standaloneHtml = html
  .replace(/<script[^>]*src="\.\/assets\/index\.js"[^>]*><\/script>/,
    `<script>${js}</script>`)
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/g, '') // 兜底移除可能的样式引用（本工程样式已内联进 JS）

const standalonePath = resolve(dist, 'spongebob-standalone.html')
writeFileSync(standalonePath, standaloneHtml, 'utf8')

// 2) 同时修正 dist/index.html，让它（配合 assets 目录）双击也能开
const fixedHtml = html.replace(/<script type="module" crossorigin src="\.\/assets\/index\.js"><\/script>/,
  '<script src="./assets/index.js"></script>')
writeFileSync(htmlPath, fixedHtml, 'utf8')

console.log('✅ 生成单文件:', standalonePath)
console.log('✅ 已修正:', htmlPath, '(配合 dist/assets 目录双击可用)')
