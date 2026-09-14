import { useRef } from 'react'
import { CURRENCY, PRICE, PRODUCTOS } from '../site.js'
import AmbientCanvas from './AmbientCanvas.jsx'
import { usePrefiereMenosMovimiento } from './hooks.js'
import { IconArrowRight, IconDroplet, IconHeart, IconMapPin, IconSparkle } from './icons.jsx'
import { btnPrimario, btnSecundario } from './ui.js'

const DETALLES = [
  { Icono: IconHeart, texto: 'Hecho en Colombia' },
  { Icono: IconDroplet, texto: 'Dos tubos de 50 ml' },
  { Icono: IconMapPin, texto: 'Sigue tu pedido en línea' },
]

/**
 * Primera pantalla. Sigue la jerarquía del manual: el lema es el titular, y
 * justo debajo los dos beneficios funcionales, cada uno con su color.
 *
 * Los tubos se inclinan siguiendo el ratón y son botones: tocarlos lleva a
 * esa crema en el selector de más abajo.
 */
export default function Hero({ onVerModo }) {
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
    el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 16).toFixed(2)}deg`)
  }
  const enderezar = () => {
    escenario.current?.style.setProperty('--rx', '0deg')
    escenario.current?.style.setProperty('--ry', '0deg')
  }

  return (
    <section aria-labelledby="hero-titulo" className="relative isolate">
      <div aria-hidden="true" className="lp-hero-fondo absolute inset-0 -z-10" />
      <AmbientCanvas className="absolute inset-0 -z-10" />

      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-16 pt-8 sm:px-6 md:pt-12 lg:grid-cols-[1.08fr_.92fr] lg:gap-4 lg:pb-24">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-coral/30 bg-white/70 px-4 py-2 text-[13px] font-extrabold uppercase tracking-[.14em] text-brand-coral-deep backdrop-blur">
            <IconSparkle size={14} />
            Combo Día + Noche
          </p>

          <h1
            id="hero-titulo"
            className="mt-6 font-display text-[clamp(3rem,7.2vw,5.6rem)] font-semibold leading-[.95] tracking-[-.02em] text-brand-tinta"
          >
            Confianza
            <span className="lp-grad-text block pb-2 italic">en todo momento.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-brand-tinta/80 lg:mx-0">
            Dos cremas íntimas para tu rutina.{' '}
            <strong className="font-extrabold text-brand-dia-deep">Día</strong> neutraliza olores indeseados y{' '}
            <strong className="font-extrabold text-brand-noche">Noche</strong> es la crema íntima blanqueadora.
          </p>

          <p className="mt-7 flex items-baseline justify-center gap-2 lg:justify-start">
            <span className="font-display text-4xl font-semibold text-brand-tinta">{PRICE}</span>
            <span className="text-sm font-bold text-brand-tinta/70">{CURRENCY} · las dos cremas</span>
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a id="hero-cta" href="/checkout.html" className={btnPrimario}>
              Comprar el combo
              <IconArrowRight size={18} className="lp-flecha" />
            </a>
            <a href="#dia-noche" className={btnSecundario}>
              Conocer Día y Noche
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-bold text-brand-tinta/75 lg:justify-start">
            {DETALLES.map(({ Icono, texto }) => (
              <li key={texto} className="flex items-center gap-1.5">
                <Icono size={17} className="text-brand-coral-deep" />
                {texto}
              </li>
            ))}
          </ul>
        </div>

        <div
          ref={escenario}
          onPointerMove={inclinar}
          onPointerLeave={enderezar}
          className="lp-escenario relative mx-auto aspect-[5/4] w-full max-w-[540px]"
        >
          <div aria-hidden="true" className="lp-halo lp-halo-dia" />
          <div aria-hidden="true" className="lp-halo lp-halo-noche" />
          <div aria-hidden="true" className="lp-sombra" />

          <div className="lp-tubos">
            {/* Noche va primero en el DOM para quedar detrás de Día. */}
            <button
              type="button"
              onClick={() => onVerModo('noche')}
              aria-label="Conocer la crema Noche"
              className="lp-tubo lp-tubo-noche"
            >
              <img src={PRODUCTOS.noche.imagen} alt="" width="400" height="600" draggable="false" />
              <span className="lp-tubo-etiqueta">Noche</span>
            </button>
            <button
              type="button"
              onClick={() => onVerModo('dia')}
              aria-label="Conocer la crema Día"
              className="lp-tubo lp-tubo-dia"
            >
              <img
                src={PRODUCTOS.dia.imagen}
                alt=""
                width="400"
                height="600"
                draggable="false"
                fetchpriority="high"
              />
              <span className="lp-tubo-etiqueta">Día</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
