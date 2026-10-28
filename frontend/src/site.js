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
 * Mientras digan «POR DEFINIR» se ven así en la página publicada: es a
 * propósito, para que no se olvide.
 */
export const COMERCIANTE = {
  razonSocial: 'POR DEFINIR — nombre o razón social registrada',
  nit: 'POR DEFINIR — NIT o cédula',
  direccion: 'POR DEFINIR — dirección física',
  ciudad: 'Medellín, Colombia',
  correo: 'POR DEFINIR — correo de contacto',
  telefono: '+57 310 567 6187',
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
 * Las dos cremas, como las define el manual de marca: cada una tiene UN
 * beneficio principal, que es el que se destaca; el resto acompaña. Los
 * íconos son nombres de `landing/icons.jsx`, no emojis.
 */
export const PRODUCTOS = {
  dia: {
    id: 'dia',
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
  },
  noche: {
    id: 'noche',
    nombre: 'Noche',
    tipo: 'Crema íntima',
    beneficio: 'Crema íntima blanqueadora.',
    cuando: 'Antes de dormir, cuando la piel descansa y tiene tiempo de absorber.',
    enCombo: 'Crema íntima blanqueadora · 50 ml',
    imagen: '/images/tubo_noche.png',
    beneficios: NIGHT_BENEFITS.slice(1),
  },
}
