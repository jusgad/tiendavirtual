import { PRICE } from '../site.js'
import Revelar from './Reveal.jsx'
import { IconArrowRight, IconSparkle } from './icons.jsx'

/**
 * Cierre. El manual pide que «Confianza en todo momento.» sea la frase
 * recurrente de la marca, así que vuelve aquí, justo antes del pie.
 */
export default function FinalCta() {
  return (
    <section aria-labelledby="cierre-titulo" className="px-4 pb-20 sm:px-6">
      <Revelar className="lp-cierre relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-brand-tinta px-6 py-16 text-center text-brand-crema sm:px-12 lg:py-24">
        <div aria-hidden="true" className="lp-cierre-luz lp-cierre-luz-1" />
        <div aria-hidden="true" className="lp-cierre-luz lp-cierre-luz-2" />

        <IconSparkle size={28} className="mx-auto text-brand-coral" />
        <h2
          id="cierre-titulo"
          className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2.5rem,5.6vw,4.6rem)] font-semibold leading-[1] tracking-[-.02em]"
        >
          Confianza en <span className="lp-subrayado italic">todo momento.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-brand-crema/80">
          El combo Día + Noche, hecho con amor en Colombia.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/checkout.html"
            className="lp-btn inline-flex min-h-[54px] items-center gap-2 rounded-full bg-brand-crema px-8 text-lg font-extrabold text-brand-tinta shadow-[0_18px_40px_-18px_rgba(0,0,0,.6)]"
          >
            Comprar por {PRICE}
            <IconArrowRight size={18} className="lp-flecha" />
          </a>
          <a
            href="/track.html"
            className="inline-flex min-h-[54px] items-center rounded-full px-6 font-bold text-brand-crema underline-offset-4 hover:underline"
          >
            Seguir mi pedido
          </a>
        </div>
      </Revelar>
    </section>
  )
}
