import { describe, expect, it } from 'vitest'
import { ESTADOS, etiquetaEstado, totalPaginas } from './ordersModel.js'

describe('etiquetaEstado', () => {
  it('traduce los estados del backend al español', () => {
    expect(etiquetaEstado('PENDING')).toBe('Pendiente')
    expect(etiquetaEstado('PAID')).toBe('Pagado')
    expect(etiquetaEstado('PREPARING')).toBe('En preparación')
    expect(etiquetaEstado('SHIPPED')).toBe('Enviado')
    expect(etiquetaEstado('DELIVERED')).toBe('Entregado')
    expect(etiquetaEstado('CANCELLED')).toBe('Cancelado')
  })

  it('devuelve el valor crudo si el estado es desconocido', () => {
    expect(etiquetaEstado('LO_QUE_SEA')).toBe('LO_QUE_SEA')
  })
})

describe('ESTADOS', () => {
  it('abre con la opción de no filtrar', () => {
    expect(ESTADOS[0]).toEqual({ value: '', label: 'Todos' })
  })

  it('cubre los seis estados del pedido', () => {
    expect(ESTADOS).toHaveLength(7)
  })
})

describe('totalPaginas', () => {
  it('redondea hacia arriba', () => {
    expect(totalPaginas(0, 20)).toBe(1)
    expect(totalPaginas(1, 20)).toBe(1)
    expect(totalPaginas(20, 20)).toBe(1)
    expect(totalPaginas(21, 20)).toBe(2)
    expect(totalPaginas(41, 20)).toBe(3)
  })
})
