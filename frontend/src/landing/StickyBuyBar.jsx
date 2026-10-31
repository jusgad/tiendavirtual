import { useEffect, useRef } from 'react'
import { CURRENCY, NOMBRE_COMBO } from '../site.js'
import { usePrecio } from './precio.js'
import { useBarraDeCompraVisible } from './hooks.js'
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
 * Cuándo entra y cuándo se esconde lo decide `useBarraDeCompraVisible`, que
 * está en `hooks.js` porque el botón de WhatsApp necesita la misma respuesta
 * para apartarse.
 */
export default function StickyBuyBar() {
  const barra = useRef(null)
  const visible = useBarraDeCompraVisible()
  const precio = usePrecio()

  // Escondida no debe recibir el foco del teclado: se marca `inert`.
  useEffect(() => {
    if (barra.current) barra.current.inert = !visible
  }, [visible])

  return (
    <div
      ref={barra}
      aria-hidden={!visible}
      className={`lp-barra fixed inset-x-0 bottom-0 z-40 border-t border-brand-tinta/10 bg-brand-crema/95 text-brand-tinta backdrop-blur-md ${
        visible ? 'is-visible' : ''
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">Combo {NOMBRE_COMBO}</p>
          <p className="font-display text-xl font-semibold leading-tight">
            {precio} <span className="font-sans text-xs font-bold text-brand-tinta/70">{CURRENCY}</span>
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
