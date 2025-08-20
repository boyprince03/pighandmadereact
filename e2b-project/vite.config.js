import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 讓前端以 /api 開頭的請求，代理到後端 4000
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // 如果你不想讓 path 前綴保留，可以用 rewrite；這裡不需要
        // rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
})
