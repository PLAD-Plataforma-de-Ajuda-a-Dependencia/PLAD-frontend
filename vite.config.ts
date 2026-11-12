
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
  build: {
    // Só o pedaço da sala ao vivo passa de 500 kB (~634 kB em 2026-11, ~80% dele é o SDK livekit-client, que sozinho
    // tem ~500 kB e não dá para dividir). Ele já é carregado sob demanda (React.lazy em App.tsx): só quem abre
    // /reuniao/:id baixa. O bundle principal fica em ~275 kB. O limite fica logo acima da sala para o aviso continuar
    // valendo para qualquer outro pedaço que cresça
    chunkSizeWarningLimit: 650,
  },
})
