import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173, // 🌟 ล็อกพอร์ตไว้เลย
    strictPort: true, // 🌟 ห้ามเปลี่ยนพอร์ตหนี
    hmr: {
      protocol: 'wss', // 🌟 บังคับใช้ Secure WebSocket (อันนี้แหละที่มักจะแก้ปัญหาจอเทาได้!)
      clientPort: 443
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    }
  }
})