// Central place for business content so copy / price / contact are edited once.

export const PRICE = '$94.000'
export const CURRENCY = 'COP'

/**
 * Precio regular del combo, y hasta cuándo dura el precio de lanzamiento.
 *
 * El precio que se cobra NO está aquí: lo pone el panel de administración y lo
 * lee la landing de la API (ver `landing/precio.js`). Esto es solo el «antes»
 * que se tacha al lado, y la fecha en que deja de ser un lanzamiento.
 *
 * ⚠️ El tachado es publicidad: el artículo 33 del Estatuto del Consumidor
 * obliga a que el precio tachado sea el que de verdad se va a cobrar cuando
 * acabe la promoción. Por eso `ofertaLanzamiento()` solo lo enseña mientras la
 * fecha no haya pasado y mientras el precio de la API sea realmente menor; si
 * el 1 de diciembre el panel no ha subido el precio, el tachado desaparece
 * solo en vez de quedarse mintiendo.
 *
 * La hora va en -05:00 (hora de Colombia) a propósito: con una Z, en Colombia
 * la promoción se habría acabado a las 7 de la tarde del día 30.
 */
export const PRECIO_REGULAR = 117500
export const LANZAMIENTO_HASTA = '2026-11-30T23:59:59-05:00'
export const LANZAMIENTO_TEXTO = 'Precio de lanzamiento · hasta el 30 de noviembre'

export const WHATSAPP_PHONE = '573105676187'

/**
 * Datos del comerciante. Los textos legales de `legal.html` y el pie de todas
 * las páginas leen de aquí, así que se editan una sola vez.
 *
 * ⚠️ SIN DIRECCIÓN NI NIT, POR DECISIÓN DEL CLIENTE. El artículo 50 de la Ley
 * 1480 de 2011 pide identificación, NIT, **dirección de notificación
 * judicial**, teléfono y correo. Lo que se publica hoy cumple razón social,
 * teléfono y correo; para reponer el NIT o la dirección basta con añadirlos
 * aquí y la línea correspondiente en `legal/textos.js`.
 *
 * `sinDefinir` sigue aquí para cualquier dato que se añada a medias: un
 * «POR DEFINIR» se ve en `legal.html` a propósito, para que no se olvide,
 * mientras que el pie lo oculta para no enseñarle un marcador de posición a
 * quien entra a comprar.
 */
export const COMERCIANTE = {
  razonSocial: 'Pom Ass',
  correo: 'Pompass2026@gmail.com',
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

/**
 * Redes sociales de la marca.
 *
 * ⚠️ HAY QUE RELLENAR LAS URL ANTES DE PUBLICAR. Cada red con `url` vacía
 * **no se pinta**: es mejor no enseñar el icono que llevar a un perfil que
 * no existe o que es de otra persona. Así la fila crece sola conforme
 * Paola vaya abriendo cuentas, sin tocar ningún componente.
 *
 * La URL va completa (`https://instagram.com/<usuario>`), porque es la que
 * se abre al picar. WhatsApp no está aquí: tiene su propio botón flotante y
 * su propio mensaje, y sale de `whatsappUrl()`.
 */
export const REDES = [
  // Sin el `?srtk=…` con el que llegó el enlace: es el identificador que
  // Instagram pega al compartir desde la app, sirve para medir quién compartió
  // qué y no hace falta para abrir el perfil. Publicarlo en la web sería
  // mandarle ese dato a Instagram en cada visita.
  { id: 'instagram', nombre: 'Instagram', url: 'https://www.instagram.com/pomass_bypaodiaz' },
  // Sin cuenta todavía: mientras la URL esté vacía, el cuadro no se pinta.
  { id: 'facebook', nombre: 'Facebook', url: '' },
  { id: 'tiktok', nombre: 'TikTok', url: 'https://www.tiktok.com/@paodiazpompass' },
]

/** Las redes que ya tienen URL: las únicas que se muestran. */
export const redesActivas = () => REDES.filter((r) => r.url.trim() !== '')

/*
 * Los beneficios de cada crema. El primero de cada lista es el titular de su
 * banda; los demás la acompañan.
 *
 * Están escritos como ganchos y no como etiquetas de catálogo. Los de antes
 * («Ideal para usar en el gimnasio», «Ideal para tu rutina diaria», «Uso
 * nocturno para mejores resultados») decían dos veces lo mismo con otras
 * palabras y repetían el titular de su propia tarjeta. Lo que se promete no
 * cambió: lo que cambió es que ahora cada línea aporta algo.
 *
 * Al editarlos, dos límites: nada de lenguaje médico ni de prometer
 * resultados —el manual lo prohíbe y el Estatuto del Consumidor lo sanciona—,
 * y ninguna línea debe repetir el titular que lleva encima.
 */
export const DAY_BENEFITS = [
  { icon: 'leaf', text: 'Neutraliza olores indeseados' },
  { icon: 'sun', text: 'Dura toda la jornada' },
  { icon: 'heart', text: 'Textura ligera, no mancha la ropa' },
  { icon: 'check', text: 'Se aplica en segundos, sin enjuague' },
]

export const NIGHT_BENEFITS = [
  { icon: 'droplet', text: 'Crema íntima blanqueadora' },
  { icon: 'sparkle', text: 'Uniformiza el tono de la piel' },
  { icon: 'moon', text: 'Poco a poco, no de un día para otro' },
  { icon: 'shield', text: 'Fórmula suave para una zona delicada' },
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
    // Cotas remedidas sobre la foto real del producto (Pao la pasó una
    // nueva toma el 2 de noviembre), igual que se hizo con la de Noche.
    envase: { imagen: '/images/tubo_dia.png', sellado: 49, tapa: 724 },
  },
  noche: {
    id: 'noche',
    orden: 2,
    nombre: 'Noche',
    tipo: 'Crema íntima',
    beneficio: 'Crema íntima blanqueadora.',
    cuando: 'Antes de dormir, cuando la piel descansa y tiene tiempo de absorber.',
    // Sin repetir «crema íntima»: ya lo dice la línea de Día justo encima,
    // y el nombre del combo lo encabeza.
    enCombo: 'Blanqueadora · 50 ml',
    imagen: '/images/tubo_noche.png',
    beneficios: NIGHT_BENEFITS.slice(1),
    icono: 'moon',
    color: '#9C1A9C',
    momento: 3,
    // Cotas remedidas sobre la foto real del producto (Pao la pasó una
    // nueva toma el 2 de noviembre): el sellado donde acaba el rizado de
    // arriba; la tapa de esta toma es oscura y no la detecta la heurística
    // de gris claro, así que se usa el 15 % inferior reservado para ese caso.
    envase: { imagen: '/images/tubo_noche.png', sellado: 49, tapa: 761 },
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
