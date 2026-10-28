import AmbientCanvas from './AmbientCanvas.jsx'
import { IconArrowDown, IconSparkle } from './icons.jsx'

/**
 * Banda 2 · La apertura. Amanecer.
 *
 * Su único trabajo es la promesa emocional de la marca. Aquí NO va el precio,
 * ni los beneficios funcionales, ni los tubos: cada uno tiene su banda más
 * abajo, y tenerlos aquí era la causa de que la página repitiera el mismo
 * argumento cinco veces.
 *
 * El manual pide que el logo y el producto respiren, y pone el lema en el
 * segundo nivel de la jerarquía, justo después de la marca. Esta banda es
 * exactamente ese nivel: tipografía, luz y nada más.
 *
 * Entra escalonada, de arriba abajo, para que la lectura siga el mismo orden
 * que la jerarquía. Es la única parte de la página que se anima al cargar; el
 * resto espera a que la persona baje.
 *
 * La única acción es seguir bajando.
 */

// Cada pieza entra 110 ms después de la anterior: lo justo para que se lea
// como una secuencia y no como un retraso.
const paso = (n) => ({ '--d': `${n * 110}ms` })

export default function Hero() {
  return (
    <section aria-labelledby="hero-titulo" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="lp-hero-fondo absolute inset-0 -z-10" />
      <AmbientCanvas className="absolute inset-0 -z-10" />

      <div className="mx-auto flex min-h-[86vh] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p
          style={paso(0)}
          className="lp-entrada inline-flex items-center gap-2 rounded-full border border-brand-coral/30 bg-white/70 px-4 py-2 text-[13px] font-extrabold uppercase tracking-[.14em] text-brand-coral-deep backdrop-blur"
        >
          <IconSparkle size={14} />
          Cuidado íntimo · Hecho en Colombia
        </p>

        <h1
          id="hero-titulo"
          className="mt-7 font-display text-[clamp(3.2rem,9vw,7rem)] font-semibold leading-[.92] tracking-[-.025em] text-brand-tinta"
        >
          <span style={paso(1)} className="lp-entrada block">
            Confianza
          </span>
          <span style={paso(2)} className="lp-entrada lp-grad-text block pb-2 italic">
            en todo momento.
          </span>
        </h1>

        <p style={paso(3)} className="lp-entrada mt-6 max-w-lg text-xl leading-relaxed text-brand-tinta/80">
          Una crema para tu día y otra para tu noche.
        </p>

        <a
          href="#rutina"
          style={paso(4)}
          className="lp-entrada lp-bajar mt-12 inline-flex flex-col items-center gap-2"
        >
          <span className="text-sm font-extrabold uppercase tracking-[.14em] text-brand-tinta/70">
            Conoce la rutina
          </span>
          <span className="lp-bajar-circulo inline-flex h-12 w-12 items-center justify-center rounded-full border border-brand-tinta/15 bg-white/70 text-brand-coral-deep backdrop-blur">
            <IconArrowDown size={20} />
          </span>
        </a>
      </div>
    </section>
  )
}
