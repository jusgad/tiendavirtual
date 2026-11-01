import { Bloque, Titular } from './Movimiento.jsx'

/**
 * Estado 1 · La expansión. Mañana.
 *
 * Composición editorial: titular grande a la izquierda, el párrafo
 * desplazado hacia adentro y abajo, y mucho espacio vacío. El producto se va
 * a la derecha en la escena y deja el texto respirar.
 *
 * Es la banda que nombra en voz normal algo que casi nadie comenta. Cuidado
 * al editar: el manual prohíbe el lenguaje médico no sustentado, y el
 * Estatuto del Consumidor sanciona prometer resultados. Aquí se describe una
 * situación cotidiana, no una condición ni una cura.
 */
export default function Problema() {
  return (
    <section
      id="problema"
      aria-labelledby="problema-titulo"
      className="scroll-mt-24 px-5 py-24 sm:px-8 lg:min-h-[120svh] lg:px-16 lg:py-40"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-[700px]">
          <Bloque>
            <p className="pm-etiqueta pm-acento">Hablemos claro</p>
          </Bloque>
          <Titular
            id="problema-titulo"
            className="pm-titular-xl mt-5"
            texto="Hay cosas del cuerpo que no se preguntan en voz alta."
            enfasis={3}
          />
        </div>

        <div className="mt-14 max-w-[560px] lg:ml-[18%] lg:mt-24">
          {/* Sin «el ciclo» ni «le pasa a casi todas»: el cuerpo cambia por
              el calor, el roce y los años le toque a quien le toque, y
              acotarlo a la menstruación dejaba fuera a media clientela. El
              producto es para cualquiera. */}
          <Bloque>
            <p className="pm-cuerpo-lg pm-suave">
              El olor cambia con el calor, el ejercicio y la ropa. El tono de la piel también
              cambia con el roce y con los años. Le pasa a casi todo el mundo y casi nadie lo
              menciona.
            </p>
          </Bloque>
          {/* El gancho de la banda. Va en el tamaño de un titular y no en el
              del cuerpo: era la frase que más pesa de la sección y se leía
              igual que el párrafo de encima. */}
          <Bloque retraso={0.15}>
            <p className="pm-titular-lg mt-10">
              PomAss existe para eso:{' '}
              <span className="lp-grad-text italic">para que dejes de pensarlo.</span>
            </p>
          </Bloque>
        </div>
      </div>
    </section>
  )
}
