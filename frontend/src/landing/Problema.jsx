import Revelar from './Reveal.jsx'
import { antetitulo } from './ui.js'

/**
 * Banda 3 · El problema. Mañana.
 *
 * La banda que no existía y que es la razón de ser de la marca: nombrar en voz
 * normal algo que casi nadie comenta. Sin eufemismos, sin diagnósticos y sin
 * culpa.
 *
 * Cuidado al editar este texto: el manual prohíbe el lenguaje médico no
 * sustentado, y el Estatuto del Consumidor sanciona prometer resultados. Aquí
 * se describe una situación cotidiana, no una condición ni una cura.
 */
export default function Problema() {
  return (
    <section id="rutina" aria-labelledby="problema-titulo" className="scroll-mt-24 px-4 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <Revelar>
          <p className={antetitulo}>Hablemos claro</p>
          <h2
            id="problema-titulo"
            className="mt-4 font-display text-[clamp(2.3rem,5.4vw,4rem)] font-semibold leading-[1.03] tracking-[-.02em]"
          >
            Hay cosas del cuerpo que no se preguntan <span className="lp-grad-text italic">en voz alta.</span>
          </h2>
        </Revelar>

        <Revelar retraso={120}>
          <p className="mx-auto mt-7 max-w-2xl text-xl leading-relaxed text-brand-tinta/80">
            El olor cambia con el calor, el ejercicio, la ropa y el ciclo. El tono de la piel también cambia
            con el roce y con los años. Le pasa a casi todas y casi nadie lo menciona.
          </p>
        </Revelar>

        <Revelar retraso={220}>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-brand-tinta">
            PomAss existe para eso: <strong className="font-extrabold">para que dejes de pensarlo.</strong>
          </p>
        </Revelar>
      </div>
    </section>
  )
}
