import { describe, expect, it } from 'vitest'
import { esCancelado, esperaConfirmacion, indicePaso, PASOS, pasosConEstado } from './trackModel.js'

describe('PASOS', () => {
  it('describe el avance normal del pedido, en orden', () => {
    expect(PASOS.map((p) => p.status)).toEqual([
      'PENDING',
      'PAID',
      'PREPARING',
      'SHIPPED',
      'DELIVERED',
    ])
  })

  it('no incluye la cancelación: no es un paso del avance', () => {
    expect(PASOS.map((p) => p.status)).not.toContain('CANCELLED')
  })
})

describe('esCancelado', () => {
  it('distingue el pedido cancelado', () => {
    expect(esCancelado('CANCELLED')).toBe(true)
    expect(esCancelado('PENDING')).toBe(false)
    expect(esCancelado('DELIVERED')).toBe(false)
  })
})

describe('indicePaso', () => {
  it('ubica cada estado en la línea de tiempo', () => {
    expect(indicePaso('PENDING')).toBe(0)
    expect(indicePaso('SHIPPED')).toBe(3)
    expect(indicePaso('DELIVERED')).toBe(4)
  })

  it('devuelve -1 para lo que no está en la línea', () => {
    expect(indicePaso('CANCELLED')).toBe(-1)
    expect(indicePaso('LO_QUE_SEA')).toBe(-1)
  })
})

describe('pasosConEstado', () => {
  it('marca lo recorrido, lo actual y lo que falta', () => {
    expect(pasosConEstado('PREPARING').map((p) => p.estado)).toEqual([
      'completado',
      'completado',
      'actual',
      'pendiente',
      'pendiente',
    ])
  })

  it('en el primer estado no hay nada completado', () => {
    expect(pasosConEstado('PENDING').map((p) => p.estado)).toEqual([
      'actual',
      'pendiente',
      'pendiente',
      'pendiente',
      'pendiente',
    ])
  })

  it('en el último estado no queda nada pendiente', () => {
    expect(pasosConEstado('DELIVERED').map((p) => p.estado)).toEqual([
      'completado',
      'completado',
      'completado',
      'completado',
      'actual',
    ])
  })

  it('un pedido cancelado no marca ningún paso como recorrido', () => {
    expect(pasosConEstado('CANCELLED').every((p) => p.estado === 'pendiente')).toBe(true)
  })
})

describe('esperaConfirmacion', () => {
  it('solo espera mientras el pago no se ha confirmado', () => {
    expect(esperaConfirmacion('PENDING')).toBe(true)
    expect(esperaConfirmacion('PAID')).toBe(false)
    expect(esperaConfirmacion('CANCELLED')).toBe(false)
  })
})
