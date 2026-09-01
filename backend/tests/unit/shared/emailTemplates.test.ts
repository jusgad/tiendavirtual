import {
  pagoConfirmado,
  pedidoEnviado,
  pedidoRecibido,
  recuperarContrasena,
} from '../../../src/shared/email/templates'

const articulos = [
  { productName: 'Estuche Día + Noche', quantity: 2, lineTotal: 159800 },
  { productName: 'Crema Noche', quantity: 1, lineTotal: 49900 },
]

describe('plantillas de correo', () => {
  describe('pedidoRecibido', () => {
    const msg = pedidoRecibido('clienta@ejemplo.co', {
      orderNumber: 'PA-2026-ABC123',
      total: 209700,
      items: articulos,
      trackingUrl: 'https://pomass.co/track.html?pedido=PA-2026-ABC123',
    })

    it('lleva el número de pedido en el asunto: es lo que se busca en la bandeja', () => {
      expect(msg.subject).toContain('PA-2026-ABC123')
    })

    it('nombra cada artículo y el total en las dos versiones', () => {
      for (const cuerpo of [msg.html, msg.text]) {
        expect(cuerpo).toContain('Estuche Día + Noche')
        expect(cuerpo).toContain('Crema Noche')
        expect(cuerpo).toContain('209.700')
      }
    })

    it('incluye el enlace de seguimiento en el HTML y en el texto plano', () => {
      expect(msg.html).toContain('https://pomass.co/track.html?pedido=PA-2026-ABC123')
      expect(msg.text).toContain('https://pomass.co/track.html?pedido=PA-2026-ABC123')
    })

    it('nunca va vacío el texto plano: hay clientes de correo que no pintan HTML', () => {
      expect(msg.text.trim().length).toBeGreaterThan(40)
    })
  })

  describe('pedidoEnviado', () => {
    const msg = pedidoEnviado('clienta@ejemplo.co', {
      orderNumber: 'PA-2026-ABC123',
      carrier: 'Servientrega',
      trackingNumber: 'SE-99887766',
      trackingUrl: 'https://pomass.co/track.html?pedido=PA-2026-ABC123',
    })

    it('dice la transportadora y la guía, que es a lo que se entra al correo', () => {
      for (const cuerpo of [msg.html, msg.text]) {
        expect(cuerpo).toContain('Servientrega')
        expect(cuerpo).toContain('SE-99887766')
      }
    })
  })

  describe('pagoConfirmado', () => {
    it('dice el monto cobrado y el pedido', () => {
      const msg = pagoConfirmado('clienta@ejemplo.co', {
        orderNumber: 'PA-2026-XYZ',
        total: 79900,
        trackingUrl: 'https://pomass.co/track.html',
      })
      expect(msg.text).toContain('79.900')
      expect(msg.text).toContain('PA-2026-XYZ')
    })
  })

  describe('recuperarContrasena', () => {
    const msg = recuperarContrasena('admin@pomass.co', {
      resetUrl: 'https://pomass.co/admin.html#/nueva-contrasena/abc123',
      minutosDeVigencia: 30,
    })

    it('lleva el enlace y cuánto dura', () => {
      expect(msg.text).toContain('https://pomass.co/admin.html#/nueva-contrasena/abc123')
      expect(msg.text).toContain('30')
    })

    it('tranquiliza a quien no lo pidió, en vez de alarmarlo', () => {
      expect(msg.text).toContain('no lo pediste')
    })
  })

  describe('escapado', () => {
    it('no deja que el nombre de un producto inyecte HTML en el correo', () => {
      const msg = pedidoRecibido('a@b.co', {
        orderNumber: 'PA-1',
        total: 100,
        items: [{ productName: '<script>alert(1)</script>', quantity: 1, lineTotal: 100 }],
        trackingUrl: 'https://pomass.co/track.html',
      })
      expect(msg.html).not.toContain('<script>')
      expect(msg.html).toContain('&lt;script&gt;')
    })

    it('escapa también las comillas del número de pedido en el asunto del enlace', () => {
      const msg = pedidoEnviado('a@b.co', {
        orderNumber: 'PA-1',
        carrier: 'Envía "Express"',
        trackingNumber: 'X-1',
        trackingUrl: 'https://pomass.co/track.html',
      })
      expect(msg.html).toContain('&quot;Express&quot;')
    })
  })
})
