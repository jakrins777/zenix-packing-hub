import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // สั่งให้ Vite ช่วยส่ง request ที่ขึ้นต้นด้วย /api ไปหา Backend ให้หน่อย
      '/api': 'http://localhost:5000'
    }
  }
})