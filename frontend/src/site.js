// Central place for business content so copy / price / contact are edited once.

export const PRICE = '$79.900'
export const CURRENCY = 'COP'

export const WHATSAPP_PHONE = '573105676187'

export function whatsappUrl(
  message = '¡Hola! 🍑 Quiero el combo PomAss Día + Noche ($79.900 COP). ¿Me ayudas con la compra?',
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
