import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import path from 'path'

// Standard Vite+Electron configuration
export default defineConfig({
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main.js',
        vite: {
          build: {
            ssr: true,
            target: 'node20',
            rollupOptions: {
              external: ['electron-updater', 'electron', 'fs', 'path', 'url', 'crypto', 'http', 'https', 'os', 'child_process'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].js',
              }
            },
          },
        },
      },
      {
        entry: 'electron/preload.cjs',
        onstart(options) {
          options.reload()
        },
      }
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000, // Silence warnings for large library chunks
  },
  base: './', // Force relative paths for Electron portability
  server: {
    port: 5173,
    strictPort: true,
  }
})
