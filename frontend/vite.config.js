import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  define: {
    global: 'window',
  },
  optimizeDeps:{
    include:['buffer', 'process']
  },
  plugins: [react()],
})
