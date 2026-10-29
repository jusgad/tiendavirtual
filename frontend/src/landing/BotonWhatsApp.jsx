import { useEffect, useState } from 'react'
import { whatsappUrl } from '../site.js'
import { useBarraDeCompraVisible } from './hooks.js'
import { IconWhatsApp } from './icons.jsx'

/** Aire entre el botón y la barra de compra cuando se apila encima. */
const HOLGURA = 14

/**
 * Altura de la barra de compra, medida: 73 px de 320 a 1024 px de ancho (el
 * nombre del producto se trunca, así que no se parte en dos líneas).
 *
 * Es el valor de partida, no el definitivo: en cuanto el `ResizeObserver`
 * entrega la altura real se usa esa. Existe porque el observador no entrega
 * nada hasta el primer fotograma, y sin un valor sensato el botón aparecería
 * encima de la barra durante ese rato.
 */
const ALTURA_BARRA_MEDIDA = 73

/**
 * Botón flotante de WhatsApp.
 *
 * Es el canal de **soporte**, no de venta: por eso el mensaje que lleva
 * pregunta en vez de pedir comprar, y por eso el botón es discreto y no
 * compite con el de compra. Una venta cerrada a mano por chat no queda
 * registrada, no descuenta inventario y no aparece en el panel.
 *
 * Se aparta cuando la barra de compra está a la vista. Las dos cosas están
 * fijas abajo y, sin esto, el botón quedaba justo encima del precio y del
 * botón de comprar — tapando lo único que esa banda tiene que dejar leer.
 * Cuándo apartarse lo decide `useBarraDeCompraVisible`, compartido con la
 * barra para que no puedan discrepar; cuánto, la altura real de la barra.
 *
 * Se mide en vez de fijar un número porque esa altura depende del contenido
 * (el precio, la fuente cuando termina de cargar) y de si el texto se parte
 * en dos líneas. Un valor a ojo acierta en el móvil en el que se probó y
 * deja un hueco raro —o solapa— en el siguiente.
 */
export default function BotonWhatsApp() {
  const barraVisible = useBarraDeCompraVisible()
  const [alturaBarra, setAlturaBarra] = useState(ALTURA_BARRA_MEDIDA)

  useEffect(() => {
    const barra = document.querySelector('.lp-barra')
    if (!barra || typeof ResizeObserver === 'undefined') return undefined
    const observador = new ResizeObserver(([entrada]) => {
      // Se ignora un 0: pasa mientras la barra no ha compuesto todavía, y
      // tomarlo por bueno dejaría el botón justo encima de ella.
      const alto = entrada.contentRect.height
      if (alto > 0) setAlturaBarra(alto)
    })
    observador.observe(barra)
    return () => observador.disconnect()
  }, [])

  return (
    <a
      href={whatsappUrl()}
      target="_blank"
      rel="noreferrer"
      // El `aria-label` es necesario: el contenido es un SVG decorativo, así
      // que sin él un lector de pantalla solo anunciaría «enlace».
      aria-label="Escríbenos por WhatsApp (se abre en otra pestaña)"
      title="Escríbenos por WhatsApp"
      className="lp-wa"
      style={{ '--lp-wa-subida': barraVisible ? `${Math.round(alturaBarra) + HOLGURA}px` : '0px' }}
    >
      <IconWhatsApp size={28} aria-hidden="true" />
    </a>
  )
}
