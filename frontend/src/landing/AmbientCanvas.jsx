import { useEffect, useRef } from 'react'

/**
 * Ambiente 3D del hero: halos de color que respiran, motas que suben y
 * destellos de cuatro puntas —el mismo ✦ del empaque— detrás del contenido.
 *
 * Es decoración pura, así que está hecho para no estorbar nunca:
 * - Three.js vive en otro archivo que se descarga aparte y solo cuando el
 *   navegador está libre. No retrasa el titular ni el botón de compra.
 * - Si no hay WebGL, o el archivo no carga, no pasa nada: debajo queda un
 *   degradado en CSS con los mismos colores.
 * - Con «reducir movimiento» activado se pinta un cuadro fijo y no se anima.
 */
export default function AmbientCanvas({ className = '' }) {
  const contenedor = useRef(null)

  useEffect(() => {
    const el = contenedor.current
    if (!el) return undefined

    let cancelado = false
    let desmontar = null
    const reducido = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

    const arrancar = async () => {
      try {
        const { crearAmbiente } = await import('./ambiente/escena.js')
        // Si el componente se desmontó mientras se descargaba, no se monta nada.
        if (cancelado) return
        desmontar = crearAmbiente(el, { reducido })
      } catch {
        // Sin WebGL o sin conexión: se queda el degradado CSS de debajo.
      }
    }

    const conIdle = typeof window.requestIdleCallback === 'function'
    const espera = conIdle
      ? window.requestIdleCallback(arrancar, { timeout: 1500 })
      : window.setTimeout(arrancar, 400)

    return () => {
      cancelado = true
      if (conIdle) window.cancelIdleCallback(espera)
      else window.clearTimeout(espera)
      desmontar?.()
    }
  }, [])

  return <div ref={contenedor} aria-hidden="true" className={`pointer-events-none ${className}`} />
}
