import { useEffect, useState } from 'react'
import { formatCOP } from '../shared/format.js'
import { PRICE } from '../site.js'

/**
 * El precio del combo, tal como lo tiene el backend.
 *
 * El precio se cambia desde el panel admin, y es el que cobra el checkout.
 * Si la landing lo tuviera escrito a mano, enseñaría uno y cobraría otro.
 * Así que lo pide a la API; `PRICE` de site.js queda solo de respaldo
 * mientras llega la respuesta o si la API no contesta: la landing tiene que
 * verse entera aunque el backend esté caído.
 */
export const SLUG_COMBO = 'estuche-pomass-dia-noche'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/** «$ 89.900» de Intl → «$89.900», el formato de la marca. */
export function precioVisible(producto) {
  const valor = Number(producto?.price)
  if (!Number.isFinite(valor) || valor <= 0) return null
  return formatCOP(valor).replace(/\s/g, '')
}

// Una sola petición por carga de página, la compartan los componentes que la
// compartan (el combo y la barra de compra la piden a la vez).
let pendiente = null

function pedirPrecio() {
  pendiente ??= fetch(`${BASE_URL}/products/${SLUG_COMBO}`, { signal: AbortSignal.timeout?.(6000) })
    .then((r) => (r.ok ? r.json() : null))
    .then((datos) => precioVisible(datos?.product))
    .catch(() => null)
  return pendiente
}

export function usePrecio() {
  const [precio, setPrecio] = useState(PRICE)
  useEffect(() => {
    let vivo = true
    pedirPrecio().then((p) => {
      if (vivo && p) setPrecio(p)
    })
    return () => {
      vivo = false
    }
  }, [])
  return precio
}
