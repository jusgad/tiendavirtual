import { useEffect, useRef } from 'react'
import { ESTADO_OSCURO, atmosferaEn } from './historia.js'

/**
 * El degradado de fondo, fijo detrás del canvas.
 *
 * Escribe directamente en las variables CSS del elemento en cada cambio de
 * `historia`, sin pasar por el estado de React: repintar un degradado es
 * barato, re-renderizar el árbol entero en cada píxel de scroll no.
 *
 * También marca `.pm-oscuro` en la raíz cuando el fondo se vuelve magenta,
 * que es lo que hace que el texto y el glass se aclaren. Esa clase no la
 * pone cada sección por su cuenta: el fondo es continuo y el texto tiene que
 * cambiar en el mismo punto, no cuando empiece el siguiente bloque.
 */
export default function Atmosfera({ historia, raiz }) {
  const capa = useRef(null)

  useEffect(() => {
    const pintar = (valor) => {
      const { top, bottom, glow } = atmosferaEn(valor)
      const el = capa.current
      if (!el) return
      el.style.setProperty('--pm-bg-top', top)
      el.style.setProperty('--pm-bg-bottom', bottom)
      el.style.setProperty('--pm-glow', glow)
      raiz?.current?.classList.toggle('pm-oscuro', valor >= ESTADO_OSCURO)
    }

    pintar(historia.get())
    return historia.on('change', pintar)
  }, [historia, raiz])

  // Decorativa: no aporta nada a quien escucha la página.
  return <div ref={capa} className="pm-atmosfera" aria-hidden="true" />
}
