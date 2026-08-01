import { PaymentMethod, PaymentStatus } from '@prisma/client'
import {
  HandleWebhookUseCase,
  InitiatePaymentUseCase,
} from '../../../src/modules/payments/application/paymentUseCases'
import {
  CreateChargeResult,
  OrderForPayment,
  OrderPaymentGateway,
  PaymentProvider,
  PaymentProviderRegistry,
  PaymentRecord,
  PaymentRepository,
  WebhookResult,
} from '../../../src/modules/payments/domain/ports'

class FakeOrders implements OrderPaymentGateway {
  paidCalls: string[] = []
  constructor(private order: OrderForPayment | null) {}
  async getForPayment() {
    return this.order
  }
  async markPaid(orderId: string) {
    this.paidCalls.push(orderId)
    return true
  }
}

class FakePayments implements PaymentRepository {
  records: PaymentRecord[] = []
  async create(data: {
    orderId: string
    method: PaymentMethod
    amount: number
    currency: string
    externalReference: string
  }): Promise<PaymentRecord> {
    const rec: PaymentRecord = { id: `pay-${this.records.length + 1}`, status: PaymentStatus.PENDING, ...data }
    this.records.push(rec)
    return rec
  }
  async findByIdForUser(id: string) {
    return this.records.find((r) => r.id === id) ?? null
  }
  async findByExternalReference(ref: string) {
    return this.records.find((r) => r.externalReference === ref) ?? null
  }
  async markStatus(id: string, status: PaymentStatus) {
    const r = this.records.find((x) => x.id === id)!
    r.status = status
    return r
  }
}

class FakeProvider implements PaymentProvider {
  readonly method = PaymentMethod.NEQUI
  constructor(private webhookResult: WebhookResult | null) {}
  async createCharge(): Promise<CreateChargeResult> {
    return { externalReference: 'nequi_123', instructions: 'Aprueba en Nequi' }
  }
  verifyWebhook(): WebhookResult | null {
    return this.webhookResult
  }
}

class FakeRegistry implements PaymentProviderRegistry {
  constructor(private provider: PaymentProvider) {}
  get() {
    return this.provider
  }
}

const order: OrderForPayment = {
  id: 'order-1',
  orderNumber: 'PA-2026-ABC',
  total: 100000,
  currency: 'COP',
  status: 'PENDING',
}

describe('InitiatePaymentUseCase', () => {
  it('crea un cobro PENDING y devuelve instrucciones', async () => {
    const orders = new FakeOrders(order)
    const payments = new FakePayments()
    const useCase = new InitiatePaymentUseCase(orders, payments, new FakeRegistry(new FakeProvider(null)))

    const res = await useCase.execute('user-1', {
      orderId: 'order-1',
      method: PaymentMethod.NEQUI,
      methodData: { phone: '3105676187' },
    })

    expect(res.payment.status).toBe(PaymentStatus.PENDING)
    expect(res.payment.externalReference).toBe('nequi_123')
    expect(res.instructions).toContain('Nequi')
  })

  it('permite pagar sin sesión (userId null) un pedido de invitado', async () => {
    const orders = new FakeOrders(order)
    const payments = new FakePayments()
    const useCase = new InitiatePaymentUseCase(orders, payments, new FakeRegistry(new FakeProvider(null)))

    const res = await useCase.execute(null, {
      orderId: 'order-1',
      method: PaymentMethod.NEQUI,
      methodData: { phone: '3105676187' },
    })

    expect(res.payment.status).toBe(PaymentStatus.PENDING)
  })

  it('rechaza (404) si el pedido no existe', async () => {
    const useCase = new InitiatePaymentUseCase(new FakeOrders(null), new FakePayments(), new FakeRegistry(new FakeProvider(null)))
    await expect(
      useCase.execute('user-1', { orderId: 'x', method: PaymentMethod.NEQUI, methodData: {} }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rechaza (409) si el pedido no está PENDING', async () => {
    const useCase = new InitiatePaymentUseCase(
      new FakeOrders({ ...order, status: 'PAID' }),
      new FakePayments(),
      new FakeRegistry(new FakeProvider(null)),
    )
    await expect(
      useCase.execute('user-1', { orderId: 'order-1', method: PaymentMethod.NEQUI, methodData: {} }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('HandleWebhookUseCase', () => {
  async function seedPending(payments: FakePayments) {
    await payments.create({
      orderId: 'order-1',
      method: PaymentMethod.NEQUI,
      amount: 100000,
      currency: 'COP',
      externalReference: 'nequi_123',
    })
  }

  it('rechaza (401) una firma inválida', async () => {
    const payments = new FakePayments()
    const orders = new FakeOrders(order)
    const useCase = new HandleWebhookUseCase(payments, orders, new FakeRegistry(new FakeProvider(null)))
    await expect(useCase.execute('nequi', {}, 'bad')).rejects.toMatchObject({ statusCode: 401 })
  })

  it('aprueba el pago y marca el pedido como PAID', async () => {
    const payments = new FakePayments()
    await seedPending(payments)
    const orders = new FakeOrders(order)
    const provider = new FakeProvider({ externalReference: 'nequi_123', approved: true })
    const useCase = new HandleWebhookUseCase(payments, orders, new FakeRegistry(provider))

    const res = await useCase.execute('nequi', { externalReference: 'nequi_123', status: 'APPROVED' }, 'good')

    expect(res.status).toBe(PaymentStatus.APPROVED)
    expect(orders.paidCalls).toEqual(['order-1'])
    expect(payments.records[0].status).toBe(PaymentStatus.APPROVED)
  })

  it('rechaza el pago (DECLINED) y NO marca el pedido como PAID', async () => {
    const payments = new FakePayments()
    await seedPending(payments)
    const orders = new FakeOrders(order)
    const provider = new FakeProvider({ externalReference: 'nequi_123', approved: false })
    const useCase = new HandleWebhookUseCase(payments, orders, new FakeRegistry(provider))

    const res = await useCase.execute('nequi', { externalReference: 'nequi_123', status: 'DECLINED' }, 'good')

    expect(res.status).toBe(PaymentStatus.DECLINED)
    expect(orders.paidCalls).toEqual([])
  })

  it('es idempotente si el pago ya fue procesado', async () => {
    const payments = new FakePayments()
    await seedPending(payments)
    payments.records[0].status = PaymentStatus.APPROVED // ya procesado
    const orders = new FakeOrders(order)
    const provider = new FakeProvider({ externalReference: 'nequi_123', approved: true })
    const useCase = new HandleWebhookUseCase(payments, orders, new FakeRegistry(provider))

    const res = await useCase.execute('nequi', { externalReference: 'nequi_123', status: 'APPROVED' }, 'good')

    expect(res.idempotent).toBe(true)
    expect(orders.paidCalls).toEqual([]) // no se reprocesa
  })

  it('rechaza (404) si la referencia no existe', async () => {
    const payments = new FakePayments()
    const orders = new FakeOrders(order)
    const provider = new FakeProvider({ externalReference: 'inexistente', approved: true })
    const useCase = new HandleWebhookUseCase(payments, orders, new FakeRegistry(provider))
    await expect(
      useCase.execute('nequi', { externalReference: 'inexistente', status: 'APPROVED' }, 'good'),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
