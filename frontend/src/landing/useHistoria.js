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
  const valores = useRef([])

  useEffect(() => {
    // Ordenadas por valor; a igual valor, en el orden del documento (el
    // `sort` de JavaScript es estable).
    const secciones = Array.from(document.querySelectorAll('[data-historia]')).sort(
      (a, b) => Number(a.dataset.historia) - Number(b.dataset.historia),
    )
    if (secciones.length === 0) return undefined
    valores.current = secciones.map((s) => Number(s.dataset.historia))

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
      crudo.set(historiaEn(window.scrollY + window.innerHeight / 2, centros.current, valores.current))
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

/**
 * El valor de `historia` para una posición de scroll, a partir de los
 * centros de las secciones marcadas y del valor de cada una.
 *
 * Se interpola entre los VALORES de las marcas, no entre sus posiciones en
 * la lista. Así dos secciones seguidas pueden compartir estado: entre sus
 * centros el valor se queda quieto. Es lo que usa la banda de la noche para
 * que el producto no vuelva al frente mientras todavía se leen las
 * preguntas, que van detrás de la confianza.
 *
 * Pura y sin DOM, para poder probarla.
 */
export function historiaEn(posicion, centros, valores) {
  if (centros.length === 0) return 0
  if (posicion <= centros[0]) return valores[0]
  const ultimo = centros.length - 1
  if (posicion >= centros[ultimo]) return valores[ultimo]

  for (let i = 0; i < ultimo; i++) {
    const a = centros[i]
    const b = centros[i + 1]
    if (posicion >= a && posicion <= b) {
      // Una sección de alto 0 mientras cargan las fuentes daría un tramo de
      // 0 y una división por cero, y un NaN congelaría la escena.
      const tramo = b - a
      const t = tramo > 0 ? (posicion - a) / tramo : 0
      return valores[i] + (valores[i + 1] - valores[i]) * t
    }
  }
  return valores[ultimo]
}
