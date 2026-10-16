
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // O CORS do backend libera só http://localhost:5173: falha em vez de subir em outra porta
  server: {
    port: 5173,
    strictPort: true,
  },
})
