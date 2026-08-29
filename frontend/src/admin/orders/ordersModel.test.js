import { describe, expect, it } from 'vitest'
import { ESTADOS, accionesPara, envioCompleto, etiquetaEstado, totalPaginas } from './ordersModel.js'

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

describe('accionesPara', () => {
  it('traduce las transiciones que autoriza el backend', () => {
    expect(accionesPara(['PREPARING', 'CANCELLED'])).toEqual([
      { status: 'PREPARING', label: 'Marcar en preparación', esEnvio: false, esCancelacion: false },
      { status: 'CANCELLED', label: 'Cancelar pedido', esEnvio: false, esCancelacion: true },
    ])
  })

  it('marca el envío, que exige transportadora y guía', () => {
    expect(accionesPara(['SHIPPED'])).toEqual([
      { status: 'SHIPPED', label: 'Marcar enviado', esEnvio: true, esCancelacion: false },
    ])
  })

  it('un estado final no ofrece ninguna acción', () => {
    expect(accionesPara([])).toEqual([])
  })
})

describe('envioCompleto', () => {
  it('exige transportadora y guía, ambas con contenido', () => {
    expect(envioCompleto({ carrier: 'Servientrega', trackingNumber: 'ABC123' })).toBe(true)
  })

  it('rechaza los datos incompletos', () => {
    expect(envioCompleto({ carrier: 'Servientrega', trackingNumber: '' })).toBe(false)
    expect(envioCompleto({ carrier: '', trackingNumber: 'ABC123' })).toBe(false)
    expect(envioCompleto({})).toBe(false)
  })

  it('no acepta espacios en blanco como valor', () => {
    expect(envioCompleto({ carrier: '   ', trackingNumber: 'ABC123' })).toBe(false)
  })
})
