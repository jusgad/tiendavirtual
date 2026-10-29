import { COMERCIANTE, CREDITO, sinDefinir } from '../site.js'

/**
 * Pie con los enlaces legales y quién vende.
 *
 * Va en la landing, el checkout y el seguimiento porque el artículo 50 de la
 * Ley 1480 de 2011 pide que quien compra pueda ver, antes de contratar, con
 * quién está contratando y bajo qué condiciones. Un enlace escondido en una
 * sola pantalla no cumple eso.
 *
 * `sobreOscuro` lo adapta al fondo morado del modo noche de la landing.
 *
 * `dejarSitioAbajo` reserva espacio para la barra de compra fija de la landing:
 * sin él la barra tapa los enlaces justo cuando se llega al final de la página,
 * que es cuando se van a buscar.
 */
export default function PieLegal({ sobreOscuro = false, dejarSitioAbajo = false }) {
  const color = sobreOscuro ? 'rgba(255,255,255,.82)' : '#8A6A4A'
  const borde = sobreOscuro ? 'rgba(255,255,255,.22)' : '#E7D9C4'

  return (
    <footer
      style={{
        borderTop: `1px solid ${borde}`,
        color,
        // 150 y no 70: en móvil la barra crece a dos filas (114 px de alto).
        paddingBottom: dejarSitioAbajo ? 150 : undefined,
      }}
      className="relative z-20 mt-10 px-5 py-7 text-center text-xs leading-relaxed"
    >
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-bold">
        <a href="/legal.html#datos" className="hover:underline">
          Tratamiento de datos
        </a>
        <a href="/legal.html#terminos" className="hover:underline">
          Términos y condiciones
        </a>
        <a href="/legal.html#devoluciones" className="hover:underline">
          Devoluciones y garantía
        </a>
        <a href="/track.html" className="hover:underline">
          Seguir mi pedido
        </a>
      </nav>
      {/* Mientras no haya razón social ni NIT solo se muestra la ciudad: un
          «POR DEFINIR» delante de quien va a comprar no informa de nada y
          resta confianza justo donde hace falta. El recordatorio de que
          faltan sigue en `legal.html` y en `site.js`. */}
      <p className="mt-3">
        {sinDefinir(COMERCIANTE.razonSocial)
          ? COMERCIANTE.ciudad
          : `${COMERCIANTE.razonSocial} · NIT ${COMERCIANTE.nit} · ${COMERCIANTE.ciudad}`}
      </p>
      <p className="mt-1">Hecho por {CREDITO.autor}</p>
      {/* El correo en su propia línea y escrito entero: en un pie, un enlace
          que solo dice «escríbenos» obliga a pasar el ratón por encima para
          saber a dónde va, y desde el móvil ni eso. */}
      <p className="mt-0.5">
        <a href={`mailto:${CREDITO.correo}`} className="font-bold hover:underline">
          {CREDITO.correo}
        </a>
      </p>
    </footer>
  )
}
