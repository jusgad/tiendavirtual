import { ConflictError, NotFoundError, UnauthorizedError } from '../../../shared/errors/AppError'
import {
  OrderPaymentGateway,
  PaymentProviderRegistry,
  PaymentRecord,
  PaymentRepository,
} from '../domain/ports'
import { PaymentMethod } from '../domain/paymentMethod'
import { PaymentStatus } from '../domain/paymentStatus'
import { providerKeyToMethod } from '../infrastructure/providers'

export interface InitiatePaymentInput {
  orderId: string
  method: PaymentMethod
  methodData: Record<string, unknown>
}

export class InitiatePaymentUseCase {
  constructor(
    private readonly orders: OrderPaymentGateway,
    private readonly payments: PaymentRepository,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async execute(
    userId: string | null,
    input: InitiatePaymentInput,
  ): Promise<{ payment: PaymentRecord; instructions: string }> {
    const order = await this.orders.getForPayment(input.orderId, userId)
    if (!order) throw new NotFoundError('Pedido no encontrado')
    if (order.status !== 'PENDING') {
      throw new ConflictError('El pedido no está pendiente de pago')
    }

    const provider = this.registry.get(input.method)
    const charge = await provider.createCharge({
      orderReference: order.orderNumber,
      amount: order.total,
      currency: order.currency,
      methodData: input.methodData,
    })

    const payment = await this.payments.create({
      orderId: order.id,
      method: input.method,
      amount: order.total,
      currency: order.currency,
      externalReference: charge.externalReference,
    })

    return { payment, instructions: charge.instructions }
  }
}

export class HandleWebhookUseCase {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly orders: OrderPaymentGateway,
    private readonly registry: PaymentProviderRegistry,
  ) {}

  async execute(
    providerKey: string,
    payload: unknown,
    signature: string | undefined,
  ): Promise<{ status: PaymentStatus; idempotent?: boolean }> {
    const method = providerKeyToMethod(providerKey)
    if (!method) throw new NotFoundError('Proveedor de pago no válido')

    const provider = this.registry.get(method)
    const result = provider.verifyWebhook(payload, signature)
    if (!result) throw new UnauthorizedError('Firma de webhook inválida')

    const payment = await this.payments.findByExternalReference(result.externalReference)
    if (!payment) throw new NotFoundError('Pago no encontrado')

    // Idempotencia: si ya se procesó, no se reprocesa.
    if (payment.status !== PaymentStatus.PENDING) {
      return { status: payment.status, idempotent: true }
    }

    const newStatus = result.approved ? PaymentStatus.APPROVED : PaymentStatus.DECLINED
    await this.payments.markStatus(payment.id, newStatus, payload)

    if (result.approved) {
      await this.orders.markPaid(payment.orderId)
    }

    return { status: newStatus }
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
