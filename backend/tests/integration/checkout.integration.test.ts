import request from 'supertest'
import { createApp } from '../../src/app'
import { prisma } from '../../src/shared/database/prisma'
import { redis } from '../../src/shared/cache/redis'
import { env } from '../../src/shared/config/env'

// Flujo end-to-end: requiere Postgres migrado y con seed (productos).
const app = createApp(prisma)

const user = {
  email: `checkout-${Date.now()}@test.com`,
  password: 'Password1',
  firstName: 'Check',
  lastName: 'Out',
  ageConfirmed: true,
}

let token = ''

/**
 * Cierre ÚNICO del fichero, fuera de los describes.
 *
 * `prisma` y `redis` son singletons compartidos por los dos bloques de abajo.
 * Cuando cada describe cerraba el suyo, el primero en terminar dejaba a Redis
 * desconectado y el carrito de invitado del segundo respondía 503 — un fallo
 * que parecía del código y era del montaje de la prueba. Jest ejecuta este
 * `afterAll` cuando han terminado todos los describes del fichero.
 */
afterAll(async () => {
  await prisma.$disconnect()
  redis.disconnect()
})

describe('Checkout end-to-end (integración)', () => {
  afterAll(async () => {
    const u = await prisma.user.findUnique({ where: { email: user.email } })
    if (u) {
      await prisma.couponRedemption.deleteMany({ where: { userId: u.id } })
      await prisma.order.deleteMany({ where: { userId: u.id } })
      await prisma.user.delete({ where: { id: u.id } })
    }
  })

  it('registra, agrega al carrito, hace checkout y cancela el pedido', async () => {
    // 1) Registro
    const reg = await request(app).post('/api/auth/register').send(user)
    expect(reg.status).toBe(201)
    token = reg.body.tokens.accessToken

    // 2) Toma un producto del catálogo (viene del seed)
    const list = await request(app).get('/api/products?pageSize=1')
    expect(list.status).toBe(200)
    expect(list.body.items.length).toBeGreaterThan(0)
    const product = list.body.items[0]

    // 3) Agrega al carrito (usuario autenticado -> carrito en DB)
    const add = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: product.id, quantity: 1 })
    expect(add.status).toBe(201)
    expect(add.body.cart.itemCount).toBe(1)

    // 4) Crea una dirección
    const addr = await request(app)
      .post('/api/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Check Out',
        phone: '3105676187',
        line1: 'Calle 1 # 2-3',
        city: 'Medellín',
        department: 'Antioquia',
      })
    expect(addr.status).toBe(201)

    // 5) Checkout con empaque discreto
    const checkout = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: addr.body.address.id, discreetPackaging: true })
    expect(checkout.status).toBe(201)
    const order = checkout.body.order
    expect(order.status).toBe('PENDING')
    expect(order.items).toHaveLength(1)
    expect(order.discreetPackaging).toBe(true)
    expect(order.total).toBe(order.subtotal - order.discountTotal + order.shippingTotal)

    // 6) Aparece en mis pedidos
    const myOrders = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`)
    expect(myOrders.status).toBe(200)
    expect(myOrders.body.total).toBeGreaterThanOrEqual(1)

    // 7) Cancela (restaura stock)
    const cancel = await request(app)
      .post(`/api/orders/${order.id}/cancel`)
      .set('Authorization', `Bearer ${token}`)
    expect(cancel.status).toBe(200)
    expect(cancel.body.order.status).toBe('CANCELLED')
  })

  it('rechaza checkout con carrito vacío (400)', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ shippingAddress: { fullName: 'X', phone: '3000000000', line1: 'Y', city: 'Z', department: 'W' } })
    expect(res.status).toBe(400)
  })
})

describe('Checkout de invitado (sin usuario ni contraseña)', () => {
  const guestId = `guest-${Date.now()}`

  it('agrega al carrito, hace checkout y paga sin sesión', async () => {
    // 1) Toma un producto del catálogo (viene del seed)
    const list = await request(app).get('/api/products?pageSize=1')
    expect(list.status).toBe(200)
    const product = list.body.items[0]

    // 2) Agrega al carrito de invitado (sin Authorization, con x-guest-id -> Redis)
    const add = await request(app)
      .post('/api/cart/items')
      .set('x-guest-id', guestId)
      .send({ productId: product.id, quantity: 1 })
    expect(add.status).toBe(201)
    expect(add.body.cart.itemCount).toBe(1)

    // 3) Checkout sin sesión: requiere correo de contacto y dirección inline
    const checkout = await request(app)
      .post('/api/orders')
      .set('x-guest-id', guestId)
      .send({
        shippingAddress: {
          fullName: 'Invitada Demo',
          phone: '3105676187',
          line1: 'Calle 1 # 2-3',
          city: 'Medellín',
          department: 'Antioquia',
        },
        guestEmail: 'invitada@correo.com',
      })
    expect(checkout.status).toBe(201)
    const order = checkout.body.order
    expect(order.status).toBe('PENDING')

    // 4) El carrito de invitado quedó vacío tras el checkout
    const cart = await request(app).get('/api/cart').set('x-guest-id', guestId)
    expect(cart.body.cart.itemCount).toBe(0)

    // 5) Prepara el pago sin sesión (el pedido no tiene dueño -> se permite).
    // Solo se envía el pedido: los datos de tarjeta los captura Mercado Pago
    // en su propio sitio, este backend no los recibe.
    const pay = await request(app).post('/api/payments').send({ orderId: order.id })
    expect(pay.status).toBe(201)
    expect(pay.body.payment.status).toBe('PENDING')
    expect(pay.body.payment.method).toBe('MERCADO_PAGO')
    expect(pay.body.checkout.reference).toBe(order.orderNumber)
    expect(pay.body.checkout.amount).toBe(order.total)

    // En CI no hay credenciales de Mercado Pago, así que el adaptador no llama
    // a su API y devuelve el checkout marcado como «sin configurar». Que este
    // test no dependa de la red es justamente lo que se comprueba aquí.
    expect(pay.body.checkout.configured).toBe(false)

    // Y, pase lo que pase, por aquí no sale ninguna credencial privada.
    const serializado = JSON.stringify(pay.body)
    expect(serializado).not.toContain(env.MERCADO_PAGO_ACCESS_TOKEN)
    expect(serializado).not.toContain(env.MERCADO_PAGO_WEBHOOK_SECRET)

    // 6) Seguimiento público: con nº de pedido + correo, sin sesión
    const track = await request(app)
      .get('/api/orders/track')
      .query({ orderNumber: order.orderNumber, email: 'invitada@correo.com' })
    expect(track.status).toBe(200)
    expect(track.body.order.status).toBe('PENDING')
    expect(track.body.order.shipCity).toBe('Medellín')
    // No expone dirección completa ni ids internos
    expect(track.body.order.id).toBeUndefined()
    expect(track.body.order.shipLine1).toBeUndefined()

    // 7) Con un correo que no corresponde, responde 404 (no confirma que exista)
    const ajeno = await request(app)
      .get('/api/orders/track')
      .query({ orderNumber: order.orderNumber, email: 'otra@correo.com' })
    expect(ajeno.status).toBe(404)
  })

  it('rechaza (400) el checkout de invitado sin correo de contacto', async () => {
    const otherGuestId = `${guestId}-sin-correo`
    const list = await request(app).get('/api/products?pageSize=1')
    const product = list.body.items[0]
    await request(app)
      .post('/api/cart/items')
      .set('x-guest-id', otherGuestId)
      .send({ productId: product.id, quantity: 1 })

    const res = await request(app)
      .post('/api/orders')
      .set('x-guest-id', otherGuestId)
      .send({
        shippingAddress: {
          fullName: 'X',
          phone: '3000000000',
          line1: 'Y',
          city: 'Z',
          department: 'W',
        },
      })
    expect(res.status).toBe(400)
  })
})
