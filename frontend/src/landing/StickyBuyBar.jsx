import { useEffect, useRef, useState } from 'react'
import { CURRENCY, PRICE } from '../site.js'
import { IconArrowRight } from './icons.jsx'
import { btnPrimario } from './ui.js'

/**
 * Barra de compra que aparece sola cuando hace falta.
 *
 * Se esconde mientras se ve el botón de compra del hero o la sección del
 * combo: ahí ya hay un botón a la mano, y dos botones iguales a la vez solo
 * estorban. En el resto de la página queda siempre a un toque.
 */
export default function StickyBuyBar() {
  const barra = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const cta = document.getElementById('hero-cta')
    const combo = document.getElementById('comprar')
    if (!cta || !('IntersectionObserver' in window)) return undefined

    const estado = { cta: true, combo: false }
    const observador = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (entrada.target === cta) estado.cta = entrada.isIntersecting
        if (entrada.target === combo) estado.combo = entrada.isIntersecting
      }
      setVisible(!estado.cta && !estado.combo)
    })
    observador.observe(cta)
    if (combo) observador.observe(combo)
    return () => observador.disconnect()
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
