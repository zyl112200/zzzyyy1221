import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 说明：
// - base: './' 让打包后的资源使用相对路径，便于直接双击打开（file://）。
// - build 输出 IIFE（普通 <script> 而非 ES Module），避免 Chrome 在 file:// 下因 CORS 拦截模块脚本。
// - modulePreload 关闭，避免生成需要 modulepreload 的 ESM 预加载文件。
export default defineConfig({
  base: './',
  plugins: [vue()],
    server: {
    port: 5173,
    open: true,
    // 监听所有网卡，局域网内也可访问开发服务器
    host: '0.0.0.0',
    proxy: {
      // 前端请求 /api 转发到 Spring Boot 后端。
      // 指向本机局域网 IP（192.168.68.28）；局域网内其他设备也用该地址访问。
      '/api': {
        target: 'http://192.168.68.28:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'SpongeBobApp',
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
})
