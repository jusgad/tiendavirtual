import Logo from '../shared/Logo.jsx'
import Revelar from './Reveal.jsx'
import { IconBox, IconHeart, IconSun } from './icons.jsx'
import { antetitulo } from './ui.js'

/**
 * Banda 7 · Quién la hace.
 *
 * La otra banda que faltaba. Las páginas de referencia construyen confianza
 * con comités médicos, estándares y miles de reseñas; PomAss no tiene nada de
 * eso todavía y no se inventa. Lo que sí tiene es algo que ellas no: una
 * persona con nombre y un país.
 *
 * Todo lo que se afirma aquí es verificable. Cuando Paola quiera contar por
 * qué creó la marca, su sitio es el párrafo de abajo: es lo que más confianza
 * genera y ninguna competidora colombiana lo tiene.
 */
const HECHOS = [
  {
    Icono: IconHeart,
    titulo: 'Hecha en Colombia',
    texto: 'Marca colombiana, de una mujer colombiana.',
  },
  {
    Icono: IconBox,
    titulo: 'Llega sin marca visible',
    texto: 'Si lo pides al pagar, nadie sabe qué hay dentro de la caja. No es un extra: es parte de por qué existe PomAss.',
  },
  {
    Icono: IconSun,
    titulo: 'Una rutina de dos pasos',
    texto: 'Uno en la mañana y uno antes de dormir. Nada más que aprender.',
  },
]

export default function Marca() {
  return (
    <section aria-labelledby="marca-titulo" className="px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-5xl">
        <Revelar className="text-center">
          <p className={antetitulo}>Quién está detrás</p>
          <h2
            id="marca-titulo"
            className="mt-4 font-display text-[clamp(2.2rem,5vw,3.6rem)] font-semibold leading-[1.03] tracking-[-.02em]"
          >
            Detrás de PomAss hay una persona, <span className="lp-grad-text italic">no un laboratorio.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-brand-tinta/80">
            PomAss es una marca colombiana creada por Pao Díaz. Dos cremas de 50 ml, pensadas para usarse
            a diario sin complicarse la vida.
          </p>
          <Logo alto={40} className="mx-auto mt-8" />
        </Revelar>

        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {HECHOS.map(({ Icono, titulo, texto }, i) => (
            <Revelar
              as="li"
              key={titulo}
              retraso={i * 100}
              className="rounded-3xl bg-white/70 p-7 ring-1 ring-brand-tinta/5"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-crema text-brand-coral-deep shadow-sm">
                <Icono size={22} />
              </span>
              <h3 className="mt-5 text-lg font-extrabold">{titulo}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-brand-tinta/75">{texto}</p>
            </Revelar>
          ))}
        </ul>
      </div>
    </section>
  )
}
