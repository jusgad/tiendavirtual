import { useState } from 'react'
import { whatsappUrl } from '../site.js'
import Revelar from './Reveal.jsx'
import { IconPlus } from './icons.jsx'
import { antetitulo } from './ui.js'

// Cada respuesta se apoya en algo que la tienda ya hace o que ya está escrito
// en los textos legales. Ninguna promete resultados del producto: el manual
// pide evitar lenguaje médico no sustentado.
const PREGUNTAS = [
  {
    pregunta: '¿Cuándo uso cada crema?',
    respuesta: (
      <>
        La crema <strong>Día</strong> es para tu rutina diaria y neutraliza olores indeseados. La crema{' '}
        <strong>Noche</strong> es la crema íntima blanqueadora y se usa en la noche. Antes de usarlas, lee las
        indicaciones y advertencias del empaque.
      </>
    ),
  },
  {
    pregunta: '¿El paquete llega discreto?',
    respuesta: <>Sí, si lo eliges al pagar: marca la opción de empaque discreto y el paquete llega sin marca visible.</>,
  },
  {
    pregunta: '¿Cómo puedo pagar?',
    respuesta: (
      <>Con tarjeta, Nequi, PSE o Bancolombia, a través de la pasarela Wompi. Nosotros no guardamos los datos de tu tarjeta.</>
    ),
  },
  {
    pregunta: '¿Hacen envíos a mi ciudad?',
    respuesta: <>Enviamos a todo el país. El costo del envío se calcula en el checkout y lo ves antes de pagar.</>,
  },
  {
    pregunta: '¿Cómo sé en qué va mi pedido?',
    respuesta: (
      <>
        Te llega un correo con tu número de pedido, y otro con la transportadora y la guía cuando sale. También
        puedes consultarlo cuando quieras en{' '}
        <a href="/track.html" className="font-bold underline underline-offset-4">
          Seguir mi pedido
        </a>
        .
      </>
    ),
  },
  {
    pregunta: '¿Puedo devolverlo?',
    respuesta: (
      <>
        Tienes derecho de retracto dentro de los cinco días hábiles siguientes a la entrega, con el producto sin
        abrir y con su sello intacto. Los detalles están en la{' '}
        <a href="/legal.html#devoluciones" className="font-bold underline underline-offset-4">
          política de devoluciones
        </a>
        .
      </>
    ),
  },
]

/** Preguntas frecuentes en acordeón: una abierta a la vez, la primera de entrada. */
export default function Faq() {
  const [abierta, setAbierta] = useState(0)

  return (
    <section id="preguntas" aria-labelledby="faq-titulo" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
        <Revelar>
          <p className={antetitulo}>Preguntas frecuentes</p>
          <h2
            id="faq-titulo"
            className="mt-3 font-display text-[clamp(2.2rem,4.4vw,3.4rem)] font-semibold leading-[1.02] tracking-[-.015em]"
          >
            Lo que suelen <span className="lp-grad-text italic">preguntarnos.</span>
          </h2>
          <p className="mt-4 text-lg text-brand-tinta/75">
            ¿No está tu duda? Escríbenos por{' '}
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-brand-coral-deep underline underline-offset-4"
            >
              WhatsApp
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
            .
          </p>
        </Revelar>

        <Revelar retraso={100}>
          <ul className="divide-y divide-brand-tinta/10 rounded-3xl bg-white/70 px-2 ring-1 ring-brand-tinta/5 sm:px-4">
            {PREGUNTAS.map(({ pregunta, respuesta }, i) => {
              const abierto = abierta === i
              return (
                <li key={pregunta}>
                  <h3>
                    <button
                      type="button"
                      id={`faq-boton-${i}`}
                      aria-expanded={abierto}
                      aria-controls={`faq-respuesta-${i}`}
                      onClick={() => setAbierta(abierto ? -1 : i)}
                      className="flex min-h-[64px] w-full items-center justify-between gap-4 px-3 py-4 text-left text-[17px] font-extrabold"
                    >
                      {pregunta}
                      <span
                        className={`lp-faq-mas inline-flex h-9 w-9 flex-none items-center justify-center rounded-full ${
                          abierto ? 'is-abierto' : ''
                        }`}
                      >
                        <IconPlus size={18} />
                      </span>
                    </button>
                  </h3>
                  {/* `inert` cuando está cerrada: si no, el enlace de adentro
                      seguiría recibiendo el foco del teclado sin verse. */}
                  <div
                    id={`faq-respuesta-${i}`}
                    role="region"
                    aria-labelledby={`faq-boton-${i}`}
                    inert={abierto ? undefined : ''}
                    className={`lp-faq-respuesta ${abierto ? 'is-abierto' : ''}`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-3 pb-5 text-base leading-relaxed text-brand-tinta/80">{respuesta}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Revelar>
      </div>
    </section>
  )
}
