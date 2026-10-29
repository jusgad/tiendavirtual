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

/**
 * Cuánto ha recorrido un elemento la pantalla, de 0 a 1.
 *
 * 0 cuando su borde superior entra por abajo; 1 cuando su borde inferior sale
 * por arriba. Lo usa la banda de transición para mover el sol hacia la luna al
 * ritmo del scroll: el degradado deja de ser decorado y pasa a contar el paso
 * del día.
 *
 * Con «reducir movimiento» se queda quieto a media tarde (0,5): la escena se
 * entiende igual sin que nada se mueva.
 */
export function useProgresoEnPantalla() {
  const ref = useRef(null)
  const [progreso, setProgreso] = useState(0)
  const reducido = usePrefiereMenosMovimiento()

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (reducido) {
      setProgreso(0.5)
      return undefined
    }

    const medir = () => {
      const r = el.getBoundingClientRect()
      // El recorrido total es la altura del elemento más la de la ventana:
      // es lo que tarda en cruzarla de abajo arriba.
      const total = r.height + window.innerHeight
      const avance = (window.innerHeight - r.top) / total
      // Se redondea a dos decimales para que el scroll no provoque un render
      // por píxel: con cien pasos el arco ya se mueve de forma continua, y
      // `setProgreso` no hace nada cuando el valor no cambia.
      const paso = Math.round(Math.min(Math.max(avance, 0), 1) * 100) / 100
      setProgreso(paso)
    }

    medir()
    window.addEventListener('scroll', medir, { passive: true })
    window.addEventListener('resize', medir)
    return () => {
      window.removeEventListener('scroll', medir)
      window.removeEventListener('resize', medir)
    }
  }, [reducido])

  return [ref, progreso]
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

/**
 * ¿Está a la vista la barra de compra fija?
 *
 * Vive aquí y no dentro de `StickyBuyBar` porque hay dos cosas pegadas abajo
 * —la barra y el botón de WhatsApp— y la segunda tiene que apartarse cuando
 * aparece la primera. Con la regla en un solo sitio no pueden discrepar.
 *
 * La barra entra cuando la transición cruza la mitad de la pantalla, que es
 * donde el combo empieza a tener sentido como combo, y se esconde mientras la
 * banda del combo está a la vista: ahí ya hay un botón de compra más grande, y
 * dos iguales a la vez solo estorban.
 *
 * Se decide por posición de scroll y no con `IntersectionObserver`: el
 * observador necesitaba un margen negativo para distinguir «asomó 80 px por
 * abajo» de «llegué», y su entrega se vuelve irregular cuando la pestaña no
 * está visible. Una comparación de coordenadas da el mismo resultado y se
 * puede comprobar leyendo dos números.
 */
export function useBarraDeCompraVisible() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const transicion = document.querySelector('.lp-transicion')
    if (!transicion) return undefined
    const combo = document.getElementById('comprar')

    // Se mide directo en el evento, como hace `useDesplazado`, sin envolverlo
    // en `requestAnimationFrame`: son dos lecturas de posición sin escrituras
    // intercaladas, así que no fuerzan recálculos en cadena, y `setVisible`
    // no hace nada cuando el valor no cambia.
    //
    // La condición se recalcula entera cada vez, sin recordar que ya se llegó:
    // quien vuelve arriba a releer la apertura no debería encontrarse un
    // precio flotando sobre ella, que es justo lo que la banda 2 evita.
    const medir = () => {
      const t = transicion.getBoundingClientRect()
      const alcanzada = t.top < window.innerHeight * 0.5

      const c = combo?.getBoundingClientRect()
      const enCombo = Boolean(c && c.top < window.innerHeight && c.bottom > 0)
      setVisible(alcanzada && !enCombo)
    }

    medir()
    window.addEventListener('scroll', medir, { passive: true })
    window.addEventListener('resize', medir)
    return () => {
      window.removeEventListener('scroll', medir)
      window.removeEventListener('resize', medir)
    }
  }, [])

  return visible
}
