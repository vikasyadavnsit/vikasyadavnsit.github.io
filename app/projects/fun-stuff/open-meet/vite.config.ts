import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  base: './',
  build: {
    outDir: resolve(__dirname, '../../../../public/open-meet'),
    emptyOutDir: true,
  },
})
