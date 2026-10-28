import { useRef } from 'react'
import { PRODUCTOS } from '../site.js'
import Revelar from './Reveal.jsx'
import { usePrefiereMenosMovimiento } from './hooks.js'
import { ICONOS, IconCheck, IconMoon, IconSun } from './icons.jsx'

/**
 * Bandas 4 y 6 · Cada crema en su momento del día.
 *
 * Antes las dos vivían dentro de un mismo selector de pestañas, y eso obligaba
 * a repetir los dos beneficios juntos cada vez que se las nombraba. Separadas,
 * cada una dice su beneficio una sola vez en toda la página.
 *
 * El color lo fija el manual: naranja para Día, magenta-morado para Noche.
 * Pero el naranja puro no sirve de fondo —texto blanco sobre él da 3,0:1 y el
 * mínimo es 4,5:1—, así que Día va sobre un durazno claro con texto tinta
 * (11:1) y reserva el naranja para los acentos. Magenta sí aguanta de fondo:
 * crema sobre magenta da 6,4:1.
 *
 * `invertido` alterna el lado del tubo entre una banda y otra, para que el ojo
 * no recorra dos pantallas idénticas seguidas.
 */
export default function Crema({ modo, invertido = false }) {
  const producto = PRODUCTOS[modo]
  const esNoche = modo === 'noche'
  const Icono = esNoche ? IconMoon : IconSun
  const escenario = useRef(null)
  const reducido = usePrefiereMenosMovimiento()

  // La inclinación se escribe en variables CSS y no en el estado de React:
  // mover el ratón no debe volver a renderizar el componente en cada píxel.
  const inclinar = (e) => {
    const el = escenario.current
    if (reducido || e.pointerType === 'touch' || !el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 9).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`)
  }
  const enderezar = () => {
    escenario.current?.style.setProperty('--rx', '0deg')
    escenario.current?.style.setProperty('--ry', '0deg')
  }

  return (
    <section
      id={modo}
      aria-labelledby={`${modo}-titulo`}
      className={`lp-crema scroll-mt-24 overflow-hidden px-4 py-20 sm:px-6 lg:py-28 ${
        esNoche ? 'lp-panel-noche' : 'lp-panel-dia'
      }`}
    >
      <div
        className={`mx-auto grid max-w-6xl items-center gap-10 lg:gap-16 ${
          invertido ? 'lg:grid-cols-[1fr_.95fr]' : 'lg:grid-cols-[.95fr_1fr]'
        }`}
      >
        <div
          ref={escenario}
          onPointerMove={inclinar}
          onPointerLeave={enderezar}
          className={`lp-escenario relative mx-auto aspect-square w-full max-w-[460px] ${
            invertido ? 'lg:order-2' : ''
          }`}
        >
          <div aria-hidden="true" className="lp-panel-halo lp-crema-halo" />
          <div className="lp-crema-tubo-caja">
            <img
              src={producto.imagen}
              alt={`Tubo de la crema ${producto.nombre} de PomAss, 50 ml`}
              width="400"
              height="600"
              loading="lazy"
              draggable="false"
              className="lp-crema-tubo"
            />
          </div>
        </div>

        <div className={invertido ? 'lg:order-1' : ''}>
          <Revelar>
            <p className="lp-panel-chip inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-[.12em]">
              <Icono size={15} />
              {producto.nombre} · {producto.tipo} · 50 ml
            </p>

            <h2
              id={`${modo}-titulo`}
              className="mt-5 font-display text-[clamp(2.3rem,5vw,3.8rem)] font-semibold leading-[1.02] tracking-[-.015em]"
            >
              {producto.beneficio}
            </h2>

            <p className="mt-5 max-w-md text-lg leading-relaxed opacity-85">{producto.cuando}</p>
          </Revelar>

          <Revelar retraso={120}>
            <ul className="mt-8 space-y-3.5">
              {producto.beneficios.map(({ icon, text }) => {
                const IconoBeneficio = ICONOS[icon] ?? IconCheck
                return (
                  <li key={text} className="flex items-center gap-4 text-[17px] font-semibold">
                    <span className="lp-panel-icono inline-flex h-11 w-11 flex-none items-center justify-center rounded-full">
                      <IconoBeneficio size={20} />
                    </span>
                    {text}
                  </li>
                )
              })}
            </ul>
          </Revelar>
        </div>
      </div>
    </section>
  )
}
