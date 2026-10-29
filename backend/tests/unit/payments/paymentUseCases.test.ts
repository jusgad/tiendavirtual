import { SpyNotifier } from '../shared/notifierFakes'
import {
  GetPaymentUseCase,
  HandleWebhookUseCase,
  StartPaymentUseCase,
} from '../../../src/modules/payments/application/paymentUseCases'
import {
  BuildCheckoutInput,
  CheckoutConfig,
  OrderForPayment,
  OrderPaymentGateway,
  PaymentEventResult,
  PaymentGateway,
  PaymentRecord,
  PaymentRepository,
} from '../../../src/modules/payments/domain/ports'
import { PaymentMethod } from '../../../src/modules/payments/domain/paymentMethod'
import { PaymentStatus } from '../../../src/modules/payments/domain/paymentStatus'

class FakeOrders implements OrderPaymentGateway {
  paidCalls: string[] = []
  constructor(private order: OrderForPayment | null) {}
  async getForPayment() {
    return this.order
  }
  /** Si es false, `markPaid` devuelve null: simula un pedido que ya no está PENDING. */
  aplicaTransicion = true
  async markPaid(orderId: string) {
    this.paidCalls.push(orderId)
    if (!this.aplicaTransicion) return null
    return { orderNumber: 'PA-2026-ABC123', total: 79900, contactEmail: 'clienta@ejemplo.co' }
  }
}

class FakePayments implements PaymentRepository {
  records: PaymentRecord[] = []
  createCalls = 0

  async create(data: {
    orderId: string
    method: PaymentMethod
    amount: number
    currency: string
    externalReference: string
  }): Promise<PaymentRecord> {
    this.createCalls++
    const rec: PaymentRecord = {
      id: `pay-${this.records.length + 1}`,
      status: PaymentStatus.PENDING,
      wompiTransactionId: null,
      ...data,
    }
    this.records.push(rec)
    return rec
  }
  async findByIdForUser(id: string) {
    return this.records.find((r) => r.id === id) ?? null
  }
  async findByExternalReference(ref: string) {
    return this.records.find((r) => r.externalReference === ref) ?? null
  }
  async findPendingByOrderId(orderId: string) {
    return this.records.find((r) => r.orderId === orderId && r.status === PaymentStatus.PENDING) ?? null
  }
  async markStatus(id: string, status: PaymentStatus, _raw: unknown, wompiTransactionId: string | null) {
    const r = this.records.find((x) => x.id === id)!
    r.status = status
    r.wompiTransactionId = wompiTransactionId
    return r
  }
}

class FakeGateway implements PaymentGateway {
  constructor(private eventResult: PaymentEventResult | null = null) {}
  buildCheckout(input: BuildCheckoutInput): CheckoutConfig {
    return {
      publicKey: 'pub_test_abc',
      currency: input.currency,
      amountInCents: input.amount * 100,
      reference: input.reference,
      signature: 'firma-simulada',
      redirectUrl: null,
    }
  }
  verifyEvent(): PaymentEventResult | null {
    return this.eventResult
  }
}

const order: OrderForPayment = {
  id: 'order-1',
  orderNumber: 'PA-2026-ABC',
  total: 79900,
  currency: 'COP',
  status: 'PENDING',
}

describe('StartPaymentUseCase', () => {
  it('crea el pago y devuelve la configuración del widget', async () => {
    const payments = new FakePayments()
    const useCase = new StartPaymentUseCase(new FakeOrders(order), payments, new FakeGateway())

    const res = await useCase.execute('user-1', 'order-1')

    expect(res.payment.status).toBe(PaymentStatus.PENDING)
    expect(res.payment.method).toBe(PaymentMethod.WOMPI)
    // La referencia que ve Wompi es el número de pedido.
    expect(res.payment.externalReference).toBe('PA-2026-ABC')
    expect(res.checkout.amountInCents).toBe(7990000)
    expect(res.checkout.reference).toBe('PA-2026-ABC')
  })

  it('permite pagar sin sesión un pedido de invitado', async () => {
    const useCase = new StartPaymentUseCase(new FakeOrders(order), new FakePayments(), new FakeGateway())
    const res = await useCase.execute(null, 'order-1')
    expect(res.payment.status).toBe(PaymentStatus.PENDING)
  })

  it('reutiliza el pago pendiente si el cliente reintenta, sin duplicar filas', async () => {
    const payments = new FakePayments()
    const useCase = new StartPaymentUseCase(new FakeOrders(order), payments, new FakeGateway())

    const primero = await useCase.execute('user-1', 'order-1')
    const segundo = await useCase.execute('user-1', 'order-1')

    expect(payments.createCalls).toBe(1)
    expect(segundo.payment.id).toBe(primero.payment.id)
    expect(payments.records).toHaveLength(1)
  })

  it('rechaza (404) si el pedido no existe', async () => {
    const useCase = new StartPaymentUseCase(new FakeOrders(null), new FakePayments(), new FakeGateway())
    await expect(useCase.execute('user-1', 'x')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rechaza (409) si el pedido no está pendiente de pago', async () => {
    const useCase = new StartPaymentUseCase(
      new FakeOrders({ ...order, status: 'PAID' }),
      new FakePayments(),
      new FakeGateway(),
    )
    await expect(useCase.execute('user-1', 'order-1')).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('HandleWebhookUseCase', () => {
  async function conPagoPendiente() {
    const payments = new FakePayments()
    await payments.create({
      orderId: 'order-1',
      method: PaymentMethod.WOMPI,
      amount: 79900,
      currency: 'COP',
      externalReference: 'PA-2026-ABC',
    })
    return payments
  }

  const aprobado: PaymentEventResult = {
    reference: 'PA-2026-ABC',
    transactionId: 'txn-001',
    status: PaymentStatus.APPROVED,
  }

  it('rechaza (401) si el checksum no es válido', async () => {
    const useCase = new HandleWebhookUseCase(new FakePayments(), new FakeOrders(order), new FakeGateway(null), new SpyNotifier())
    await expect(useCase.execute({})).rejects.toMatchObject({ statusCode: 401 })
  })

  it('aprueba el pago, guarda el id de transacción y marca el pedido como PAID', async () => {
    const payments = await conPagoPendiente()
    const orders = new FakeOrders(order)
    const useCase = new HandleWebhookUseCase(payments, orders, new FakeGateway(aprobado), new SpyNotifier())

    const res = await useCase.execute({})

    expect(res.status).toBe(PaymentStatus.APPROVED)
    expect(orders.paidCalls).toEqual(['order-1'])
    expect(payments.records[0].wompiTransactionId).toBe('txn-001')
  })

  it('rechaza el pago sin marcar el pedido como PAID', async () => {
    const payments = await conPagoPendiente()
    const orders = new FakeOrders(order)
    const useCase = new HandleWebhookUseCase(
      payments,
      orders,
      new FakeGateway({ ...aprobado, status: PaymentStatus.DECLINED }),
      new SpyNotifier(),
    )

    const res = await useCase.execute({})

    expect(res.status).toBe(PaymentStatus.DECLINED)
    expect(orders.paidCalls).toEqual([])
  })

  it('es idempotente ante la reentrega del mismo evento', async () => {
    const payments = await conPagoPendiente()
    const orders = new FakeOrders(order)
    const useCase = new HandleWebhookUseCase(payments, orders, new FakeGateway(aprobado), new SpyNotifier())

    await useCase.execute({})
    const segunda = await useCase.execute({})

    expect(segunda.idempotent).toBe(true)
    expect(orders.paidCalls).toEqual(['order-1']) // no se reprocesa
  })

  it('nunca degrada un pago ya aprobado', async () => {
    const payments = await conPagoPendiente()
    const orders = new FakeOrders(order)
    // Primero se aprueba...
    await new HandleWebhookUseCase(payments, orders, new FakeGateway(aprobado), new SpyNotifier()).execute({})
    // ...y después llega un evento de rechazo con otra transacción.
    const res = await new HandleWebhookUseCase(
      payments,
      orders,
      new FakeGateway({ reference: 'PA-2026-ABC', transactionId: 'txn-002', status: PaymentStatus.DECLINED }),
      new SpyNotifier(),
    ).execute({})

    expect(res.status).toBe(PaymentStatus.APPROVED)
    expect(res.idempotent).toBe(true)
    expect(payments.records[0].status).toBe(PaymentStatus.APPROVED)
  })

  it('permite reintentar: tras un rechazo, una transacción nueva sí aprueba el pedido', async () => {
    const payments = await conPagoPendiente()
    const orders = new FakeOrders(order)

    await new HandleWebhookUseCase(
      payments,
      orders,
      new FakeGateway({ reference: 'PA-2026-ABC', transactionId: 'txn-001', status: PaymentStatus.DECLINED }),
      new SpyNotifier(),
    ).execute({})

    const res = await new HandleWebhookUseCase(
      payments,
      orders,
      new FakeGateway({ reference: 'PA-2026-ABC', transactionId: 'txn-002', status: PaymentStatus.APPROVED }),
      new SpyNotifier(),
    ).execute({})

    expect(res.status).toBe(PaymentStatus.APPROVED)
    expect(res.idempotent).toBeUndefined()
    expect(orders.paidCalls).toEqual(['order-1'])
  })

  it('rechaza (404) si la referencia no corresponde a ningún pago', async () => {
    const useCase = new HandleWebhookUseCase(
      new FakePayments(),
      new FakeOrders(order),
      new FakeGateway(aprobado),
      new SpyNotifier(),
    )
    await expect(useCase.execute({})).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('GetPaymentUseCase', () => {
  it('rechaza (404) un pago que no es del usuario', async () => {
    await expect(new GetPaymentUseCase(new FakePayments()).execute('user-1', 'pay-1')).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('HandleWebhookUseCase · aviso de pago', () => {
  async function conPagoPendiente() {
    const payments = new FakePayments()
    await payments.create({
      orderId: 'order-1',
      method: PaymentMethod.WOMPI,
      amount: 79900,
      currency: 'COP',
      externalReference: 'PA-2026-ABC',
    })
    return payments
  }
  const aprobado: PaymentEventResult = {
    reference: 'PA-2026-ABC',
    transactionId: 'txn-001',
    status: PaymentStatus.APPROVED,
  }

  it('avisa cuando el pago queda aprobado', async () => {
    const notifier = new SpyNotifier()
    const useCase = new HandleWebhookUseCase(
      await conPagoPendiente(),
      new FakeOrders(order),
      new FakeGateway(aprobado),
      notifier,
    )

    await useCase.execute({})

    expect(notifier.de('orderPaid')).toEqual([
      { to: 'clienta@ejemplo.co', orderNumber: 'PA-2026-ABC123', total: 79900 },
    ])
  })

  it('no avisa si el pago fue rechazado', async () => {
    const notifier = new SpyNotifier()
    await new HandleWebhookUseCase(
      await conPagoPendiente(),
      new FakeOrders(order),
      new FakeGateway({ ...aprobado, status: PaymentStatus.DECLINED }),
      notifier,
    ).execute({})

    expect(notifier.de('orderPaid')).toHaveLength(0)
  })

  /**
   * Wompi reintenta el evento si no recibe 200 a tiempo. La guarda
   * PENDING -> PAID de `markPaid` es la que impide el segundo correo: no hay
   * un mecanismo aparte que pueda quedar desincronizado.
   */
  it('no manda dos avisos si el pedido ya no estaba PENDING', async () => {
    const notifier = new SpyNotifier()
    const orders = new FakeOrders(order)
    orders.aplicaTransicion = false

    await new HandleWebhookUseCase(
      await conPagoPendiente(),
      orders,
      new FakeGateway(aprobado),
      notifier,
    ).execute({})

    expect(orders.paidCalls).toEqual(['order-1'])
    expect(notifier.de('orderPaid')).toHaveLength(0)
  })

  it('responde 200 al webhook aunque el correo falle', async () => {
    const notifier = new SpyNotifier()
    notifier.falla = true

    const res = await new HandleWebhookUseCase(
      await conPagoPendiente(),
      new FakeOrders(order),
      new FakeGateway(aprobado),
      notifier,
    ).execute({})

    expect(res.status).toBe(PaymentStatus.APPROVED)
  })
})
