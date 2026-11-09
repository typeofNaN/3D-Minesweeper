import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/3D-Minesweeper/' : '/',
  server: {
    port: 3000
  }
}))
