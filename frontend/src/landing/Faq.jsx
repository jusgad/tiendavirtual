import { useState } from 'react'
import { whatsappUrl } from '../site.js'
import { Bloque, Titular } from './Movimiento.jsx'
import { IconPlus } from './icons.jsx'

// Cada respuesta se apoya en algo que la tienda ya hace o que ya está escrito
// en los textos legales. Ninguna promete resultados del producto: el manual
// pide evitar lenguaje médico no sustentado.
//
// `respuesta` es lo que se pinta (puede llevar enlaces) y `texto` la misma
// respuesta en texto plano, que es lo que entienden los buscadores. Viven
// juntas a propósito: separadas en dos archivos acabarían diciendo cosas
// distintas.
const PREGUNTAS = [
  {
    // Antes esta pregunta era «¿Cuándo uso cada crema?» y repetía los dos
    // beneficios enteros. Ahora cada banda dice el suyo y cuándo se usa, así
    // que aquí solo cabe lo que ninguna de las dos cuenta.
    pregunta: '¿Cómo se usan?',
    texto: 'Son cosméticos de uso externo. Las indicaciones de cada crema vienen en su empaque: léelas antes de empezar. No las apliques sobre piel lastimada y suspende el uso si notas irritación.',
    respuesta: (
      <>
        Son cosméticos de uso externo. Las indicaciones de cada crema vienen en su empaque: léelas antes de
        empezar. No las apliques sobre piel lastimada y suspende el uso si notas irritación.
      </>
    ),
  },
  {
    pregunta: '¿El paquete llega discreto?',
    texto: 'Sí, si lo eliges al pagar: marca la opción de empaque discreto y el paquete llega sin marca visible.',
    respuesta: <>Sí, si lo eliges al pagar: marca la opción de empaque discreto y el paquete llega sin marca visible.</>,
  },
  {
    pregunta: '¿Cómo puedo pagar?',
    texto: 'Con tarjeta, Nequi, PSE o Bancolombia, a través de la pasarela Wompi. Nosotros no guardamos los datos de tu tarjeta.',
    respuesta: (
      <>Con tarjeta, Nequi, PSE o Bancolombia, a través de la pasarela Wompi. Nosotros no guardamos los datos de tu tarjeta.</>
    ),
  },
  {
    pregunta: '¿Hacen envíos a mi ciudad?',
    texto: 'Enviamos a todo el país. El costo del envío se calcula en el checkout y lo ves antes de pagar.',
    respuesta: <>Enviamos a todo el país. El costo del envío se calcula en el checkout y lo ves antes de pagar.</>,
  },
  {
    pregunta: '¿Cómo sé en qué va mi pedido?',
    texto: 'Te llega un correo con tu número de pedido, y otro con la transportadora y la guía cuando sale. También puedes consultarlo cuando quieras en la página de seguimiento.',
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
    texto: 'Tienes derecho de retracto dentro de los cinco días hábiles siguientes a la entrega, con el producto sin abrir y con su sello intacto. Los detalles están en la política de devoluciones.',
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

/**
 * Datos estructurados de las preguntas.
 *
 * Google puede mostrar estas respuestas desplegadas en sus resultados, y son
 * justo las dudas que hoy llegan por WhatsApp: envío, discreción, pago y
 * devolución. Se arma desde el mismo array que pinta el acordeón, así que no
 * hay una segunda copia que se quede vieja.
 */
const datosEstructurados = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: PREGUNTAS.map(({ pregunta, texto }) => ({
    '@type': 'Question',
    name: pregunta,
    acceptedAnswer: { '@type': 'Answer', text: texto },
  })),
}

/** Preguntas frecuentes en acordeón: una abierta a la vez, la primera de entrada. */
export default function Faq() {
  const [abierta, setAbierta] = useState(0)

  return (
    // Va dentro del estado de la noche, junto a la confianza: es lo que quita
    // el último freno, y el producto está retirado en una esquina, así que el
    // texto tiene todo el centro.
    <section id="preguntas" aria-labelledby="faq-titulo" className="scroll-mt-24 px-5 py-24 sm:px-8 lg:px-16 lg:py-32">
      <script
        type="application/ld+json"
        // El contenido sale de constantes de este archivo, no de nada que
        // escriba quien visita la página.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }}
      />
      {/* En escritorio la lista va a la izquierda y el título a la derecha.
          No es capricho: al terminar las preguntas el producto vuelve al
          frente por la derecha, camino del cierre, y con la lista a ese
          lado pasaba por detrás de las últimas respuestas. Así cruza la
          columna del título, que a esa altura ya subió fuera de pantalla.
          En móvil, el título primero, como se lee. */}
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_.8fr] lg:gap-16">
        <div className="lg:order-2">
          <Bloque>
            <p className="pm-etiqueta pm-acento">Preguntas frecuentes</p>
          </Bloque>
          <Titular id="faq-titulo" className="pm-titular-lg mt-5" texto="Lo que suelen preguntarnos." enfasis={1} />
          <Bloque retraso={0.2}>
          <p className="pm-cuerpo-lg pm-suave mt-6">
            ¿No está tu duda? Escríbenos por{' '}
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noreferrer"
              className="pm-acento font-bold underline underline-offset-4"
            >
              WhatsApp
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
            .
          </p>
          </Bloque>
        </div>

        <Bloque retraso={0.1} className="lg:order-1">
          <ul className="pm-glass divide-y divide-[rgba(127,127,127,.22)] rounded-[28px] px-2 sm:px-5">
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
                      <p className="pm-cuerpo pm-suave px-3 pb-5">{respuesta}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Bloque>
      </div>
    </section>
  )
}
