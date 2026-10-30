import { useEffect, useMemo, useRef } from 'react'
import { useMotionValue, useScroll, useSpring, useVelocity } from 'framer-motion'

/**
 * Convierte el scroll en los dos valores que mueven toda la escena.
 *
 * `historia` (0…4) dice en qué punto del recorrido estamos, y `rafaga`
 * (−1…1) con cuánto ímpetu se está bajando o subiendo.
 *
 * Son `MotionValue` y no estado de React a propósito: la escena los lee en
 * cada fotograma con `.get()`. Si fueran estado, cada píxel de scroll
 * provocaría un render de todo el árbol.
 *
 * El valor es **continuo**, no un índice: se mide el centro de cada sección y
 * se interpola según dónde cae el centro de la ventana respecto a esos
 * centros. Vale 0 con el hero centrado, 1 con la segunda sección centrada, y
 * así. Lo que hay entre medias es lo que hace que la escena fluya en vez de
 * saltar.
 */
export function useHistoria() {
  const { scrollY } = useScroll()

  // Crudo: lo que dicen las mediciones. Suave: lo que lee la escena.
  const crudo = useMotionValue(0)
  const historia = useSpring(crudo, { stiffness: 60, damping: 20 })

  const velocidad = useVelocity(scrollY)
  const velocidadSuave = useSpring(velocidad, { stiffness: 40, damping: 25 })
  const rafaga = useMotionValue(0)

  const centros = useRef([])

  useEffect(() => {
    const secciones = Array.from(document.querySelectorAll('[data-historia]')).sort(
      (a, b) => Number(a.dataset.historia) - Number(b.dataset.historia),
    )
    if (secciones.length === 0) return undefined

    // Se re-mide con `ResizeObserver` porque las alturas cambian cuando
    // terminan de cargar las fuentes y las imágenes: medir una sola vez al
    // montar deja los centros desplazados y la escena a destiempo.
    const medir = () => {
      const desplazamiento = window.scrollY
      centros.current = secciones.map((s) => {
        const caja = s.getBoundingClientRect()
        return caja.top + desplazamiento + caja.height / 2
      })
      calcular()
    }

    const calcular = () => {
      const lista = centros.current
      if (lista.length === 0) return
      const centroVentana = window.scrollY + window.innerHeight / 2

      if (centroVentana <= lista[0]) return crudo.set(0)
      const ultimo = lista.length - 1
      if (centroVentana >= lista[ultimo]) return crudo.set(ultimo)

      for (let i = 0; i < ultimo; i++) {
        const a = lista[i]
        const b = lista[i + 1]
        if (centroVentana >= a && centroVentana <= b) {
          // `b - a` nunca es 0 aquí: son centros de secciones distintas, y
          // aun así se protege, porque una sección de alto 0 mientras cargan
          // las fuentes daría NaN y congelaría la escena.
          const tramo = b - a
          return crudo.set(i + (tramo > 0 ? (centroVentana - a) / tramo : 0))
        }
      }
    }

    medir()
    window.addEventListener('scroll', calcular, { passive: true })
    window.addEventListener('resize', medir)
    const observador =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    secciones.forEach((s) => observador?.observe(s))

    return () => {
      window.removeEventListener('scroll', calcular)
      window.removeEventListener('resize', medir)
      observador?.disconnect()
    }
  }, [crudo])

  // La ráfaga normaliza la velocidad a −1…1. 2000 px/s es un scroll decidido;
  // por encima se satura, para que un golpe de rueda no dispare la escena.
  useEffect(() => {
    return velocidadSuave.on('change', (v) => {
      rafaga.set(Math.max(-1, Math.min(1, v / 2000)))
    })
  }, [velocidadSuave, rafaga])

  return useMemo(() => ({ historia, rafaga }), [historia, rafaga])
}
