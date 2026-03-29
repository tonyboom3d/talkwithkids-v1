import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Relative base so the same build works on GitHub project Pages (/user/repo/) and on a custom domain (/)
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
