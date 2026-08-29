import {
  allowedTransitionsFrom,
  assertShipmentDataFor,
  assertTransitionAllowed,
  cancellationRestoresStock,
} from '../../../src/modules/admin/domain/orderTransitions'
import { OrderStatus } from '../../../src/modules/admin/domain/orderStatus'

describe('assertTransitionAllowed', () => {
  it('permite el avance operativo completo', () => {
    expect(() => assertTransitionAllowed(OrderStatus.PAID, OrderStatus.PREPARING)).not.toThrow()
    expect(() => assertTransitionAllowed(OrderStatus.PREPARING, OrderStatus.SHIPPED)).not.toThrow()
    expect(() => assertTransitionAllowed(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).not.toThrow()
  })

  it('NUNCA permite marcar PAID a mano: solo lo hace el webhook de pago', () => {
    expect(() => assertTransitionAllowed(OrderStatus.PENDING, OrderStatus.PAID)).toThrow(
      /solo pasa a PAID cuando la pasarela confirma/i,
    )
  })

  it('rechaza saltarse pasos', () => {
    expect(() => assertTransitionAllowed(OrderStatus.PAID, OrderStatus.SHIPPED)).toMatchErrorStatus(409)
    expect(() => assertTransitionAllowed(OrderStatus.PAID, OrderStatus.DELIVERED)).toMatchErrorStatus(409)
    expect(() => assertTransitionAllowed(OrderStatus.PENDING, OrderStatus.PREPARING)).toMatchErrorStatus(409)
  })

  it('rechaza retroceder', () => {
    expect(() => assertTransitionAllowed(OrderStatus.SHIPPED, OrderStatus.PREPARING)).toMatchErrorStatus(409)
    expect(() => assertTransitionAllowed(OrderStatus.DELIVERED, OrderStatus.SHIPPED)).toMatchErrorStatus(409)
  })

  it('trata DELIVERED y CANCELLED como estados finales', () => {
    expect(allowedTransitionsFrom(OrderStatus.DELIVERED)).toEqual([])
    expect(allowedTransitionsFrom(OrderStatus.CANCELLED)).toEqual([])
    expect(() => assertTransitionAllowed(OrderStatus.CANCELLED, OrderStatus.PREPARING)).toMatchErrorStatus(409)
  })

  it('rechaza (400) mover a un pedido al estado en el que ya está', () => {
    expect(() => assertTransitionAllowed(OrderStatus.PREPARING, OrderStatus.PREPARING)).toMatchErrorStatus(400)
  })

  it('permite cancelar mientras no se haya despachado', () => {
    expect(() => assertTransitionAllowed(OrderStatus.PENDING, OrderStatus.CANCELLED)).not.toThrow()
    expect(() => assertTransitionAllowed(OrderStatus.PAID, OrderStatus.CANCELLED)).not.toThrow()
    expect(() => assertTransitionAllowed(OrderStatus.PREPARING, OrderStatus.CANCELLED)).not.toThrow()
  })

  it('no permite cancelar un pedido ya enviado', () => {
    expect(() => assertTransitionAllowed(OrderStatus.SHIPPED, OrderStatus.CANCELLED)).toMatchErrorStatus(409)
  })

  it('el mensaje de error dice qué transiciones sí caben', () => {
    expect(() => assertTransitionAllowed(OrderStatus.PAID, OrderStatus.DELIVERED)).toThrow(/PREPARING/)
  })
})

describe('cancellationRestoresStock', () => {
  it('devuelve stock si el pedido aún no se despachó', () => {
    expect(cancellationRestoresStock(OrderStatus.PENDING)).toBe(true)
    expect(cancellationRestoresStock(OrderStatus.PAID)).toBe(true)
    expect(cancellationRestoresStock(OrderStatus.PREPARING)).toBe(true)
  })

  it('no devuelve stock de un pedido ya despachado o entregado', () => {
    expect(cancellationRestoresStock(OrderStatus.SHIPPED)).toBe(false)
    expect(cancellationRestoresStock(OrderStatus.DELIVERED)).toBe(false)
  })
})

describe('assertShipmentDataFor', () => {
  it('exige transportadora y guía al marcar como enviado', () => {
    expect(() =>
      assertShipmentDataFor(OrderStatus.SHIPPED, { carrier: 'Servientrega', trackingNumber: 'ABC123' }),
    ).not.toThrow()
  })

  it('rechaza (400) despachar sin datos de despacho', () => {
    expect(() => assertShipmentDataFor(OrderStatus.SHIPPED)).toMatchErrorStatus(400)
    expect(() => assertShipmentDataFor(OrderStatus.SHIPPED, {})).toMatchErrorStatus(400)
  })

  it('rechaza (400) despachar con solo uno de los dos campos', () => {
    expect(() => assertShipmentDataFor(OrderStatus.SHIPPED, { carrier: 'Servientrega' })).toMatchErrorStatus(400)
    expect(() => assertShipmentDataFor(OrderStatus.SHIPPED, { trackingNumber: 'ABC123' })).toMatchErrorStatus(400)
  })

  it('rechaza (400) datos de despacho en cualquier otra transición', () => {
    expect(() =>
      assertShipmentDataFor(OrderStatus.PREPARING, { carrier: 'Servientrega', trackingNumber: 'ABC123' }),
    ).toMatchErrorStatus(400)
    expect(() =>
      assertShipmentDataFor(OrderStatus.CANCELLED, { trackingNumber: 'ABC123' }),
    ).toMatchErrorStatus(400)
  })

  it('acepta transiciones sin datos de despacho', () => {
    expect(() => assertShipmentDataFor(OrderStatus.PREPARING)).not.toThrow()
    expect(() => assertShipmentDataFor(OrderStatus.DELIVERED)).not.toThrow()
  })
})

// Matcher local: comprueba que la función lanza un AppError con cierto statusCode.
expect.extend({
  toMatchErrorStatus(received: () => unknown, statusCode: number) {
    try {
      received()
    } catch (err) {
      const actual = (err as { statusCode?: number }).statusCode
      return {
        pass: actual === statusCode,
        message: () => `Se esperaba statusCode ${statusCode}, se recibió ${actual}`,
      }
    }
    return { pass: false, message: () => `Se esperaba que lanzara con statusCode ${statusCode}, no lanzó` }
  },
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toMatchErrorStatus(statusCode: number): R
    }
  }
}
