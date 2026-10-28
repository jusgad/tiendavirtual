import { useEffect, useRef, useState } from 'react'
import { CURRENCY, PRICE } from '../site.js'
import { IconArrowRight } from './icons.jsx'
import { btnPrimario } from './ui.js'

/**
 * Barra de compra que aparece sola cuando hace falta.
 *
 * No aparece desde el principio a propósito. Las bandas 2 a 4 cuentan la
 * marca, el problema y la crema de día; un precio flotando ahí llega antes de
 * que la persona tenga con qué compararlo, y era parte de por qué el precio se
 * leía cuatro veces en la página.
 *
 * Entra cuando la transición cruza la mitad de la pantalla, que es donde el
 * combo empieza a tener sentido como combo, y se esconde mientras la banda del
 * combo está a la vista: ahí ya hay un botón de compra más grande, y dos
 * iguales a la vez solo estorban.
 *
 * Se decide por posición de scroll y no con `IntersectionObserver`: el
 * observador necesitaba un margen negativo para distinguir «asomó 80 px por
 * abajo» de «llegué», y su entrega se vuelve irregular cuando la pestaña no
 * está visible. Una comparación de coordenadas da el mismo resultado y se
 * puede comprobar leyendo dos números.
 */
export default function StickyBuyBar() {
  const barra = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const transicion = document.querySelector('.lp-transicion')
    const combo = document.getElementById('comprar')
    if (!transicion) return undefined

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

  // Escondida no debe recibir el foco del teclado: se marca `inert`.
  useEffect(() => {
    if (barra.current) barra.current.inert = !visible
  }, [visible])

  return (
    <div
      ref={barra}
      aria-hidden={!visible}
      className={`lp-barra fixed inset-x-0 bottom-0 z-40 border-t border-brand-tinta/10 bg-brand-crema/95 backdrop-blur-md ${
        visible ? 'is-visible' : ''
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">Combo Día + Noche</p>
          <p className="font-display text-xl font-semibold leading-tight">
            {PRICE} <span className="font-sans text-xs font-bold text-brand-tinta/70">{CURRENCY}</span>
          </p>
        </div>
        <a href="/checkout.html" className={`${btnPrimario} !min-h-[48px] !px-6`}>
          Comprar
          <IconArrowRight size={18} className="lp-flecha" />
        </a>
      </div>
    </div>
  )
}
