import { useEffect, useRef, useState } from 'react'

const MENOS_MOVIMIENTO = '(prefers-reduced-motion: reduce)'

/**
 * ¿La persona pidió en su sistema reducir el movimiento?
 *
 * Hay quien se marea con animaciones grandes o con parallax. Cuando lo pide,
 * la landing sigue funcionando igual pero sin desplazamientos ni rebotes.
 */
export function usePrefiereMenosMovimiento() {
  const [reducido, setReducido] = useState(
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(MENOS_MOVIMIENTO).matches),
  )

  useEffect(() => {
    const consulta = window.matchMedia?.(MENOS_MOVIMIENTO)
    if (!consulta) return undefined
    const alCambiar = () => setReducido(consulta.matches)
    consulta.addEventListener?.('change', alCambiar)
    return () => consulta.removeEventListener?.('change', alCambiar)
  }, [])

  return reducido
}

/**
 * Avisa cuando un elemento entra en pantalla. Por defecto solo una vez: lo
 * que ya apareció no vuelve a esconderse al subir.
 */
export function useEnPantalla({ margen = '0px 0px -10% 0px', umbral = 0.12 } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return undefined
    }
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true)
          observador.disconnect()
        }
      },
      { rootMargin: margen, threshold: umbral },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [margen, umbral])

  return [ref, visible]
}

/** ¿Ya se bajó más de `umbral` píxeles? Sirve para condensar la cabecera. */
export function useDesplazado(umbral = 12) {
  const [desplazado, setDesplazado] = useState(false)

  useEffect(() => {
    const alDesplazar = () => setDesplazado(window.scrollY > umbral)
    alDesplazar()
    window.addEventListener('scroll', alDesplazar, { passive: true })
    return () => window.removeEventListener('scroll', alDesplazar)
  }, [umbral])

  return desplazado
}
