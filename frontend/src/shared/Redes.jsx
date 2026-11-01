import { IconFacebook, IconInstagram, IconTikTok } from '../landing/icons.jsx'
import { redesActivas } from '../site.js'

/**
 * Los cuadros de redes sociales. Al picar, abren el perfil en otra pestaña.
 *
 * Solo salen las redes que tienen URL en `site.js` (`redesActivas`): un
 * icono que lleva a un perfil inexistente es peor que no tener el icono.
 * Mientras no haya ninguna, el componente no pinta nada —ni un hueco ni un
 * título suelto—, así que se puede dejar colocado desde ya.
 *
 * Cada cuadro mide 44x44: es el objetivo táctil mínimo cómodo (criterio AAA
 * de WCAG 2.2), y un icono de 20 px dentro de un cuadro de 44 deja margen
 * para no fallar el toque.
 *
 * El icono es decorativo (`aria-hidden` en el SVG), así que el nombre de la
 * red va en un texto solo para lectores de pantalla; si no, el enlace se
 * anunciaría como «enlace» a secas. Y se avisa de que abre otra pestaña,
 * que es lo que pide no sorprender a quien navega con teclado o lector.
 */
const ICONOS = {
  instagram: IconInstagram,
  facebook: IconFacebook,
  tiktok: IconTikTok,
}

export default function Redes({ className = '', sobreOscuro = false }) {
  const redes = redesActivas()
  if (redes.length === 0) return null

  return (
    <ul className={`flex flex-wrap items-center justify-center gap-2 ${className}`}>
      {redes.map(({ id, nombre, url }) => {
        const Icono = ICONOS[id]
        if (!Icono) return null
        return (
          <li key={id}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                sobreOscuro
                  ? 'border-white/30 text-[#FFF7EF] hover:border-white/70 hover:bg-white/10'
                  : 'border-[#E7D9C4] text-[#8A6A4A] hover:border-[#A70B94] hover:bg-[#FFF3DE] hover:text-[#A70B94]'
              }`}
            >
              <Icono size={20} />
              <span className="sr-only">{nombre} (se abre en otra pestaña)</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
