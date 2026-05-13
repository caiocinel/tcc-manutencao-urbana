// Configuração do Vite - build, PWA, proxy para backend
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        short_name: 'CIU',
        name: 'Central de Inteligência Urbana',
        description: 'Sistema de abertura e gestão de chamados para serviços públicos',
        icons: [
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
          { src: '/icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
        start_url: '.',
        display: 'standalone',
        background_color: '#0d0d0f',
        theme_color: '#0d0d0f',
        orientation: 'portrait-primary',
        lang: 'pt-BR',
        categories: ['government', 'utilities'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    // Proxy para API e uploads em desenvolvimento (evita CORS)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
