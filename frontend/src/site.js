// Central place for business content so copy / price / contact are edited once.

export const PRICE = '$79.900'
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
  { icon: '👃', text: 'Neutraliza olores indeseados' },
  { icon: '🏋️', text: 'Ideal para usar en el gimnasio' },
  { icon: '❤️', text: 'Mayor confianza en momentos íntimos' },
  { icon: '🍃', text: 'Ideal para tu rutina diaria' },
]

export const NIGHT_BENEFITS = [
  { icon: '💧', text: 'Crema íntima blanqueadora' },
  { icon: '✨', text: 'Ayuda a blanquear la zona anal' },
  { icon: '🌙', text: 'Uso nocturno para mejores resultados' },
  { icon: '🛡️', text: 'Fórmula suave y segura para ti' },
]
