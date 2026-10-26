// 把 Vite 打包产物（dist/）内联成单个可直接双击打开的 HTML。
//
// 两个必须处理的坑：
// 1) Vite 产物是 <script type="module">，Chrome 在 file:// 下会按 CORS 拦截，
//    必须改成普通 <script>（IIFE 已编译进单一 chunk）。
// 2) 普通 <script> 没有 defer 行为，如果留在 <head> 里会早于 #app 执行，
//    Vue 挂载时拿不到容器 → 白屏。所以内联脚本必须挪到 </body> 之前。
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const dist = resolve(root, 'dist')
const htmlPath = resolve(dist, 'index.html')

if (!existsSync(htmlPath)) {
  console.error('❌ 没找到 dist/index.html，请先执行 npm run build')
  process.exit(1)
}

const sourceHtml = readFileSync(htmlPath, 'utf8')
let html = sourceHtml
const inlineScripts = []

// 1) 取出所有外链 JS，读成内联脚本（去掉 type="module" / crossorigin）
html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (m, src) => {
  const file = resolve(dist, src.replace(/^\.?\//, ''))
  if (!existsSync(file)) return m
  inlineScripts.push(`<script>\n${readFileSync(file, 'utf8')}\n</script>`)
  return '<!--inline-js-->'
})

// 2) 内联所有 CSS
html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, (m) => {
  const hit = m.match(/href="([^"]+)"/)
  if (!hit) return ''
  const file = resolve(dist, hit[1].replace(/^\.?\//, ''))
  if (!existsSync(file)) return ''
  return `<style>\n${readFileSync(file, 'utf8')}\n</style>`
})

// 3) 清掉 modulepreload（单文件里毫无意义）
html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '')

// 4) 把内联脚本放到 </body> 之前，确保 DOM 就绪后 Vue 才挂载
const scriptBlock = '\n' + inlineScripts.join('\n') + '\n'
html = html.includes('</body>')
  ? html.replace('</body>', `${scriptBlock}</body>`)
  : html + scriptBlock
html = html.replace('<!--inline-js-->', '')

// 5) 单文件里加一段离线提示（无网络时可自证来源）
html = html.replace(
  '<meta charset="UTF-8">',
  '<meta charset="UTF-8">\n  <meta name="offline-ready" content="true">'
)

const standalonePath = resolve(dist, 'spongebob-standalone.html')
writeFileSync(standalonePath, html, 'utf8')

// 顺手在项目根目录放一份，方便直接双击（文件名用 ASCII，避免批处理编码问题）
const rootCopy = resolve(root, 'spongebob-offline.html')
writeFileSync(rootCopy, html, 'utf8')

// 6) 同时修正 dist/index.html：外链脚本加 defer（普通脚本没有 module 的延迟执行特性）
const fixedHtml = sourceHtml.replace(
  /<script type="module" crossorigin src="([^"]+)"><\/script>/,
  '<script defer src="$1"></script>'
)
writeFileSync(htmlPath, fixedHtml, 'utf8')

const kb = (readFileSync(standalonePath).length / 1024).toFixed(1)
console.log('✅ 单文件离线版:', standalonePath, `(${kb} KB)`)
console.log('✅ 根目录副本:', rootCopy)
console.log('✅ 已修正:', htmlPath, '(配合 dist/assets 目录双击可用)')
console.log('ℹ️ 产物零外部依赖：无 CDN、无字体、无接口请求')
