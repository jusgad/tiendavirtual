import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dentro de un contenedor no hay navegador que abrir, y el intento
    // ensucia el log con un error que no significa nada.
    open: process.env.VITE_NO_OPEN !== 'true',
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        admin: resolve(__dirname, 'admin.html'),
        track: resolve(__dirname, 'track.html'),
        legal: resolve(__dirname, 'legal.html'),
      },
    },
  },
})
