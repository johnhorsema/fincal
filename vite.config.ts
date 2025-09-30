import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env': 'process.env'
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    rollupOptions: {
      external: ['server/**/*'],
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          ui: ['@headlessui/vue', '@heroicons/vue'],
          utils: ['date-fns', 'lodash-es'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['vue', 'vue-router'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})