/**
 * 局域网「在线浏览」静态服务器（零依赖，只用 Node 内置模块）
 * ---------------------------------------------------------------
 * 作用：
 *   1. 把 vite build 产物 dist/ 通过 HTTP 对外提供，局域网任何设备都能浏览；
 *   2. 把 /api 反向代理到后端 http://192.168.68.9:8080，浏览器侧同源，不涉及跨域；
 *   3. 监听 0.0.0.0，手机 / 其它电脑直接访问 http://192.168.68.9:8081 即可。
 *
 * 用法：
 *   npm run online          # 先 build 再启动
 *   npm run serve           # 直接用已有 dist 启动
 *   node serve-lan.mjs --port 9000
 */
import { createServer, request as httpRequest } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BACKEND_ORIGIN, LAN_IP, WEB_PORT } from './src/config/lan.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), 'dist')
const PORT = Number(process.env.PORT || readArg('--port') || WEB_PORT)
const HOST = process.env.HOST || '0.0.0.0'
const BACKEND = new URL(BACKEND_ORIGIN)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
}

function readArg(name) {
  const i = process.argv.indexOf(name)
  return i > -1 ? process.argv[i + 1] : ''
}

function sendJson(res, status, payload) {
  const text = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
    'Cache-Control': 'no-store'
  })
  res.end(text)
}

/** /api 反向代理到后端 */
function proxyApi(req, res) {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    const headers = { ...req.headers, host: BACKEND.host }
    delete headers['content-length']
    if (body.length) headers['content-length'] = String(body.length)

    const upstream = httpRequest(
      {
        hostname: BACKEND.hostname,
        port: BACKEND.port || 80,
        path: req.url,
        method: req.method,
        headers
      },
      (up) => {
        res.writeHead(up.statusCode || 502, up.headers)
        up.pipe(res)
      }
    )

    upstream.setTimeout(20000, () => upstream.destroy(new Error('后端响应超时')))

    upstream.on('error', (err) => {
      sendJson(res, 502, {
        code: 502,
        message: `后端 ${BACKEND_ORIGIN} 不可达：${err.message}`,
        data: null
      })
    })

    if (body.length) upstream.write(body)
    upstream.end()
  })
}

/** 静态文件（找不到就回 index.html，hash 路由下等价于首页） */
function serveStatic(req, res) {
  let pathname = '/'
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch {
    pathname = '/'
  }

  if (pathname === '/') pathname = '/index.html'

  let file = resolve(ROOT, '.' + pathname)
  const insideRoot = file === ROOT || file.startsWith(ROOT + sep)
  if (!insideRoot || !existsSync(file) || statSync(file).isDirectory()) {
    file = resolve(ROOT, 'index.html')
  }

  if (!existsSync(file)) {
    sendJson(res, 404, { code: 404, message: '未找到构建产物，请先执行 npm run build', data: null })
    return
  }

  const stat = statSync(file)
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size,
    // HTML 不缓存，assets 带内容指纹的可以直接缓存
    'Cache-Control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=86400'
  })
  createReadStream(file).pipe(res)
}

const server = createServer((req, res) => {
  if (req.url && (req.url === '/api' || req.url.startsWith('/api/'))) {
    proxyApi(req, res)
    return
  }
  serveStatic(req, res)
})

if (!existsSync(resolve(ROOT, 'index.html'))) {
  console.warn('[!] 没有找到 dist/index.html，请先执行: npm run build')
}

server.listen(PORT, HOST, () => {
  console.log('============================================================')
  console.log('  仙钓大陆 · 在线浏览服务已启动（局域网可访问）')
  console.log('------------------------------------------------------------')
  console.log(`  本机访问 : http://localhost:${PORT}`)
  console.log(`  局域网   : http://${LAN_IP}:${PORT}`)
  console.log(`  后端代理 : /api -> ${BACKEND_ORIGIN}`)
  console.log('------------------------------------------------------------')
  console.log('  其它设备打开上面的「局域网」地址即可一起游玩（数据存后端）')
  console.log('  Ctrl + C 停止服务')
  console.log('============================================================')
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[X] 端口 ${PORT} 已被占用，换一个端口：node serve-lan.mjs --port 8082`)
  } else {
    console.error('[X] 服务启动失败：', err.message)
  }
  process.exit(1)
})
