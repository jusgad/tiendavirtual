import crypto from 'node:crypto'
import {
  WompiGateway,
  buildEventChecksum,
  buildIntegritySignature,
  toCents,
} from '../../../src/modules/payments/infrastructure/wompiGateway'
import { PaymentStatus } from '../../../src/modules/payments/domain/paymentStatus'

const INTEGRITY = 'integridad-de-prueba'
const EVENTS = 'eventos-de-prueba'

const gateway = new WompiGateway({
  publicKey: 'pub_test_abc',
  integritySecret: INTEGRITY,
  eventsSecret: EVENTS,
  redirectUrl: 'https://pomass.co/track.html',
})

describe('toCents', () => {
  it('convierte COP a centavos', () => {
    expect(toCents(79900)).toBe(7990000)
  })

  it('redondea en vez de arrastrar error de coma flotante', () => {
    expect(toCents(0.1 + 0.2)).toBe(30)
  })
})

describe('buildIntegritySignature', () => {
  it('firma referencia + monto + moneda + secreto, en ese orden', () => {
    const esperado = crypto
      .createHash('sha256')
      .update(`PA-2026-ABC1237990000COP${INTEGRITY}`)
      .digest('hex')

    expect(buildIntegritySignature('PA-2026-ABC123', 7990000, 'COP', INTEGRITY)).toBe(esperado)
  })

  it('cambia si cambia el monto (es lo que impide alterarlo en el navegador)', () => {
    const a = buildIntegritySignature('PA-2026-ABC', 7990000, 'COP', INTEGRITY)
    const b = buildIntegritySignature('PA-2026-ABC', 100, 'COP', INTEGRITY)
    expect(a).not.toBe(b)
  })
})

describe('buildCheckout', () => {
  it('devuelve la configuración del widget con el monto en centavos y firmado', () => {
    const config = gateway.buildCheckout({ reference: 'PA-2026-ABC', amount: 79900, currency: 'COP' })

    expect(config).toEqual({
      publicKey: 'pub_test_abc',
      currency: 'COP',
      amountInCents: 7990000,
      reference: 'PA-2026-ABC',
      signature: buildIntegritySignature('PA-2026-ABC', 7990000, 'COP', INTEGRITY),
      redirectUrl: 'https://pomass.co/track.html',
    })
  })

  it('nunca expone los secretos', () => {
    const config = gateway.buildCheckout({ reference: 'PA-2026-ABC', amount: 79900, currency: 'COP' })
    const serializado = JSON.stringify(config)
    expect(serializado).not.toContain(INTEGRITY)
    expect(serializado).not.toContain(EVENTS)
  })
})

// ---- Eventos de webhook ----

const PROPERTIES = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents']

function evento(overrides: { status?: string; id?: string; reference?: string } = {}) {
  const data = {
    transaction: {
      id: overrides.id ?? 'txn-001',
      reference: overrides.reference ?? 'PA-2026-ABC',
      status: overrides.status ?? 'APPROVED',
      amount_in_cents: 7990000,
    },
  }
  const timestamp = 1730000000
  return {
    event: 'transaction.updated',
    data,
    timestamp,
    signature: {
      properties: PROPERTIES,
      checksum: buildEventChecksum(data, PROPERTIES, timestamp, EVENTS),
    },
  }
}

describe('buildEventChecksum', () => {
  it('concatena los valores de las rutas indicadas, luego timestamp y secreto', () => {
    const data = { transaction: { id: 'txn-001', status: 'APPROVED', amount_in_cents: 7990000 } }
    const esperado = crypto
      .createHash('sha256')
      .update(`txn-001APPROVED79900001730000000${EVENTS}`)
      .digest('hex')

    expect(buildEventChecksum(data, PROPERTIES, 1730000000, EVENTS)).toBe(esperado)
  })

  it('respeta el orden del array de propiedades', () => {
    const data = { transaction: { id: 'a', status: 'b', amount_in_cents: 1 } }
    const directo = buildEventChecksum(data, ['transaction.id', 'transaction.status'], 1, EVENTS)
    const invertido = buildEventChecksum(data, ['transaction.status', 'transaction.id'], 1, EVENTS)
    expect(directo).not.toBe(invertido)
  })

  it('trata una ruta inexistente como cadena vacía, sin romper', () => {
    expect(() => buildEventChecksum({}, ['transaction.id'], 1, EVENTS)).not.toThrow()
  })
})

describe('verifyEvent', () => {
  it('acepta un evento con checksum válido y mapea APPROVED', () => {
    expect(gateway.verifyEvent(evento())).toEqual({
      reference: 'PA-2026-ABC',
      transactionId: 'txn-001',
      status: PaymentStatus.APPROVED,
    })
  })

  it('acepta el checksum en mayúsculas (Wompi lo envía así)', () => {
    const e = evento()
    e.signature.checksum = e.signature.checksum.toUpperCase()
    expect(gateway.verifyEvent(e)?.status).toBe(PaymentStatus.APPROVED)
  })

  it('rechaza un checksum que no cuadra', () => {
    const e = evento()
    e.signature.checksum = 'a'.repeat(64)
    expect(gateway.verifyEvent(e)).toBeNull()
  })

  it('rechaza si manipulan el monto sin recalcular el checksum', () => {
    const e = evento()
    e.data.transaction.amount_in_cents = 100
    expect(gateway.verifyEvent(e)).toBeNull()
  })

  it('rechaza si manipulan el estado sin recalcular el checksum', () => {
    const e = evento({ status: 'DECLINED' })
    e.data.transaction.status = 'APPROVED' // cambiado después de firmar
    expect(gateway.verifyEvent(e)).toBeNull()
  })

  it('rechaza si falta la firma', () => {
    const e = evento() as Record<string, unknown>
    delete e.signature
    expect(gateway.verifyEvent(e)).toBeNull()
  })

  it('rechaza payloads que no son objetos', () => {
    expect(gateway.verifyEvent(null)).toBeNull()
    expect(gateway.verifyEvent('texto')).toBeNull()
    expect(gateway.verifyEvent(undefined)).toBeNull()
  })

  it.each([
    ['APPROVED', PaymentStatus.APPROVED],
    ['DECLINED', PaymentStatus.DECLINED],
    ['VOIDED', PaymentStatus.DECLINED],
    ['ERROR', PaymentStatus.DECLINED],
    ['PENDING', PaymentStatus.PENDING],
  ])('mapea el estado %s de Wompi a %s', (wompi, esperado) => {
    expect(gateway.verifyEvent(evento({ status: wompi }))?.status).toBe(esperado)
  })

  it('rechaza un estado desconocido de Wompi', () => {
    expect(gateway.verifyEvent(evento({ status: 'ALGO_NUEVO' }))).toBeNull()
  })
})
