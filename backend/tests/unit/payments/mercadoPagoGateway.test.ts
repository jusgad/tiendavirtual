import crypto from 'node:crypto'
import {
  MercadoPagoGateway,
  buildSignatureManifest,
  esTokenDeMarcador,
  parseSignatureHeader,
} from '../../../src/modules/payments/infrastructure/mercadoPagoGateway'
import { IncomingPaymentEvent } from '../../../src/modules/payments/domain/ports'
import { PaymentStatus } from '../../../src/modules/payments/domain/paymentStatus'

const ACCESS_TOKEN = 'TEST-1234567890-access'
const WEBHOOK_SECRET = 'secreto-de-webhook-de-prueba'
const BASE = 'https://api.ejemplo-mp.test'

/** Respuestas encoladas, en el orden en que el adaptador las vaya pidiendo. */
type Respuesta = { status: number; body: unknown }

function fetchFalso(respuestas: Respuesta[]) {
  const llamadas: { url: string; init: RequestInit }[] = []
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    llamadas.push({ url: String(url), init: init ?? {} })
    const r = respuestas.shift() ?? { status: 500, body: { message: 'sin respuesta encolada' } }
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    } as Response
  }) as unknown as typeof fetch
  return { impl, llamadas }
}

function gateway(respuestas: Respuesta[] = [], extra: Record<string, unknown> = {}) {
  const { impl, llamadas } = fetchFalso(respuestas)
  const gw = new MercadoPagoGateway({
    accessToken: ACCESS_TOKEN,
    publicKey: 'TEST-llave-publica',
    webhookSecret: WEBHOOK_SECRET,
    notificationUrl: 'https://api.pomass.test/api/payments/webhook/mercadopago',
    backUrl: 'https://pomass.test/track.html',
    statementDescriptor: 'POMASS',
    apiBaseUrl: BASE,
    fetchImpl: impl,
    ...extra,
  })
  return { gw, llamadas }
}

// ---- Piezas de la firma ----

describe('esTokenDeMarcador', () => {
  it('reconoce el token de ejemplo de .env.example', () => {
    expect(esTokenDeMarcador('TEST-0000000000000000-000000-0')).toBe(true)
    expect(esTokenDeMarcador('')).toBe(true)
  })

  it('no confunde un token real con el de ejemplo', () => {
    expect(esTokenDeMarcador(ACCESS_TOKEN)).toBe(false)
    expect(esTokenDeMarcador('APP_USR-1234-5678')).toBe(false)
  })
})

describe('parseSignatureHeader', () => {
  it('extrae ts y v1 en cualquier orden y con espacios', () => {
    expect(parseSignatureHeader('ts=1700000000,v1=abc')).toEqual({ ts: '1700000000', v1: 'abc' })
    expect(parseSignatureHeader(' v1=abc , ts=17 ')).toEqual({ ts: '17', v1: 'abc' })
  })

  it('devuelve nulos si la cabecera falta o viene vacía', () => {
    expect(parseSignatureHeader(null)).toEqual({ ts: null, v1: null })
    expect(parseSignatureHeader('basura')).toEqual({ ts: null, v1: null })
  })
})

describe('buildSignatureManifest', () => {
  it('arma la plantilla id/request-id/ts en ese orden', () => {
    expect(buildSignatureManifest('123', 'req-1', '1700000000')).toBe(
      'id:123;request-id:req-1;ts:1700000000;',
    )
  })

  it('omite entero el tramo que no venga, en vez de dejarlo vacío', () => {
    expect(buildSignatureManifest(null, 'req-1', '17')).toBe('request-id:req-1;ts:17;')
    expect(buildSignatureManifest('123', null, null)).toBe('id:123;')
  })

  it('pasa el id a minúsculas, que es como lo firma Mercado Pago', () => {
    expect(buildSignatureManifest('AbC123', null, null)).toBe('id:abc123;')
  })
})

// ---- Crear el cobro ----

describe('buildCheckout', () => {
  const pedido = {
    reference: 'PA-2026-ABC',
    amount: 89900,
    currency: 'COP',
    description: 'Pedido PA-2026-ABC · PomAss',
  }

  it('crea la preferencia y devuelve a dónde mandar el navegador', async () => {
    const { gw, llamadas } = gateway([
      { status: 201, body: { id: 'pref-1', init_point: 'https://mp.test/checkout/pref-1' } },
    ])

    const config = await gw.buildCheckout(pedido)

    expect(config).toEqual({
      configured: true,
      preferenceId: 'pref-1',
      initPoint: 'https://mp.test/checkout/pref-1',
      publicKey: 'TEST-llave-publica',
      reference: 'PA-2026-ABC',
      amount: 89900,
      currency: 'COP',
      sandbox: true,
    })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0].url).toBe(`${BASE}/checkout/preferences`)
  })

  it('manda el monto, la moneda y la referencia del pedido', async () => {
    const { gw, llamadas } = gateway([
      { status: 201, body: { id: 'pref-1', init_point: 'https://mp.test/x' } },
    ])

    await gw.buildCheckout(pedido)
    const cuerpo = JSON.parse(String(llamadas[0].init.body))

    expect(cuerpo.external_reference).toBe('PA-2026-ABC')
    expect(cuerpo.items[0]).toMatchObject({ unit_price: 89900, currency_id: 'COP', quantity: 1 })
    expect(cuerpo.notification_url).toContain('/api/payments/webhook/mercadopago')
    expect(cuerpo.back_urls.success).toBe('https://pomass.test/track.html')
  })

  it('redondea el monto: Colombia no admite decimales en COP', async () => {
    const { gw, llamadas } = gateway([
      { status: 201, body: { id: 'p', init_point: 'https://mp.test/x' } },
    ])

    await gw.buildCheckout({ ...pedido, amount: 89900.4 })

    expect(JSON.parse(String(llamadas[0].init.body)).items[0].unit_price).toBe(89900)
  })

  it('reintentar el mismo pedido no abre un segundo cobro', async () => {
    const { gw, llamadas } = gateway([
      { status: 201, body: { id: 'p', init_point: 'https://mp.test/x' } },
    ])

    await gw.buildCheckout(pedido)
    const cabeceras = llamadas[0].init.headers as Record<string, string>

    expect(cabeceras['X-Idempotency-Key']).toBe('pref-PA-2026-ABC')
  })

  it('autoriza con el access token y nunca lo devuelve al navegador', async () => {
    const { gw, llamadas } = gateway([
      { status: 201, body: { id: 'p', init_point: 'https://mp.test/x' } },
    ])

    const config = await gw.buildCheckout(pedido)
    const cabeceras = llamadas[0].init.headers as Record<string, string>

    expect(cabeceras.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`)
    expect(JSON.stringify(config)).not.toContain(ACCESS_TOKEN)
    expect(JSON.stringify(config)).not.toContain(WEBHOOK_SECRET)
  })

  it('sin credenciales no llama a la API y marca el checkout como no configurado', async () => {
    const { gw, llamadas } = gateway([], { accessToken: 'TEST-0000000000000000-000000-0' })

    const config = await gw.buildCheckout(pedido)

    expect(config.configured).toBe(false)
    expect(config.initPoint).toBe('')
    expect(llamadas).toHaveLength(0)
  })

  it('marca sandbox=false con credenciales de producción', async () => {
    const { gw } = gateway([{ status: 201, body: { id: 'p', init_point: 'https://mp.test/x' } }], {
      accessToken: 'APP_USR-real',
    })

    expect((await gw.buildCheckout(pedido)).sandbox).toBe(false)
  })

  it('devuelve 503 si la API falla, no 500', async () => {
    const { gw } = gateway([{ status: 401, body: { message: 'invalid token' } }])

    await expect(gw.buildCheckout(pedido)).rejects.toMatchObject({ statusCode: 503 })
  })

  it('devuelve 503 si la respuesta no trae init_point utilizable', async () => {
    const { gw } = gateway([{ status: 201, body: { id: 'pref-1' } }])

    await expect(gw.buildCheckout(pedido)).rejects.toMatchObject({ statusCode: 503 })
  })
})

// ---- Verificar el aviso ----

function firmar(dataId: string | null, requestId: string | null, ts: string) {
  return crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(buildSignatureManifest(dataId, requestId, ts))
    .digest('hex')
}

function aviso(overrides: Partial<IncomingPaymentEvent> = {}): IncomingPaymentEvent {
  const dataId = '111222333'
  const requestId = 'req-abc'
  const ts = '1730000000'
  return {
    body: { type: 'payment', action: 'payment.updated', data: { id: dataId } },
    signatureHeader: `ts=${ts},v1=${firmar(dataId, requestId, ts)}`,
    requestId,
    queryDataId: dataId,
    queryType: 'payment',
    ...overrides,
  }
}

const pagoAprobado = {
  status: 200,
  body: { id: 111222333, status: 'approved', external_reference: 'PA-2026-ABC' },
}

describe('verifyEvent · firma', () => {
  it('acepta un aviso bien firmado y consulta el pago real', async () => {
    const { gw, llamadas } = gateway([pagoAprobado])

    const outcome = await gw.verifyEvent(aviso())

    expect(outcome).toEqual({
      kind: 'payment',
      result: {
        reference: 'PA-2026-ABC',
        transactionId: '111222333',
        status: PaymentStatus.APPROVED,
      },
    })
    expect(llamadas[0].url).toBe(`${BASE}/v1/payments/111222333`)
  })

  it('no se fía del cuerpo: el estado sale de lo que responde la API', async () => {
    const { gw } = gateway([
      { status: 200, body: { id: 1, status: 'rejected', external_reference: 'PA-2026-ABC' } },
    ])

    const outcome = await gw.verifyEvent(
      aviso({ body: { type: 'payment', data: { id: '111222333' }, status: 'approved' } }),
    )

    expect(outcome).toMatchObject({ kind: 'payment', result: { status: PaymentStatus.DECLINED } })
  })

  it('rechaza una firma que no cuadra', async () => {
    const { gw, llamadas } = gateway([pagoAprobado])

    const outcome = await gw.verifyEvent(
      aviso({ signatureHeader: `ts=1730000000,v1=${'a'.repeat(64)}` }),
    )

    expect(outcome).toEqual({ kind: 'invalid' })
    // Y no se gasta una consulta a la API por un aviso falso.
    expect(llamadas).toHaveLength(0)
  })

  it('rechaza si cambian el id del pago sin volver a firmar', async () => {
    const outcome = await gateway([pagoAprobado]).gw.verifyEvent(aviso({ queryDataId: '999' }))
    expect(outcome).toEqual({ kind: 'invalid' })
  })

  it('rechaza si falta la cabecera de firma', async () => {
    const outcome = await gateway([pagoAprobado]).gw.verifyEvent(aviso({ signatureHeader: null }))
    expect(outcome).toEqual({ kind: 'invalid' })
  })

  it('acepta la firma en mayúsculas', async () => {
    const e = aviso()
    const { gw } = gateway([pagoAprobado])

    const outcome = await gw.verifyEvent({
      ...e,
      signatureHeader: e.signatureHeader!.toUpperCase().replace('TS=', 'ts=').replace('V1=', 'v1='),
    })

    expect(outcome).toMatchObject({ kind: 'payment' })
  })

  it('acepta el tipo desde la query cuando el cuerpo no lo trae', async () => {
    const { gw } = gateway([pagoAprobado])

    const outcome = await gw.verifyEvent(aviso({ body: {}, queryType: 'payment' }))

    expect(outcome).toMatchObject({ kind: 'payment' })
  })

  it('acepta un aviso sin x-request-id (el tramo no entra en la firma)', async () => {
    const ts = '1730000000'
    const { gw } = gateway([pagoAprobado])

    const outcome = await gw.verifyEvent(
      aviso({ requestId: null, signatureHeader: `ts=${ts},v1=${firmar('111222333', null, ts)}` }),
    )

    expect(outcome).toMatchObject({ kind: 'payment' })
  })
})

describe('verifyEvent · avisos que se ignoran', () => {
  /**
   * Todos estos responden 200. Si respondieran error, Mercado Pago reintentaría
   * el mismo aviso durante horas por algo que nunca vamos a procesar.
   */
  it('ignora los avisos que no son de pago', async () => {
    const ts = '1730000000'
    const { gw, llamadas } = gateway([])

    const outcome = await gw.verifyEvent(
      aviso({
        body: { type: 'merchant_order', data: { id: '111222333' } },
        queryType: 'merchant_order',
        signatureHeader: `ts=${ts},v1=${firmar('111222333', 'req-abc', ts)}`,
      }),
    )

    expect(outcome).toMatchObject({ kind: 'ignored' })
    expect(llamadas).toHaveLength(0)
  })

  it('ignora un pago que no existe (las pruebas del panel mandan ids inventados)', async () => {
    const { gw } = gateway([{ status: 404, body: { message: 'not found' } }])

    expect(await gw.verifyEvent(aviso())).toMatchObject({ kind: 'ignored' })
  })

  it('ignora un pago sin referencia de comercio', async () => {
    const { gw } = gateway([{ status: 200, body: { id: 1, status: 'approved' } }])

    expect(await gw.verifyEvent(aviso())).toMatchObject({ kind: 'ignored' })
  })

  it('ignora un estado que todavía no conocemos en vez de adivinarlo', async () => {
    const { gw } = gateway([
      { status: 200, body: { id: 1, status: 'algo_nuevo', external_reference: 'PA-2026-ABC' } },
    ])

    expect(await gw.verifyEvent(aviso())).toMatchObject({ kind: 'ignored' })
  })

  it('propaga un fallo real de la API como 503, para que reintente', async () => {
    const { gw } = gateway([{ status: 500, body: { message: 'boom' } }])

    await expect(gw.verifyEvent(aviso())).rejects.toMatchObject({ statusCode: 503 })
  })
})

describe('verifyEvent · estados', () => {
  it.each([
    ['approved', PaymentStatus.APPROVED],
    ['authorized', PaymentStatus.PENDING],
    ['pending', PaymentStatus.PENDING],
    ['in_process', PaymentStatus.PENDING],
    ['in_mediation', PaymentStatus.PENDING],
    ['rejected', PaymentStatus.DECLINED],
    ['cancelled', PaymentStatus.DECLINED],
    ['refunded', PaymentStatus.REFUNDED],
    ['charged_back', PaymentStatus.REFUNDED],
  ])('mapea el estado %s de Mercado Pago a %s', async (mp, esperado) => {
    const { gw } = gateway([
      { status: 200, body: { id: 1, status: mp, external_reference: 'PA-2026-ABC' } },
    ])

    expect(await gw.verifyEvent(aviso())).toMatchObject({ result: { status: esperado } })
  })
})
