import { describe, expect, it, vi } from 'vitest'
import { estaConfigurado, irAMercadoPago } from './mercadopago.js'

const checkout = { configured: true, initPoint: 'https://mp.test/checkout/pref-1' }

describe('estaConfigurado', () => {
  it('acepta un checkout con credenciales y destino', () => {
    expect(estaConfigurado(checkout)).toBe(true)
  })

  it('rechaza el checkout que devuelve el backend sin credenciales', () => {
    expect(estaConfigurado({ configured: false, initPoint: '' })).toBe(false)
    expect(estaConfigurado({ configured: true, initPoint: '' })).toBe(false)
    expect(estaConfigurado(null)).toBe(false)
  })
})

describe('irAMercadoPago', () => {
  it('manda el navegador al init_point', () => {
    const ventana = { location: { assign: vi.fn() } }
    irAMercadoPago(checkout, ventana)
    expect(ventana.location.assign).toHaveBeenCalledWith('https://mp.test/checkout/pref-1')
  })

  it('no navega a ningún sitio si el pago no está configurado', () => {
    const ventana = { location: { assign: vi.fn() } }
    expect(() => irAMercadoPago({ configured: false, initPoint: '' }, ventana)).toThrow()
    expect(ventana.location.assign).not.toHaveBeenCalled()
  })
})
