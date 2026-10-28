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
 * La única acción es seguir bajando.
 */
export default function Hero() {
  return (
    <section aria-labelledby="hero-titulo" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="lp-hero-fondo absolute inset-0 -z-10" />
      <AmbientCanvas className="absolute inset-0 -z-10" />

      <div className="mx-auto flex min-h-[86vh] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p className="inline-flex items-center gap-2 rounded-full border border-brand-coral/30 bg-white/70 px-4 py-2 text-[13px] font-extrabold uppercase tracking-[.14em] text-brand-coral-deep backdrop-blur">
          <IconSparkle size={14} />
          Cuidado íntimo · Hecho en Colombia
        </p>

        <h1
          id="hero-titulo"
          className="mt-7 font-display text-[clamp(3.2rem,9vw,7rem)] font-semibold leading-[.92] tracking-[-.025em] text-brand-tinta"
        >
          Confianza
          <span className="lp-grad-text block pb-2 italic">en todo momento.</span>
        </h1>

        <p className="mt-6 max-w-lg text-xl leading-relaxed text-brand-tinta/80">
          Una crema para tu día y otra para tu noche.
        </p>

        <a href="#rutina" className="lp-bajar mt-12 inline-flex flex-col items-center gap-2">
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
