import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  main: {
    entry: 'src/main/index.ts',
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main'
    }
  },
  preload: {
    input: {
      index: resolve(rootDir, 'src/preload/index.ts')
    },
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload'
    }
  },
  renderer: {
    root: resolve(rootDir, 'src/renderer'),
    plugins: [vue()],
    resolve: {
      alias: {
        '@renderer': resolve(rootDir, 'src/renderer/src')
      }
    },
    build: {
      outDir: resolve(rootDir, 'dist'),
      emptyOutDir: true
    }
  }
})
