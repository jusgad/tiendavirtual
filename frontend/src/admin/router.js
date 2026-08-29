// Enrutador mínimo sobre el hash de la URL. Da enlaces profundos y botón atrás
// sin añadir dependencias. Si el panel creciera mucho, migrar a react-router
// es directo: `useRoute` es el único punto de contacto de las pantallas.

import { useEffect, useState } from 'react'

// Cada ruta es una lista de segmentos; los que empiezan por ":" son parámetros.
const RUTAS = [
  { name: 'pedidos', segmentos: ['pedidos'] },
  { name: 'pedido', segmentos: ['pedidos', ':id'] },
  { name: 'productos', segmentos: ['productos'] },
  { name: 'taxonomia', segmentos: ['taxonomia'] },
  { name: 'cupones', segmentos: ['cupones'] },
  { name: 'reportes', segmentos: ['reportes'] },
]

const POR_DEFECTO = { name: 'pedidos', params: {} }

/** Traduce un hash a `{ name, params }`. Lo desconocido cae en la lista de pedidos. */
export function parseHash(hash) {
  const partes = String(hash).replace(/^#/, '').split('/').filter(Boolean)
  if (partes.length === 0) return POR_DEFECTO

  for (const ruta of RUTAS) {
    if (ruta.segmentos.length !== partes.length) continue

    const params = {}
    const coincide = ruta.segmentos.every((segmento, i) => {
      if (segmento.startsWith(':')) {
        params[segmento.slice(1)] = partes[i]
        return true
      }
      return segmento === partes[i]
    })

    if (coincide) return { name: ruta.name, params }
  }

  return POR_DEFECTO
}

/** Cambia de ruta. Acepta "pedidos" o "pedidos/abc-123". */
export function navigate(path) {
  window.location.hash = `#/${String(path).replace(/^#?\/?/, '')}`
}

/** Ruta actual, reactiva a la navegación del usuario y al botón atrás. */
export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const alCambiar = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  return route
}
