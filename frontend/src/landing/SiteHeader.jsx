import { useEffect, useState } from 'react'
import Logo from '../shared/Logo.jsx'
import { useDesplazado } from './hooks.js'
import { IconClose, IconMenu } from './icons.jsx'
import { btnPrimario } from './ui.js'

// Cada destino es una banda que existe. Al separar Día y Noche en dos bandas
// propias desapareció `#dia-noche`, que era a donde apuntaba el menú antes.
const ENLACES = [
  { href: '#rutina', texto: 'La rutina' },
  { href: '#comprar', texto: 'El combo' },
  { href: '#preguntas', texto: 'Preguntas' },
  { href: '/track.html', texto: 'Seguir mi pedido' },
]

/**
 * Cabecera fija. Transparente sobre el hero y con fondo crema en cuanto se
 * baja, para que el menú se siga leyendo encima de cualquier sección.
 *
 * El botón de compra está siempre a la vista: es la acción de la página.
 */
export default function SiteHeader() {
  const desplazado = useDesplazado(24)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!abierto) return undefined
    const alTeclear = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [abierto])

  const conFondo = desplazado || abierto

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,box-shadow] duration-300 ${
        conFondo
          ? 'bg-brand-crema/90 shadow-[0_10px_30px_-20px_rgba(52,53,83,.45)] backdrop-blur-md'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo alto={42} />

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {ENLACES.map((e) => (
              <li key={e.href}>
                <a href={e.href} className="lp-navlink rounded-full px-4 py-2.5 text-[15px] font-bold text-brand-tinta">
                  {e.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5">
          <a href="/checkout.html" className={`${btnPrimario} !min-h-[44px] !px-5 !text-[15px]`}>
            Comprar
          </a>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-movil"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-tinta transition-colors hover:bg-brand-tinta/5 md:hidden"
          >
            {abierto ? <IconClose size={22} /> : <IconMenu size={22} />}
          </button>
        </div>
      </div>

      <nav id="menu-movil" aria-label="Menú" hidden={!abierto} className="border-t border-brand-tinta/10 md:hidden">
        <ul className="px-4 py-2">
          {ENLACES.map((e) => (
            <li key={e.href}>
              <a
                href={e.href}
                onClick={() => setAbierto(false)}
                className="flex min-h-[48px] items-center rounded-xl px-3 text-base font-bold text-brand-tinta hover:bg-brand-tinta/5"
              >
                {e.texto}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
