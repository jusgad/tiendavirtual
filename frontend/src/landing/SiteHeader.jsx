import { useEffect, useRef, useState } from 'react'
import Logo from '../shared/Logo.jsx'

// Cada destino es una sección que existe. «Seguir mi pedido» no está aquí:
// vive en el pie, junto a los enlaces legales, porque es para quien ya
// compró y no para quien está decidiendo.
const ENLACES = [
  { href: '#rutina', texto: 'La rutina' },
  { href: '#comprar', texto: 'El combo' },
  { href: '#preguntas', texto: 'Preguntas' },
]

/**
 * Navbar: una píldora de cristal centrada arriba.
 *
 * No está sobre la apertura: ahí la marca ya ocupa la esquina y una barra
 * encima competiría con ella. Aparece cuando se ha bajado el 70 % de la
 * ventana, que es cuando la marca del hero sale de la pantalla.
 *
 * Lleva la marca, tres anclas y el botón de comprar, que el prompt no pide
 * pero que es la acción de la página: sin él, entre la apertura y la banda
 * del ritual no habría forma de comprar sin bajar hasta el final. En móvil,
 * solo la marca y comprar.
 *
 * Escondida no recibe el foco (`inert`): si no, al tabular se navegaría por
 * enlaces invisibles.
 */
export default function SiteHeader() {
  const [visible, setVisible] = useState(false)
  const barra = useRef(null)

  useEffect(() => {
    const medir = () => setVisible(window.scrollY > window.innerHeight * 0.7)
    medir()
    window.addEventListener('scroll', medir, { passive: true })
    window.addEventListener('resize', medir)
    return () => {
      window.removeEventListener('scroll', medir)
      window.removeEventListener('resize', medir)
    }
  }, [])

  useEffect(() => {
    if (barra.current) barra.current.inert = !visible
  }, [visible])

  return (
    <header ref={barra} className={`pm-navbar pm-glass ${visible ? 'is-visible' : ''}`}>
      <Logo alto={30} />
      <nav aria-label="Principal" className="hidden md:block">
        <ul className="flex items-center">
          {ENLACES.map((e) => (
            <li key={e.href}>
              <a href={e.href} className="pm-navlink">
                {e.texto}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {/* 44 px de alto, no 40: es el objetivo táctil mínimo cómodo (criterio
          AAA de WCAG 2.2). Más alto engordaría la píldora de la barra. */}
      <a href="/checkout.html" className="pm-cta !min-h-[44px] !px-5">
        Comprar
      </a>
    </header>
  )
}
