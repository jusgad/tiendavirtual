import { ConflictError, NotFoundError, UnauthorizedError } from '../../../shared/errors/AppError'
import {
  CheckoutConfig,
  IncomingPaymentEvent,
  OrderPaymentGateway,
  PaymentGateway,
  PaymentNotifier,
  PaymentRecord,
  PaymentRepository,
} from '../domain/ports'
import { PaymentMethod } from '../domain/paymentMethod'
import { PaymentStatus } from '../domain/paymentStatus'

/**
 * Prepara el pago de un pedido: crea (o reutiliza) el registro de pago, crea
 * el cobro en Mercado Pago y devuelve a dónde hay que mandar el navegador.
 * No cobra nada: el cobro ocurre en el sitio de Mercado Pago.
 */
export class StartPaymentUseCase {
  constructor(
    private readonly orders: OrderPaymentGateway,
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
  ) {}

  async execute(
    userId: string | null,
    orderId: string,
  ): Promise<{ payment: PaymentRecord; checkout: CheckoutConfig }> {
    const order = await this.orders.getForPayment(orderId, userId)
    if (!order) throw new NotFoundError('Pedido no encontrado')
    if (order.status !== 'PENDING') {
      throw new ConflictError('El pedido no está pendiente de pago')
    }

    // Si la clienta vuelve a intentar (cerró el checkout, le rechazaron la
    // tarjeta), se reutiliza el mismo registro en vez de acumular filas: la
    // referencia que ve Mercado Pago es el número de pedido y debe resolver a
    // un único pago.
    const existing = await this.payments.findPendingByOrderId(order.id)
    const payment =
      existing ??
      (await this.payments.create({
        orderId: order.id,
        method: PaymentMethod.MERCADO_PAGO,
        amount: order.total,
        currency: order.currency,
        externalReference: order.orderNumber,
      }))

    const checkout = await this.gateway.buildCheckout({
      reference: order.orderNumber,
      amount: order.total,
      currency: order.currency,
      description: `Pedido ${order.orderNumber} · PomAss`,
    })

    return { payment, checkout }
  }
}

export type WebhookOutcome =
  | { status: PaymentStatus; idempotent?: boolean }
  | { ignored: true; reason: string }

/**
 * Procesa un aviso de webhook de Mercado Pago. Es la ÚNICA fuente de verdad de
 * un pago: nunca se confía en el redirect del navegador.
 */
export class HandleWebhookUseCase {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly orders: OrderPaymentGateway,
    private readonly gateway: PaymentGateway,
    private readonly notifier: PaymentNotifier,
  ) {}

  async execute(event: IncomingPaymentEvent): Promise<WebhookOutcome> {
    const outcome = await this.gateway.verifyEvent(event)
    if (outcome.kind === 'invalid') throw new UnauthorizedError('Firma del evento inválida')
    // Aviso auténtico pero que no nos toca procesar. Se responde 200 a
    // propósito: con un error, Mercado Pago lo reintentaría durante horas.
    if (outcome.kind === 'ignored') return { ignored: true, reason: outcome.reason }

    const result = outcome.result
    const payment = await this.payments.findByExternalReference(result.reference)
    if (!payment) throw new NotFoundError('Pago no encontrado')

    // Un pago ya aprobado no se degrada… salvo a REFUNDED: un reembolso o un
    // contracargo sí son información nueva y real sobre el dinero. El pedido
    // se deja como está; devolverlo a mano es decisión de la tienda.
    if (payment.status === PaymentStatus.APPROVED && result.status !== PaymentStatus.REFUNDED) {
      return { status: PaymentStatus.APPROVED, idempotent: true }
    }

    // Reentrega del mismo aviso (Mercado Pago reintenta si no recibe 200).
    if (payment.status === result.status && payment.providerTransactionId === result.transactionId) {
      return { status: payment.status, idempotent: true }
    }

    await this.payments.markStatus(payment.id, result.status, event.body, result.transactionId)

    if (result.status === PaymentStatus.APPROVED) {
      // Devuelve datos solo si la guarda PENDING -> PAID dejó pasar, así que
      // el correo sale una vez aunque Mercado Pago reenvíe el aviso.
      const pedido = await this.orders.markPaid(payment.orderId)
      if (pedido?.contactEmail) {
        // El puerto promete no lanzar, pero aquí se refuerza: si una excepción
        // subiera, el webhook respondería error y Mercado Pago reintentaría el
        // aviso en bucle por un pago que ya quedó bien registrado.
        try {
          await this.notifier.orderPaid({
            to: pedido.contactEmail,
            orderNumber: pedido.orderNumber,
            total: pedido.total,
          })
        } catch {
          // Ignorado a propósito: el adaptador ya deja el fallo en el log.
        }
      }
    }

    return { status: result.status }
  }
}

export class GetPaymentUseCase {
  constructor(private readonly payments: PaymentRepository) {}
  async execute(userId: string, id: string): Promise<PaymentRecord> {
    const payment = await this.payments.findByIdForUser(id, userId)
    if (!payment) throw new NotFoundError('Pago no encontrado')
    return payment
  }
}
