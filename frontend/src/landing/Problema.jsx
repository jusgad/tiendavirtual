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
          <Bloque>
            <p className="pm-cuerpo-lg pm-suave">
              El olor cambia con el calor, el ejercicio, la ropa y el ciclo. El tono de la piel
              también cambia con el roce y con los años. Le pasa a casi todas y casi nadie lo
              menciona.
            </p>
          </Bloque>
          <Bloque retraso={0.15}>
            <p className="pm-cuerpo-lg mt-7">
              PomAss existe para eso: <strong className="font-extrabold">para que dejes de pensarlo.</strong>
            </p>
          </Bloque>
        </div>
      </div>
    </section>
  )
}
