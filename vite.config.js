import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { BACKEND_ORIGIN, DEV_PORT } from './src/config/lan.js'

// 说明：
// - 本项目已改为「在线浏览」形态：由 HTTP 服务（dev / 静态站点）提供页面，
//   局域网内任意设备可通过 http://192.168.68.9:<端口> 访问。
// - server.host / preview.host = 0.0.0.0：监听所有网卡，手机、其他电脑都能连。
// - proxy 把前端的 /api 转发到局域网后端 http://192.168.68.9:8080，
//   浏览器侧始终同源请求，天然没有跨域问题。
const proxy = {
  '/api': {
    target: BACKEND_ORIGIN,
    changeOrigin: true
  }
}

export default defineConfig({
  // 在线浏览使用站点根路径（history / hash 路由均可用）
  base: '/',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: DEV_PORT,
    strictPort: true,
    open: true,
    proxy
  },
  // vite preview 也按「在线站点」方式跑，方便快速验收构建产物
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    proxy
  },
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'XianDiaoApp',
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
