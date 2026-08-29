import { describe, expect, it } from 'vitest'
import { parseHash } from './router.js'

describe('parseHash', () => {
  it('reconoce las secciones simples', () => {
    expect(parseHash('#/pedidos')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#/productos')).toEqual({ name: 'productos', params: {} })
    expect(parseHash('#/taxonomia')).toEqual({ name: 'taxonomia', params: {} })
    expect(parseHash('#/cupones')).toEqual({ name: 'cupones', params: {} })
    expect(parseHash('#/reportes')).toEqual({ name: 'reportes', params: {} })
  })

  it('extrae el id del detalle de pedido', () => {
    expect(parseHash('#/pedidos/abc-123')).toEqual({ name: 'pedido', params: { id: 'abc-123' } })
  })

  it('cae en pedidos cuando el hash está vacío o no se reconoce', () => {
    expect(parseHash('')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#/')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#/inventado')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#/pedidos/abc/de-mas')).toEqual({ name: 'pedidos', params: {} })
  })

  it('tolera la barra final y el hash sin barra inicial', () => {
    expect(parseHash('#/pedidos/')).toEqual({ name: 'pedidos', params: {} })
    expect(parseHash('#pedidos')).toEqual({ name: 'pedidos', params: {} })
  })
})
