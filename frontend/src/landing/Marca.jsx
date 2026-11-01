import { TESTIMONIOS } from '../site.js'
import { IconBox, IconHeart, IconSun } from './icons.jsx'
import { Bloque, Grupo, Item, Titular } from './Movimiento.jsx'

/**
 * Estado 3 · La confianza. Noche.
 *
 * Intro a la izquierda, rejilla de tarjetas de cristal con un icono de línea
 * fina sobre un círculo con un toque de verde hoja, y debajo el sitio del
 * testimonio.
 *
 * Las páginas de referencia construyen confianza con comités médicos y miles
 * de reseñas. PomAss no tiene nada de eso todavía y no se inventa. Lo que
 * sí tiene es algo que ellas no: una persona con nombre y un país. Todo lo
 * que se afirma aquí es verificable.
 *
 * **Testimonios.** No hay todavía. Mientras `TESTIMONIOS` esté vacío, en
 * producción no se muestra nada —un marcador entre corchetes publicado en la
 * tienda espantaría más que no tener reseñas—, y en desarrollo aparece un
 * marcador visible para que no se olvide.
 */
const HECHOS = [
  {
    Icono: IconHeart,
    titulo: 'Hecha en Colombia',
    texto: 'Marca colombiana, creada por Pao Díaz.',
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
  const testimonio = TESTIMONIOS[0]

  return (
    <section aria-labelledby="marca-titulo" className="px-5 py-28 sm:px-8 lg:px-16 lg:py-40">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Bloque>
            <p className="pm-etiqueta pm-acento">Quién está detrás</p>
          </Bloque>
          <Titular
            id="marca-titulo"
            className="pm-titular-lg mt-5"
            texto="Detrás de PomAss hay una persona, no un laboratorio."
            enfasis={3}
          />
          <Bloque retraso={0.2}>
            {/* Ya no repite «marca colombiana» ni «dos cremas de 50 ml»: lo
                primero está ahora en el sello de la apertura y lo segundo,
                en el titular y en la banda del ritual. Aquí queda lo que
                solo se puede contar aquí: quién es. */}
            <p className="pm-cuerpo-lg pm-suave mt-6">
              Pao Díaz la creó por una razón sencilla: lo que buscaba no existía en el país.
            </p>
          </Bloque>
        </div>

        <Grupo className="mt-16 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {HECHOS.map(({ Icono, titulo, texto }) => (
            <Item key={titulo} como="article" className="pm-glass rounded-[24px] p-7">
              <span className="pm-icono-hoja inline-flex h-12 w-12 items-center justify-center rounded-full">
                <Icono size={22} />
              </span>
              <h3 className="mt-5 text-lg font-extrabold">{titulo}</h3>
              <p className="pm-cuerpo pm-suave mt-2">{texto}</p>
            </Item>
          ))}
        </Grupo>

        {testimonio ? (
          <Bloque className="pm-glass mt-12 rounded-[28px] p-8 sm:p-12">
            <figure>
              <blockquote className="font-display text-[clamp(22px,2.2vw,32px)] italic leading-snug">
                «{testimonio.texto}»
              </blockquote>
              <figcaption className="pm-etiqueta pm-suave mt-5">{testimonio.autora}</figcaption>
            </figure>
          </Bloque>
        ) : (
          import.meta.env.DEV && (
            <p className="pm-pendiente mt-12 inline-block font-display text-xl italic pm-suave">
              [Testimonio real de una clienta — se publica solo cuando exista]
            </p>
          )
        )}
      </div>
    </section>
  )
}
