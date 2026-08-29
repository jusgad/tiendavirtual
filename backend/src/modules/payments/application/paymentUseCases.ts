import { ConflictError, NotFoundError, UnauthorizedError } from '../../../shared/errors/AppError'
import {
  CheckoutConfig,
  OrderPaymentGateway,
  PaymentGateway,
  PaymentRecord,
  PaymentRepository,
} from '../domain/ports'
import { PaymentMethod } from '../domain/paymentMethod'
import { PaymentStatus } from '../domain/paymentStatus'

/**
 * Prepara el pago de un pedido: crea (o reutiliza) el registro de pago y
 * devuelve la configuración firmada que el widget de Wompi necesita en el
 * navegador. No cobra nada: el cobro ocurre dentro del widget.
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

    // Si el cliente vuelve a intentar (cerró el widget, le rechazaron la
    // tarjeta), se reutiliza el mismo registro en vez de acumular filas: la
    // referencia que ve Wompi es el número de pedido y debe resolver a un
    // único pago.
    const existing = await this.payments.findPendingByOrderId(order.id)
    const payment =
      existing ??
      (await this.payments.create({
        orderId: order.id,
        method: PaymentMethod.WOMPI,
        amount: order.total,
        currency: order.currency,
        externalReference: order.orderNumber,
      }))

    const checkout = this.gateway.buildCheckout({
      reference: order.orderNumber,
      amount: order.total,
      currency: order.currency,
    })

    return { payment, checkout }
  }
}

export interface WebhookOutcome {
  status: PaymentStatus
  idempotent?: boolean
}

/**
 * Procesa un evento `transaction.updated` de Wompi. Es la ÚNICA fuente de
 * verdad de un pago: nunca se confía en el redirect del navegador.
 */
export class HandleWebhookUseCase {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly orders: OrderPaymentGateway,
    private readonly gateway: PaymentGateway,
  ) {}

  async execute(payload: unknown): Promise<WebhookOutcome> {
    const result = this.gateway.verifyEvent(payload)
    if (!result) throw new UnauthorizedError('Checksum de evento inválido')

    const payment = await this.payments.findByExternalReference(result.reference)
    if (!payment) throw new NotFoundError('Pago no encontrado')

    // Un pago ya aprobado no se degrada nunca, llegue lo que llegue después.
    if (payment.status === PaymentStatus.APPROVED) {
      return { status: PaymentStatus.APPROVED, idempotent: true }
    }

    // Reentrega del mismo evento (Wompi reintenta si no recibe 200 a tiempo).
    if (payment.status === result.status && payment.wompiTransactionId === result.transactionId) {
      return { status: payment.status, idempotent: true }
    }

    await this.payments.markStatus(payment.id, result.status, payload, result.transactionId)

    if (result.status === PaymentStatus.APPROVED) {
      await this.orders.markPaid(payment.orderId)
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
