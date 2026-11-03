import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import obfuscator from 'vite-plugin-javascript-obfuscator'

// Dentro del contenedor, el código entra por un montaje desde Windows, y los
// avisos de fichero modificado no cruzan esa frontera: Vite no se enteraba de
// ningún cambio y había que reiniciar el contenedor para ver una edición.
// Sondear cuesta algo de CPU, así que solo se activa ahí.
const enContenedor = process.env.VITE_NO_OPEN === 'true'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Solo en `vite build` (nunca en `vite dev`, que necesita el código
    // legible para HMR y DevTools). Ajustes moderados: renombra identificadores
    // y codifica cadenas de texto, pero sin "control flow flattening" ni
    // autodefensa, que son las opciones que más CPU consumen en el navegador
    // y que esta landing no se puede permitir por el LCP (ver Hero.jsx).
    obfuscator({
      apply: 'build',
      options: {
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        stringArray: true,
        stringArrayThreshold: 0.5,
        stringArrayEncoding: ['base64'],
        controlFlowFlattening: false,
        deadCodeInjection: false,
        selfDefending: false,
        debugProtection: false,
        disableConsoleOutput: true,
      },
    }),
  ],
  server: {
    port: 5173,
    // Dentro de un contenedor no hay navegador que abrir, y el intento
    // ensucia el log con un error que no significa nada.
    open: !enContenedor,
    watch: enContenedor ? { usePolling: true, interval: 300 } : undefined,
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
