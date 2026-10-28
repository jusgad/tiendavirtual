import { CURRENCY, PRICE, PRODUCTOS, whatsappUrl } from '../site.js'
import Revelar from './Reveal.jsx'
import { IconArrowRight, IconBox, IconCheck, IconLock, IconTruck, IconWhatsApp } from './icons.jsx'
import { antetitulo, btnPrimario, btnSecundario } from './ui.js'

/**
 * Banda 8 · El combo. El único sitio de la página con precio y con compra.
 *
 * El manual pide que Día y Noche juntos se lean como un único combo Día +
 * Noche, sin inventarle otro nombre.
 *
 * Aquí los tubos aparecen por segunda y última vez, pequeños y juntos: no
 * vuelven a presentarse —ya tuvieron su banda cada uno—, solo muestran qué
 * entra en la caja.
 *
 * Las tres promesas de servicio (envío, empaque, pago) estaban repetidas nueve
 * veces en la página. Ahora viven en las preguntas, y aquí queda solo la línea
 * de una sola frase que la decisión de compra sí necesita tener a la vista.
 */
export default function Combo() {
  return (
    <section
      id="comprar"
      aria-labelledby="combo-titulo"
      className="scroll-mt-24 bg-[#FBEBDD] px-4 py-24 sm:px-6 lg:py-32"
    >
      <Revelar className="mx-auto grid max-w-6xl items-center gap-8 overflow-hidden rounded-[2rem] bg-brand-crema p-6 shadow-[0_30px_80px_-40px_rgba(52,53,83,.45)] ring-1 ring-brand-tinta/5 sm:p-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:p-14">
        <div className="lp-combo-visual relative mx-auto aspect-square w-full max-w-[420px]">
          <div aria-hidden="true" className="lp-combo-disco" />
          <img
            src={PRODUCTOS.noche.imagen}
            alt=""
            width="400"
            height="600"
            loading="lazy"
            draggable="false"
            className="lp-combo-tubo lp-combo-tubo-noche"
          />
          <img
            src={PRODUCTOS.dia.imagen}
            alt=""
            width="400"
            height="600"
            loading="lazy"
            draggable="false"
            className="lp-combo-tubo lp-combo-tubo-dia"
          />
          <p className="sr-only">Los dos tubos del combo, Día y Noche, de 50 ml cada uno.</p>
        </div>

        <div>
          <p className={antetitulo}>El combo</p>
          <h2
            id="combo-titulo"
            className="mt-3 font-display text-[clamp(2.6rem,5.2vw,4rem)] font-semibold leading-none tracking-[-.02em]"
          >
            Día <span className="lp-grad-text">+</span> Noche
          </h2>

          <p className="mt-5 flex items-baseline gap-2">
            <span className="font-display text-5xl font-semibold">{PRICE}</span>
            <span className="font-bold text-brand-tinta/70">{CURRENCY}</span>
          </p>
          <p className="mt-1.5 text-sm text-brand-tinta/70">El envío se calcula al pagar, antes de confirmar.</p>

          <ul className="mt-7 space-y-3">
            {['dia', 'noche'].map((id) => (
              <li
                key={id}
                className="flex items-center gap-3 rounded-2xl bg-white/80 p-3 pr-5 ring-1 ring-brand-tinta/5"
              >
                <span
                  className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-full text-white ${
                    id === 'dia' ? 'bg-brand-dia-deep' : 'bg-brand-noche'
                  }`}
                >
                  <IconCheck size={20} />
                </span>
                <span className="text-base">
                  <strong className="font-extrabold">{PRODUCTOS[id].nombre}</strong> · {PRODUCTOS[id].enCombo}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/checkout.html" className={`${btnPrimario} sm:flex-1`}>
              Comprar el combo
              <IconArrowRight size={18} className="lp-flecha" />
            </a>
            <a href={whatsappUrl()} target="_blank" rel="noreferrer" className={btnSecundario}>
              <IconWhatsApp size={20} className="text-[#128C4A]" />
              Dudas por WhatsApp
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </div>

          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-brand-tinta/70">
            <li className="flex items-center gap-1.5">
              <IconTruck size={16} className="text-brand-coral-deep" />
              Envío a todo el país
            </li>
            <li className="flex items-center gap-1.5">
              <IconBox size={16} className="text-brand-coral-deep" />
              Empaque discreto
            </li>
            <li className="flex items-center gap-1.5">
              <IconLock size={16} className="text-brand-coral-deep" />
              Pago seguro
            </li>
          </ul>
        </div>
      </Revelar>
    </section>
  )
}
