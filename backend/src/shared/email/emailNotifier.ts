import { logger } from '../logger/logger'
import { pagoConfirmado, pedidoEnviado, pedidoRecibido, recuperarContrasena } from './templates'
import type { ArticuloPedido } from './templates'
import { EmailSender } from './types'

/**
 * Compone y despacha los correos de la tienda.
 *
 * Implementa —estructuralmente— los puertos estrechos que cada módulo declara
 * en su dominio (`OrderNotifier`, `PaymentNotifier`, `ShipmentNotifier`,
 * `PasswordResetNotifier`). Los módulos no conocen esta clase: reciben su
 * puerto y ya. Es el mismo arreglo que el caché de catálogo, que `orders` y
 * `admin` declaran por separado y comparten un solo adaptador.
 *
 * REGLA QUE NO SE NEGOCIA: ningún método de aquí lanza.
 *
 * Estos avisos son efectos secundarios de operaciones que ya ocurrieron. Si
 * Resend está caído en el instante en que se crea un pedido, el pedido YA
 * existe, el inventario YA se descontó y el cupón YA se canjeó: dejar que la
 * excepción suba haría que la clienta viera un error y volviera a comprar. Un
 * correo que no llega es molesto; un cobro doble, no. El fallo se registra en
 * el log —con el pedido y el destinatario— para poder reenviar a mano.
 */
export class EmailNotifier {
  constructor(
    private readonly sender: EmailSender,
    /** Base pública del frontend, sin barra final. */
    private readonly frontendUrl: string,
  ) {}

  /**
   * Enlace de seguimiento. Lleva el número de pedido para autocompletarlo,
   * pero NO el correo: la página lo pide aparte, y así el enlace por sí solo
   * no deja ver el pedido de nadie —los enlaces acaban en historiales,
   * capturas y buscadores—.
   */
  private seguimiento(orderNumber: string): string {
    return `${this.frontendUrl}/track.html?pedido=${encodeURIComponent(orderNumber)}`
  }

  private async intentar(descripcion: string, destino: string, envio: () => Promise<void>) {
    try {
      await envio()
    } catch (err) {
      logger.error(
        { err, destino, correo: descripcion },
        'No se pudo enviar un correo; la operación de negocio sí se completó',
      )
    }
  }

  async orderPlaced(data: {
    to: string
    orderNumber: string
    total: number
    items: ArticuloPedido[]
  }): Promise<void> {
    await this.intentar('pedido recibido', data.to, () =>
      this.sender.send(
        pedidoRecibido(data.to, {
          orderNumber: data.orderNumber,
          total: data.total,
          items: data.items,
          trackingUrl: this.seguimiento(data.orderNumber),
        }),
      ),
    )
  }

  async orderPaid(data: { to: string; orderNumber: string; total: number }): Promise<void> {
    await this.intentar('pago confirmado', data.to, () =>
      this.sender.send(
        pagoConfirmado(data.to, {
          orderNumber: data.orderNumber,
          total: data.total,
          trackingUrl: this.seguimiento(data.orderNumber),
        }),
      ),
    )
  }

  async orderShipped(data: {
    to: string
    orderNumber: string
    carrier: string
    trackingNumber: string
  }): Promise<void> {
    await this.intentar('pedido enviado', data.to, () =>
      this.sender.send(
        pedidoEnviado(data.to, {
          orderNumber: data.orderNumber,
          carrier: data.carrier,
          trackingNumber: data.trackingNumber,
          trackingUrl: this.seguimiento(data.orderNumber),
        }),
      ),
    )
  }

  async passwordReset(data: {
    to: string
    rawToken: string
    minutosDeVigencia: number
  }): Promise<void> {
    await this.intentar('recuperar contraseña', data.to, () =>
      this.sender.send(
        recuperarContrasena(data.to, {
          // El token es hexadecimal, así que viaja limpio como segmento de la
          // ruta del hash, que es donde el panel lo espera.
          resetUrl: `${this.frontendUrl}/admin.html#/nueva-contrasena/${data.rawToken}`,
          minutosDeVigencia: data.minutosDeVigencia,
        }),
      ),
    )
  }
}
