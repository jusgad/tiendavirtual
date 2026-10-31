// Central place for business content so copy / price / contact are edited once.

export const PRICE = '$89.900'
export const CURRENCY = 'COP'

export const WHATSAPP_PHONE = '573105676187'

/**
 * Datos del comerciante.
 *
 * ⚠️ HAY QUE COMPLETARLOS ANTES DE PUBLICAR. El artículo 50 de la Ley 1480 de
 * 2011 (Estatuto del Consumidor) obliga a que una tienda en línea muestre de
 * forma clara quién vende: identificación, dirección y datos de contacto. Los
 * textos legales de `legal.html` leen de aquí, así que se edita una sola vez.
 *
 * Mientras digan «POR DEFINIR» siguen viéndose así en `legal.html`: es a
 * propósito, para que no se olvide. El pie de las demás páginas sí los
 * oculta mientras no estén, para no enseñarle un marcador de posición a
 * quien entra a comprar.
 */
export const COMERCIANTE = {
  razonSocial: 'POR DEFINIR — nombre o razón social registrada',
  nit: 'POR DEFINIR — NIT o cédula',
  direccion: 'POR DEFINIR — dirección física',
  ciudad: 'Bogotá, Colombia',
  correo: 'jusga.adarve@gmail.com',
  telefono: '+57 310 567 6187',
}

/** ¿Este dato del comerciante sigue sin definir? */
export const sinDefinir = (valor) => !valor || valor.startsWith('POR DEFINIR')

/**
 * Crédito de quien construyó la tienda.
 *
 * Va aparte del comerciante a propósito: son dos cosas distintas. El
 * comerciante es quien vende y responde legalmente ante quien compra; esto
 * es solo la firma de quien hizo el sitio. Mezclarlos haría que los textos
 * legales dijeran que la política de datos la publica el desarrollador.
 */
export const CREDITO = {
  autor: 'jusga developer',
  correo: 'jusga.adarve@gmail.com',
}

/**
 * Enlace de WhatsApp. Es el canal de **soporte**, no de venta: la compra se
 * cierra en el checkout, donde queda registrada, descuenta inventario y
 * aparece en el panel. Un pedido cerrado a mano por chat no hace nada de eso.
 * Por eso el mensaje por defecto pregunta, no pide comprar.
 */
export function whatsappUrl(
  message = '¡Hola! 🍑 Tengo una duda sobre el combo PomAss Día + Noche.',
) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`
}

export const DAY_BENEFITS = [
  { icon: 'leaf', text: 'Neutraliza olores indeseados' },
  { icon: 'sun', text: 'Ideal para usar en el gimnasio' },
  { icon: 'heart', text: 'Mayor confianza en momentos íntimos' },
  { icon: 'check', text: 'Ideal para tu rutina diaria' },
]

export const NIGHT_BENEFITS = [
  { icon: 'droplet', text: 'Crema íntima blanqueadora' },
  { icon: 'sparkle', text: 'Ayuda a blanquear la zona anal' },
  { icon: 'moon', text: 'Uso nocturno para mejores resultados' },
  { icon: 'shield', text: 'Fórmula suave y segura para ti' },
]

/**
 * El catálogo. Es la ÚNICA fuente de los productos: la escena 3D, las
 * tarjetas del ritual y el combo se construyen recorriéndolo. Añadir un
 * producto es añadir una entrada aquí, sin tocar componentes.
 *
 * Cada crema tiene UN beneficio principal, como pide el manual de marca: es
 * el que se destaca; el resto acompaña. Los íconos son nombres de
 * `landing/icons.jsx`, no emojis.
 *
 * Campos que usa el 3D:
 *
 * - `color` · el color del plástico del tubo. Se ve en la espalda y en el
 *   sellado, donde no llega el arte de la etiqueta.
 * - `momento` · en qué estado del recorrido (0…4, ver `historia.js`) este
 *   producto pasa al frente. Día en la mañana, Noche en la noche.
 * - `envase` · la foto frontal del tubo, con fondo transparente, que se usa
 *   como etiqueta del modelo. Las cotas son píxeles medidos sobre esa foto:
 *   dónde acaba el sellado de arriba y dónde empieza la tapa. Si un producto
 *   nuevo no las trae, se calculan solas al cargar la imagen (ver
 *   `escena/silueta.js`), aunque medirlas a mano es más fiable.
 *
 * `enCombo` presente = forma parte del combo, con ese texto como descripción.
 */
export const PRODUCTOS = {
  dia: {
    id: 'dia',
    orden: 1,
    nombre: 'Día',
    tipo: 'Crema íntima',
    beneficio: 'Neutraliza olores indeseados.',
    cuando: 'En la mañana, antes del gimnasio o de un día largo fuera de casa.',
    enCombo: 'Crema íntima · 50 ml',
    imagen: '/images/tubo_dia.png',
    // El primer beneficio de la lista es el titular de la banda, así que la
    // lista arranca en el segundo: repetirlo sería decir lo mismo dos veces
    // en la misma pantalla.
    beneficios: DAY_BENEFITS.slice(1),
    icono: 'sun',
    color: '#F26B0F',
    momento: 1,
    envase: { imagen: '/images/tubo_dia.png', sellado: 30, tapa: 508 },
  },
  noche: {
    id: 'noche',
    orden: 2,
    nombre: 'Noche',
    tipo: 'Crema íntima',
    beneficio: 'Crema íntima blanqueadora.',
    cuando: 'Antes de dormir, cuando la piel descansa y tiene tiempo de absorber.',
    enCombo: 'Crema íntima blanqueadora · 50 ml',
    imagen: '/images/tubo_noche.png',
    beneficios: NIGHT_BENEFITS.slice(1),
    icono: 'moon',
    color: '#9C1A9C',
    momento: 3,
    envase: { imagen: '/images/tubo_noche.png', sellado: 36, tapa: 522 },
  },
}

/** El catálogo en orden de presentación. Es lo que recorren los componentes. */
export const CATALOGO = Object.values(PRODUCTOS).sort((a, b) => a.orden - b.orden)

/** Lo que entra en el combo, en el mismo orden. */
export const COMBO = CATALOGO.filter((p) => p.enCombo)

/**
 * Nombre del combo. El manual pide «Día + Noche» sin inventarle otro, y así
 * sale; si un día entra otra crema, el nombre la incluye solo.
 */
export const NOMBRE_COMBO = COMBO.map((p) => p.nombre).join(' + ')

/**
 * Testimonios reales de clientas. Vacío a propósito: no hay todavía y no se
 * inventan. Mientras esté vacío, la banda de confianza no muestra ninguno en
 * producción, y en desarrollo enseña un marcador para que no se olvide.
 *
 * Formato: { texto: '…', autora: 'Nombre o inicial, ciudad' }
 */
export const TESTIMONIOS = []
