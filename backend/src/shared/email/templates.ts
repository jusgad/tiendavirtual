/**
 * Plantillas de los correos transaccionales. Funciones puras: reciben datos y
 * devuelven asunto, HTML y texto. Sin red, sin base de datos, sin `env`.
 *
 * Todos los textos están escritos para una clienta, no para una programadora:
 * dicen qué pasó y qué sigue, sin jerga y sin número de pedido escondido.
 */
import { EmailMessage } from './types'
import { articulosEnTexto, envolver, escapar, pesos, tablaArticulos } from './layout'

export interface ArticuloPedido {
  productName: string
  quantity: number
  lineTotal: number
}

export interface DatosPedido {
  orderNumber: string
  total: number
  items: ArticuloPedido[]
  /** Dirección pública de seguimiento, ya con el número de pedido dentro. */
  trackingUrl: string
}

/**
 * Pedido recibido, pago todavía sin confirmar.
 *
 * Es el correo más importante de todos: sin él, quien cierre la pantalla de
 * confirmación pierde para siempre la referencia de su compra.
 */
export function pedidoRecibido(to: string, d: DatosPedido): EmailMessage {
  const contenido = `
    <p style="margin:0 0 10px">Recibimos tu pedido <strong>${escapar(d.orderNumber)}</strong>. Guarda este número: con él puedes consultar en qué va tu compra cuando quieras.</p>
    ${tablaArticulos(d.items, d.total)}
    <p style="margin:10px 0 16px">Todavía estamos confirmando el pago. Te escribimos de nuevo apenas quede confirmado.</p>
  `
  return {
    to,
    subject: `Recibimos tu pedido ${d.orderNumber} · PomAss`,
    html: envolver({
      titulo: '¡Gracias por tu compra!',
      contenido,
      boton: { texto: 'Ver mi pedido', url: d.trackingUrl },
    }),
    text: [
      `Recibimos tu pedido ${d.orderNumber}. Guarda este número: con él puedes consultar en qué va tu compra.`,
      '',
      articulosEnTexto(d.items, d.total),
      '',
      'Todavía estamos confirmando el pago. Te escribimos apenas quede confirmado.',
      '',
      `Seguimiento: ${d.trackingUrl}`,
    ].join('\n'),
  }
}

/** Pago confirmado por la pasarela. */
export function pagoConfirmado(
  to: string,
  d: { orderNumber: string; total: number; trackingUrl: string },
): EmailMessage {
  const contenido = `
    <p style="margin:0 0 10px">Confirmamos el pago de <strong>${pesos(d.total)}</strong> por tu pedido <strong>${escapar(d.orderNumber)}</strong>.</p>
    <p style="margin:0 0 16px">Ya lo estamos preparando. Te avisamos en cuanto salga con la transportadora.</p>
  `
  return {
    to,
    subject: `Pago confirmado · pedido ${d.orderNumber}`,
    html: envolver({
      titulo: 'Pago confirmado',
      contenido,
      boton: { texto: 'Ver mi pedido', url: d.trackingUrl },
    }),
    text: [
      `Confirmamos el pago de ${pesos(d.total)} por tu pedido ${d.orderNumber}.`,
      'Ya lo estamos preparando. Te avisamos en cuanto salga con la transportadora.',
      '',
      `Seguimiento: ${d.trackingUrl}`,
    ].join('\n'),
  }
}

/** Pedido despachado, con transportadora y número de guía. */
export function pedidoEnviado(
  to: string,
  d: { orderNumber: string; carrier: string; trackingNumber: string; trackingUrl: string },
): EmailMessage {
  const contenido = `
    <p style="margin:0 0 10px">Tu pedido <strong>${escapar(d.orderNumber)}</strong> ya va en camino.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;margin:12px 0">
      <tr><td style="padding:3px 14px 3px 0;color:#8A6A4A">Transportadora</td><td style="padding:3px 0"><strong>${escapar(d.carrier)}</strong></td></tr>
      <tr><td style="padding:3px 14px 3px 0;color:#8A6A4A">Número de guía</td><td style="padding:3px 0"><strong>${escapar(d.trackingNumber)}</strong></td></tr>
    </table>
    <p style="margin:10px 0 16px">Con ese número puedes rastrearlo también en la página de la transportadora.</p>
  `
  return {
    to,
    subject: `Tu pedido ${d.orderNumber} va en camino`,
    html: envolver({
      titulo: 'Tu pedido va en camino',
      contenido,
      boton: { texto: 'Ver el estado', url: d.trackingUrl },
    }),
    text: [
      `Tu pedido ${d.orderNumber} ya va en camino.`,
      `Transportadora: ${d.carrier}`,
      `Número de guía: ${d.trackingNumber}`,
      '',
      `Seguimiento: ${d.trackingUrl}`,
    ].join('\n'),
  }
}

/**
 * Enlace para restablecer la contraseña.
 *
 * No dice el nombre de quien lo pidió ni confirma que la cuenta exista más
 * allá de que este correo llegue: quien lo reciba por error no aprende nada.
 */
export function recuperarContrasena(
  to: string,
  d: { resetUrl: string; minutosDeVigencia: number },
): EmailMessage {
  const contenido = `
    <p style="margin:0 0 10px">Alguien pidió restablecer la contraseña de esta cuenta. Si fuiste tú, usa el botón: el enlace vale ${d.minutosDeVigencia} minutos y sirve una sola vez.</p>
    <p style="margin:0 0 16px">Si no lo pediste, no tienes que hacer nada: la contraseña actual sigue funcionando.</p>
  `
  return {
    to,
    subject: 'Restablece tu contraseña · PomAss',
    html: envolver({
      titulo: 'Restablece tu contraseña',
      contenido,
      boton: { texto: 'Cambiar mi contraseña', url: d.resetUrl },
    }),
    text: [
      `Alguien pidió restablecer la contraseña de esta cuenta. Si fuiste tú, abre este enlace (vale ${d.minutosDeVigencia} minutos y sirve una sola vez):`,
      d.resetUrl,
      '',
      'Si no lo pediste, no tienes que hacer nada: la contraseña actual sigue funcionando.',
    ].join('\n'),
  }
}
