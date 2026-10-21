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
    proxy: {
      // 前端请求 /api 转发到 Spring Boot 后端
      '/api': {
        target: 'http://localhost:8080',
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
