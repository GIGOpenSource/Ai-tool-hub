import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget =
    env.DEV_API_PROXY || env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8000'

  return {
    server: {
      host: true, // 监听 0.0.0.0，便于用局域网 IP 打开前台，API 仍走同源 /api 代理
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/lucide-react/')) return 'vendor-lucide' // 与全量 DynamicLucide 分包，减轻主 chunk
            if (id.includes('node_modules/recharts/')) return 'vendor-recharts' // 仪表盘图表单独 chunk
            if (id.includes('node_modules/motion/')) return 'vendor-motion' // 动画库单独 chunk
            return undefined // 其余走默认拆分
          },
        },
      },
    },
  }
})
