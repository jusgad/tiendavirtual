import { COMBO, NOMBRE_COMBO, whatsappUrl } from '../site.js'
import { IconArrowRight, IconBox, IconCheck, IconLock, IconTruck, IconWhatsApp } from './icons.jsx'
import { Bloque, Grupo, Item } from './Movimiento.jsx'
import Precio from './Precio.jsx'
import { btnPrimario } from './ui.js'

/**
 * Estado 4 · El cierre. El único sitio de la página con precio y con compra.
 *
 * Dos columnas: el texto a la izquierda y, a la derecha, el producto 3D de
 * vuelta como último protagonista (lo pinta la escena; aquí se le deja
 * sitio). En móvil, el producto arriba y el texto centrado debajo.
 *
 * El prompt quería el cierre sin precio y el precio en la apertura. Aquí es
 * al revés por una decisión anterior al rediseño: la crítica de diseño
 * señaló que el precio se repetía, y se dejó UNA vez, en el sitio donde se
 * decide la compra. La barra fija de abajo lo repite, pero se esconde
 * justamente mientras esta banda está a la vista.
 *
 * Los productos del combo salen del catálogo, y el nombre también: hoy
 * «Día + Noche», como pide el manual.
 */
export default function Combo() {
  return (
    <section id="comprar" aria-labelledby="combo-titulo" className="pm-cierre scroll-mt-24 px-5 pb-6 sm:px-8 lg:px-16">
      {/* En móvil el producto va arriba, sobre el combo: este es su hueco. */}
      <div aria-hidden="true" data-ancla-producto="cierre" className="mx-auto h-[38svh] max-w-6xl lg:hidden" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <Bloque>
            <p className="pm-etiqueta pm-acento">El combo</p>
          </Bloque>
          <Bloque retraso={0.08}>
            <h2 id="combo-titulo" className="pm-titular-xl mt-4">
              {NOMBRE_COMBO.split(' + ').map((nombre, i) => (
                <span key={nombre}>
                  {i > 0 && <span className="lp-grad-text"> + </span>}
                  {nombre}
                </span>
              ))}
            </h2>
          </Bloque>

          <Bloque retraso={0.16}>
            <Precio
              tamano="text-5xl"
              fila="justify-center lg:justify-start"
              texto="mt-6 text-center lg:text-left"
            />
            <p className="pm-suave mt-3 text-sm">El envío se calcula al pagar, antes de confirmar.</p>
          </Bloque>

          <Grupo className="mx-auto mt-8 max-w-md space-y-3 lg:mx-0" retraso={0.2}>
            {COMBO.map((p) => (
              <Item key={p.id} className="pm-glass flex items-center gap-3 rounded-2xl p-3 pr-5 text-left">
                <span
                  className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full text-white"
                  // El color del tubo, oscurecido lo justo para que el
                  // check blanco se lea (el naranja puro no llega a 3:1).
                  style={{ background: `color-mix(in srgb, ${p.color} 78%, #000)` }}
                >
                  <IconCheck size={18} />
                </span>
                <span className="text-base">
                  <strong className="font-extrabold">{p.nombre}</strong> · {p.enCombo}
                </span>
              </Item>
            ))}
          </Grupo>

          <Bloque retraso={0.3}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <a href="/checkout.html" className={`${btnPrimario} w-full sm:w-auto`}>
                Comprar el combo
                <IconArrowRight size={18} className="lp-flecha" />
              </a>
              <a href={whatsappUrl()} target="_blank" rel="noreferrer" className="pm-cta">
                <IconWhatsApp size={18} className="text-[#128C4A]" />
                Dudas por WhatsApp
                <span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
            </div>

            <ul className="pm-suave mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold lg:justify-start">
              <li className="flex items-center gap-1.5">
                <IconTruck size={16} />
                Envío a todo el país
              </li>
              <li className="flex items-center gap-1.5">
                <IconBox size={16} />
                Empaque discreto
              </li>
              <li className="flex items-center gap-1.5">
                <IconLock size={16} />
                Pago seguro
              </li>
            </ul>
          </Bloque>
        </div>

        {/* Columna derecha: sitio para el producto 3D. Vacía a propósito. */}
        <div aria-hidden="true" data-ancla-producto="cierre" className="hidden min-h-[420px] self-stretch lg:block" />
      </div>
    </section>
  )
}
