import { useRef } from 'react'
import { PRODUCTOS } from '../site.js'
import Revelar from './Reveal.jsx'
import { ICONOS, IconArrowRight, IconMoon, IconSun } from './icons.jsx'
import { antetitulo } from './ui.js'

const MODOS = [
  { id: 'dia', etiqueta: 'Día', Icono: IconSun },
  { id: 'noche', etiqueta: 'Noche', Icono: IconMoon },
]

/**
 * Selector Día / Noche: el corazón interactivo de la página.
 *
 * Día se lee sobre crema teñido de naranja y Noche sobre magenta pleno, como
 * pide el manual —naranja para Día, magenta-morado para Noche—. Ninguno de los
 * dos usa el naranja puro como fondo de texto, porque no llega al contraste
 * mínimo.
 *
 * Son pestañas accesibles de verdad: flechas, Inicio y Fin mueven el foco, y
 * en el celular también se cambia deslizando el dedo sobre la tarjeta.
 *
 * No rota sola. Un carrusel automático le cambia el contenido a quien lo está
 * leyendo.
 */
export default function DayNight({ modo, onModo }) {
  const pestanas = useRef([])
  const inicioToque = useRef(null)
  const producto = PRODUCTOS[modo]
  const esNoche = modo === 'noche'

  const alTeclear = (e, i) => {
    const ultimo = MODOS.length - 1
    const destino = {
      ArrowRight: i === ultimo ? 0 : i + 1,
      ArrowLeft: i === 0 ? ultimo : i - 1,
      Home: 0,
      End: ultimo,
    }[e.key]
    if (destino === undefined) return
    e.preventDefault()
    onModo(MODOS[destino].id)
    pestanas.current[destino]?.focus()
  }

  const alTocar = (e) => {
    inicioToque.current = e.pointerType === 'touch' ? e.clientX : null
  }
  const alSoltar = (e) => {
    if (inicioToque.current === null) return
    const dx = e.clientX - inicioToque.current
    inicioToque.current = null
    // 50 px: menos que eso suele ser un toque impreciso, no un gesto.
    if (Math.abs(dx) < 50) return
    onModo(dx < 0 ? 'noche' : 'dia')
  }

  return (
    <section id="dia-noche" aria-labelledby="dn-titulo" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Revelar className="mx-auto max-w-2xl text-center">
          <p className={antetitulo}>Dos momentos, una rutina</p>
          <h2
            id="dn-titulo"
            className="mt-3 font-display text-[clamp(2.2rem,4.8vw,3.7rem)] font-semibold leading-[1.02] tracking-[-.015em]"
          >
            Una para el día. <span className="lp-grad-text italic">Otra para la noche.</span>
          </h2>
          <p className="mt-4 text-lg text-brand-tinta/75">Toca cada una para conocerla.</p>
        </Revelar>

        <Revelar retraso={100} className="mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label="Elige una crema"
            data-modo={modo}
            className="lp-selector relative grid grid-cols-2 rounded-full bg-white p-1.5 shadow-[0_12px_30px_-18px_rgba(52,53,83,.5)] ring-1 ring-brand-tinta/10"
          >
            <span aria-hidden="true" className="lp-selector-indicador" />
            {MODOS.map(({ id, etiqueta, Icono }, i) => {
              const activo = modo === id
              return (
                <button
                  key={id}
                  ref={(el) => {
                    pestanas.current[i] = el
                  }}
                  id={`pestana-${id}`}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  aria-controls="panel-crema"
                  tabIndex={activo ? 0 : -1}
                  onClick={() => onModo(id)}
                  onKeyDown={(e) => alTeclear(e, i)}
                  className={`relative z-10 inline-flex min-h-[48px] min-w-[128px] items-center justify-center gap-2 rounded-full px-6 text-base font-extrabold transition-colors duration-300 ${
                    activo ? 'text-white' : 'text-brand-tinta/75 hover:text-brand-tinta'
                  }`}
                >
                  <Icono size={18} />
                  {etiqueta}
                </button>
              )
            })}
          </div>
        </Revelar>

        <Revelar retraso={180} className="mt-8">
          <div
            id="panel-crema"
            role="tabpanel"
            aria-labelledby={`pestana-${modo}`}
            onPointerDown={alTocar}
            onPointerUp={alSoltar}
            className={`lp-panel relative grid overflow-hidden rounded-[2rem] md:grid-cols-2 ${
              esNoche ? 'lp-panel-noche' : 'lp-panel-dia'
            }`}
          >
            <div className="relative flex min-h-[340px] items-center justify-center md:min-h-[540px]">
              <div aria-hidden="true" className="lp-panel-halo" />
              {MODOS.map(({ id }) => (
                <img
                  key={id}
                  src={PRODUCTOS[id].imagen}
                  alt={id === modo ? `Tubo de la crema ${PRODUCTOS[id].nombre}, 50 ml` : ''}
                  aria-hidden={id === modo ? undefined : true}
                  width="400"
                  height="600"
                  loading="lazy"
                  draggable="false"
                  className={`lp-panel-tubo ${id === modo ? 'is-activo' : ''}`}
                />
              ))}
            </div>

            <div className="relative flex flex-col justify-center px-6 pb-10 sm:px-10 md:py-12 lg:px-14">
              <p className="lp-panel-chip inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-[.12em]">
                {esNoche ? <IconMoon size={15} /> : <IconSun size={15} />}
                {producto.nombre} · {producto.tipo} · 50 ml
              </p>

              {/* La `key` hace que el titular y la lista vuelvan a entrar con su
                  animación cada vez que se cambia de crema. */}
              <h3
                key={modo}
                className="lp-aparecer mt-5 font-display text-[clamp(2rem,3.8vw,3.1rem)] font-semibold leading-[1.05] tracking-[-.01em]"
              >
                {producto.beneficio}
              </h3>

              <ul key={`${modo}-beneficios`} className="mt-7 space-y-4">
                {producto.beneficios.map(({ icon, text }, i) => {
                  const Icono = ICONOS[icon] ?? ICONOS.check
                  return (
                    <li
                      key={text}
                      className="lp-aparecer flex items-center gap-4 text-[17px] font-semibold"
                      style={{ animationDelay: `${90 + i * 70}ms` }}
                    >
                      <span className="lp-panel-icono inline-flex h-11 w-11 flex-none items-center justify-center rounded-full">
                        <Icono size={20} />
                      </span>
                      {text}
                    </li>
                  )
                })}
              </ul>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href="#comprar"
                  className="lp-panel-cta lp-btn inline-flex min-h-[48px] items-center gap-2 rounded-full px-6 font-extrabold"
                >
                  Viene en el combo
                  <IconArrowRight size={18} className="lp-flecha" />
                </a>
                <button
                  type="button"
                  onClick={() => onModo(esNoche ? 'dia' : 'noche')}
                  className="min-h-[48px] font-bold underline-offset-4 hover:underline"
                >
                  Ver la crema {esNoche ? 'Día' : 'Noche'}
                </button>
              </div>
            </div>
          </div>
        </Revelar>
      </div>
    </section>
  )
}
