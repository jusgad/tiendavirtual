import { Request, Response } from 'express'
import { PaymentsController } from '../../../src/modules/payments/interfaces/http/payments.controller'
import {
  GetPaymentUseCase,
  HandleWebhookUseCase,
} from '../../../src/modules/payments/application/paymentUseCases'
import { IncomingPaymentEvent } from '../../../src/modules/payments/domain/ports'
import { PaymentStatus } from '../../../src/modules/payments/domain/paymentStatus'

/**
 * Lo que se comprueba aquí es la traducción de HTTP a dominio, que con Mercado
 * Pago dejó de ser trivial: lo que hay que verificar está repartido entre dos
 * cabeceras, la query string y el cuerpo. Si esta capa recoge mal cualquiera
 * de los tres, la firma no cuadra nunca y ningún pago se confirma.
 */
function montar() {
  const recibidos: IncomingPaymentEvent[] = []
  const webhook = {
    execute: async (event: IncomingPaymentEvent) => {
      recibidos.push(event)
      return { status: PaymentStatus.APPROVED }
    },
  } as unknown as HandleWebhookUseCase

  const controller = new PaymentsController(
    {} as never,
    webhook,
    {} as unknown as GetPaymentUseCase,
  )
  return { controller, recibidos }
}

function respuestaFalsa() {
  const res = {
    codigo: 0,
    cuerpo: undefined as unknown,
    status(c: number) {
      res.codigo = c
      return res
    },
    json(c: unknown) {
      res.cuerpo = c
      return res
    },
  }
  return res
}

function peticion(overrides: Partial<Request> = {}): Request {
  return {
    body: { type: 'payment', data: { id: '111222333' } },
    headers: { 'x-signature': 'ts=1730000000,v1=abc', 'x-request-id': 'req-1' },
    query: { 'data.id': '111222333', type: 'payment' },
    ...overrides,
  } as unknown as Request
}

describe('PaymentsController · webhook', () => {
  it('recoge la firma, el request-id y el data.id de la query', async () => {
    const { controller, recibidos } = montar()

    await controller.handleWebhook(peticion(), respuestaFalsa() as unknown as Response)

    expect(recibidos[0]).toEqual({
      body: { type: 'payment', data: { id: '111222333' } },
      signatureHeader: 'ts=1730000000,v1=abc',
      requestId: 'req-1',
      queryDataId: '111222333',
      queryType: 'payment',
    })
  })

  it('recoge el tipo también desde la query, no solo del cuerpo', async () => {
    const { controller, recibidos } = montar()

    await controller.handleWebhook(
      peticion({ body: {}, query: { 'data.id': '1', topic: 'merchant_order' } as never }),
      respuestaFalsa() as unknown as Response,
    )

    expect(recibidos[0].queryType).toBe('merchant_order')
  })

  it('acepta `?id=` como alias de `?data.id=` (avisos antiguos)', async () => {
    const { controller, recibidos } = montar()

    await controller.handleWebhook(
      peticion({ query: { id: '999' } as never }),
      respuestaFalsa() as unknown as Response,
    )

    expect(recibidos[0].queryDataId).toBe('999')
  })

  it('deja el id en null si no viene en la query, en vez de inventarlo', async () => {
    const { controller, recibidos } = montar()

    await controller.handleWebhook(
      peticion({ query: {} as never }),
      respuestaFalsa() as unknown as Response,
    )

    // El cuerpo sigue trayendo el id, pero ese no es el que Mercado Pago
    // firma: el tramo tiene que quedar fuera del manifiesto.
    expect(recibidos[0].queryDataId).toBeNull()
  })

  it('se queda con la primera cuando una cabecera llega repetida', async () => {
    const { controller, recibidos } = montar()

    await controller.handleWebhook(
      peticion({ headers: { 'x-signature': ['ts=1,v1=a', 'ts=2,v1=b'] } as never }),
      respuestaFalsa() as unknown as Response,
    )

    expect(recibidos[0].signatureHeader).toBe('ts=1,v1=a')
    expect(recibidos[0].requestId).toBeNull()
  })

  it('responde 200 con el desenlace del caso de uso', async () => {
    const { controller } = montar()
    const res = respuestaFalsa()

    await controller.handleWebhook(peticion(), res as unknown as Response)

    expect(res.codigo).toBe(200)
    expect(res.cuerpo).toEqual({ received: true, status: PaymentStatus.APPROVED })
  })
})
