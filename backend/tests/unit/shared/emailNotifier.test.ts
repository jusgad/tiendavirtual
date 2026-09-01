import { EmailNotifier } from '../../../src/shared/email/emailNotifier'
import { EmailMessage, EmailSender } from '../../../src/shared/email/types'

class SenderQueGuarda implements EmailSender {
  enviados: EmailMessage[] = []
  async send(m: EmailMessage) {
    this.enviados.push(m)
  }
}

class SenderQueFalla implements EmailSender {
  async send(): Promise<void> {
    throw new Error('Resend respondió 500')
  }
}

const notificador = (sender: EmailSender) => new EmailNotifier(sender, 'https://pomass.co')

describe('EmailNotifier', () => {
  describe('tolerancia a fallos', () => {
    /**
     * Es la propiedad que justifica toda la clase. Estos avisos salen DESPUÉS
     * de que el pedido se creó, el stock se descontó y el cobro se registró:
     * si una excepción subiera, la clienta vería un error por una compra que
     * sí ocurrió y volvería a comprar.
     */
    const roto = notificador(new SenderQueFalla())

    it('no lanza si el proveedor falla al avisar de un pedido nuevo', async () => {
      await expect(
        roto.orderPlaced({ to: 'a@b.co', orderNumber: 'PA-1', total: 100, items: [] }),
      ).resolves.toBeUndefined()
    })

    it('no lanza si el proveedor falla al confirmar el pago', async () => {
      await expect(
        roto.orderPaid({ to: 'a@b.co', orderNumber: 'PA-1', total: 100 }),
      ).resolves.toBeUndefined()
    })

    it('no lanza si el proveedor falla al avisar del envío', async () => {
      await expect(
        roto.orderShipped({ to: 'a@b.co', orderNumber: 'PA-1', carrier: 'X', trackingNumber: 'Y' }),
      ).resolves.toBeUndefined()
    })

    it('no lanza si el proveedor falla al mandar el enlace de contraseña', async () => {
      await expect(
        roto.passwordReset({ to: 'a@b.co', rawToken: 'tok', minutosDeVigencia: 30 }),
      ).resolves.toBeUndefined()
    })
  })

  describe('enlaces', () => {
    it('el de seguimiento lleva el pedido pero NO el correo', async () => {
      const sender = new SenderQueGuarda()
      await notificador(sender).orderPlaced({
        to: 'clienta@ejemplo.co',
        orderNumber: 'PA-2026-ABC',
        total: 100,
        items: [],
      })
      const url = sender.enviados[0].text.match(/https:\/\/\S+/)![0]
      expect(url).toContain('pedido=PA-2026-ABC')
      // Un enlace acaba en historiales y capturas: que por sí solo no abra
      // el pedido de nadie es justo lo que lo hace seguro de compartir.
      expect(url).not.toContain('clienta@ejemplo.co')
    })

    it('escapa el número de pedido en la dirección', async () => {
      const sender = new SenderQueGuarda()
      await notificador(sender).orderPaid({ to: 'a@b.co', orderNumber: 'PA/2026 #1', total: 100 })
      expect(sender.enviados[0].text).toContain('pedido=PA%2F2026%20%231')
    })

    it('el de contraseña apunta a la pantalla del panel con el token en la ruta', async () => {
      const sender = new SenderQueGuarda()
      await notificador(sender).passwordReset({
        to: 'admin@pomass.co',
        rawToken: 'deadbeef',
        minutosDeVigencia: 30,
      })
      expect(sender.enviados[0].text).toContain(
        'https://pomass.co/admin.html#/nueva-contrasena/deadbeef',
      )
    })
  })

  it('manda el correo al destinatario que se le pasa', async () => {
    const sender = new SenderQueGuarda()
    await notificador(sender).orderShipped({
      to: 'clienta@ejemplo.co',
      orderNumber: 'PA-1',
      carrier: 'Servientrega',
      trackingNumber: 'SE-1',
    })
    expect(sender.enviados[0].to).toBe('clienta@ejemplo.co')
  })
})
