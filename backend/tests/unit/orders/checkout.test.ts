import { SpyNotifier } from '../shared/notifierFakes'
import { CheckoutUseCase } from '../../../src/modules/orders/application/checkout.usecase'
import {
  AddressRepository,
  CartGateway,
  CartOwner,
  CatalogCacheInvalidator,
  CouponGateway,
  OrderProductGateway,
  OrderProductInfo,
  OrderRepository,
  PlaceOrderData,
} from '../../../src/modules/orders/domain/ports'
import { CouponData } from '../../../src/modules/orders/domain/pricing'
import { CouponType } from '../../../src/modules/orders/domain/couponType'

const asUser = (id: string): CartOwner => ({ type: 'user', id })
const asGuest = (id: string): CartOwner => ({ type: 'guest', id })

const config = { flatRate: 12900, freeThreshold: 150000 }

const address = {
  fullName: 'Ana Díaz',
  phone: '3105676187',
  line1: 'Calle 1 # 2-3',
  line2: null,
  city: 'Medellín',
  department: 'Antioquia',
  postalCode: null,
}

class FakeCart implements CartGateway {
  cleared: CartOwner[] = []
  /** Simula que Redis no responde al vaciar el carrito del invitado. */
  fallaAlLimpiar = false
  constructor(private items: { productId: string; quantity: number }[]) {}
  async getItems() {
    return this.items
  }
  async clear(owner: CartOwner) {
    if (this.fallaAlLimpiar) throw new Error('Redis no responde')
    this.cleared.push(owner)
  }
}
class FakeProducts implements OrderProductGateway {
  constructor(private products: OrderProductInfo[]) {}
  async findManyByIds(ids: string[]) {
    return this.products.filter((p) => ids.includes(p.id))
  }
}
class FakeCoupons implements CouponGateway {
  constructor(
    private coupon: CouponData | null,
    private uses = 0,
  ) {}
  async findByCode(code: string) {
    return this.coupon && this.coupon.code === code ? this.coupon : null
  }
  async countUserRedemptions() {
    return this.uses
  }
}
class FakeAddresses implements AddressRepository {
  async listByUser(): Promise<never[]> {
    return []
  }
  async findByIdForUser(): Promise<null> {
    return null
  }
  create(): Promise<never> {
    throw new Error('no usado')
  }
  update(): Promise<never> {
    throw new Error('no usado')
  }
  async delete(): Promise<void> {
    /* no usado */
  }
}
class CapturingOrders implements OrderRepository {
  captured?: PlaceOrderData
  /** Correo que devuelve `contactEmail`; `null` simula un pedido sin correo. */
  correo: string | null = 'clienta@ejemplo.co'
  async contactEmail() {
    return this.correo
  }
  async place(data: PlaceOrderData) {
    this.captured = data
    return {
      id: 'order-1',
      orderNumber: data.orderNumber,
      status: 'PENDING' as const,
      subtotal: data.subtotal,
      discountTotal: data.discountTotal,
      shippingTotal: data.shippingTotal,
      total: data.total,
      currency: 'COP',
      discreetPackaging: data.discreetPackaging,
      items: data.items,
      shipping: data.address,
      createdAt: new Date(),
    }
  }
  async listByUser() {
    return { items: [], total: 0, page: 1, pageSize: 10 }
  }
  async findByIdForUser(): Promise<null> {
    return null
  }
  cancel(): Promise<never> {
    throw new Error('no usado')
  }
  findForTracking(): Promise<never> {
    throw new Error('no usado')
  }
}
class FakeCatalogCache implements CatalogCacheInvalidator {
  invalidations = 0
  async invalidate() {
    this.invalidations += 1
  }
}

const product = (over: Partial<OrderProductInfo> & { id: string }): OrderProductInfo => ({
  name: 'Producto',
  price: 45900,
  stock: 10,
  isActive: true,
  ...over,
})

function makeUseCase(opts: {
  cart: { productId: string; quantity: number }[]
  products: OrderProductInfo[]
  coupon?: CouponData | null
  uses?: number
}) {
  const orders = new CapturingOrders()
  const cart = new FakeCart(opts.cart)
  const catalogCache = new FakeCatalogCache()
  const notifier = new SpyNotifier()
  const useCase = new CheckoutUseCase(
    cart,
    new FakeProducts(opts.products),
    new FakeCoupons(opts.coupon ?? null, opts.uses ?? 0),
    new FakeAddresses(),
    orders,
    config,
    catalogCache,
    notifier,
  )
  return { useCase, orders, cart, catalogCache, notifier }
}

describe('CheckoutUseCase', () => {
  it('crea un pedido con subtotal, envío y total correctos', async () => {
    const { useCase, orders, catalogCache } = makeUseCase({
      cart: [{ productId: 'p1', quantity: 2 }],
      products: [product({ id: 'p1', price: 45900, stock: 10 })],
    })

    const order = await useCase.execute(asUser('user-1'), { shippingAddress: address })

    expect(orders.captured!.subtotal).toBe(91800)
    expect(orders.captured!.shippingTotal).toBe(12900) // bajo el umbral
    expect(order.total).toBe(104700)
    expect(order.items).toHaveLength(1)
    // El stock cambió: se invalida el caché de catálogo tras confirmar el pedido.
    expect(catalogCache.invalidations).toBe(1)
  })

  it('aplica cupón porcentual y da envío gratis sobre el umbral', async () => {
    const coupon: CouponData = {
      id: 'c1',
      code: 'DESC10',
      type: CouponType.PERCENTAGE,
      value: 10,
      minPurchase: null,
      maxUses: null,
      usedCount: 0,
      perUserLimit: null,
      startsAt: null,
      endsAt: null,
      isActive: true,
    }
    const { useCase, orders } = makeUseCase({
      cart: [{ productId: 'p1', quantity: 2 }],
      products: [product({ id: 'p1', price: 100000, stock: 10 })],
      coupon,
    })

    const order = await useCase.execute(asUser('user-1'), { shippingAddress: address, couponCode: 'DESC10' })

    expect(orders.captured!.subtotal).toBe(200000)
    expect(orders.captured!.discountTotal).toBe(20000)
    expect(orders.captured!.shippingTotal).toBe(0) // net 180000 >= 150000
    expect(order.total).toBe(180000)
    expect(orders.captured!.coupon?.id).toBe('c1')
  })

  it('rechaza (400) si el carrito está vacío', async () => {
    const { useCase } = makeUseCase({ cart: [], products: [] })
    await expect(useCase.execute(asUser('user-1'), { shippingAddress: address })).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rechaza (409) si no hay stock suficiente', async () => {
    const { useCase, catalogCache } = makeUseCase({
      cart: [{ productId: 'p1', quantity: 5 }],
      products: [product({ id: 'p1', stock: 2 })],
    })
    await expect(useCase.execute(asUser('user-1'), { shippingAddress: address })).rejects.toMatchObject({
      statusCode: 409,
    })
    // No hubo cambio de stock (el pedido no se creó): no debe invalidarse el caché.
    expect(catalogCache.invalidations).toBe(0)
  })

  it('rechaza (400) un cupón inexistente', async () => {
    const { useCase } = makeUseCase({
      cart: [{ productId: 'p1', quantity: 1 }],
      products: [product({ id: 'p1' })],
      coupon: null,
    })
    await expect(
      useCase.execute(asUser('user-1'), { shippingAddress: address, couponCode: 'NOEXISTE' }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rechaza (400) si no se indica dirección', async () => {
    const { useCase } = makeUseCase({
      cart: [{ productId: 'p1', quantity: 1 }],
      products: [product({ id: 'p1' })],
    })
    await expect(useCase.execute(asUser('user-1'), {})).rejects.toMatchObject({ statusCode: 400 })
  })

  describe('checkout de invitado', () => {
    it('crea el pedido sin userId y limpia el carrito de invitado tras crearlo', async () => {
      const { useCase, orders, cart } = makeUseCase({
        cart: [{ productId: 'p1', quantity: 1 }],
        products: [product({ id: 'p1', price: 45900, stock: 10 })],
      })

      const owner = asGuest('guest-1')
      const order = await useCase.execute(owner, {
        shippingAddress: address,
        guestEmail: 'ana@correo.com',
      })

      expect(orders.captured!.userId).toBeNull()
      expect(orders.captured!.guestEmail).toBe('ana@correo.com')
      expect(order.items).toHaveLength(1)
      expect(cart.cleared).toEqual([owner])
    })

    it('si falla vaciar el carrito, el pedido YA creado no se pierde', async () => {
      // El carrito de invitado vive en Redis, fuera de la transacción del
      // pedido. Si Redis cae justo después de crearlo, devolver un error haría
      // creer al cliente que la compra falló —y volvería a comprar— cuando en
      // realidad ya se le descontó el inventario.
      const { useCase, cart, orders } = makeUseCase({
        cart: [{ productId: 'p1', quantity: 1 }],
        products: [product({ id: 'p1' })],
      })
      cart.fallaAlLimpiar = true
      const owner: CartOwner = { type: 'guest', id: 'invitado-1' }

      const order = await useCase.execute(owner, {
        shippingAddress: address,
        guestEmail: 'ana@correo.com',
      })

      expect(order.items).toHaveLength(1)
      expect(orders.captured).not.toBeNull()
    })

    it('rechaza (400) si el invitado no indica correo de contacto', async () => {
      const { useCase } = makeUseCase({
        cart: [{ productId: 'p1', quantity: 1 }],
        products: [product({ id: 'p1' })],
      })
      await expect(
        useCase.execute(asGuest('guest-1'), { shippingAddress: address }),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('rechaza (400) si el invitado intenta usar una dirección guardada (addressId)', async () => {
      const { useCase } = makeUseCase({
        cart: [{ productId: 'p1', quantity: 1 }],
        products: [product({ id: 'p1' })],
      })
      await expect(
        useCase.execute(asGuest('guest-1'), {
          addressId: 'addr-1',
          guestEmail: 'ana@correo.com',
        }),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('no consulta canjes por usuario para invitados (el cupón solo respeta el límite global)', async () => {
      const coupon: CouponData = {
        id: 'c1',
        code: 'DESC10',
        type: CouponType.PERCENTAGE,
        value: 10,
        minPurchase: null,
        maxUses: null,
        usedCount: 0,
        perUserLimit: 1,
        startsAt: null,
        endsAt: null,
        isActive: true,
      }
      const { useCase, orders } = makeUseCase({
        cart: [{ productId: 'p1', quantity: 1 }],
        products: [product({ id: 'p1', price: 100000, stock: 10 })],
        coupon,
        uses: 5, // si se consultara por "usuario", esto rechazaría el cupón
      })

      const order = await useCase.execute(asGuest('guest-1'), {
        shippingAddress: address,
        guestEmail: 'ana@correo.com',
        couponCode: 'DESC10',
      })

      expect(orders.captured!.discountTotal).toBe(10000)
      expect(order.discountTotal).toBe(10000)
    })
  })
})

describe('CheckoutUseCase · aviso por correo', () => {
  it('avisa a la clienta con el número de pedido y los artículos', async () => {
    const { useCase, notifier } = makeUseCase({
      cart: [{ productId: 'p1', quantity: 2 }],
      products: [{ id: 'p1', name: 'Crema', price: 50000, stock: 10, isActive: true }],
    })

    const pedido = await useCase.execute(asUser('user-1'), { shippingAddress: address })

    const [aviso] = notifier.de('orderPlaced')
    expect(aviso).toMatchObject({
      to: 'clienta@ejemplo.co',
      orderNumber: pedido.orderNumber,
      total: pedido.total,
    })
    expect(aviso.items).toEqual([
      expect.objectContaining({ productName: 'Crema', quantity: 2 }),
    ])
  })

  it('no avisa si el pedido no tiene correo de contacto', async () => {
    const { useCase, orders, notifier } = makeUseCase({
      cart: [{ productId: 'p1', quantity: 1 }],
      products: [{ id: 'p1', name: 'Crema', price: 50000, stock: 10, isActive: true }],
    })
    orders.correo = null

    await useCase.execute(asUser('user-1'), { shippingAddress: address })

    expect(notifier.de('orderPlaced')).toHaveLength(0)
  })

  /**
   * La propiedad importante: a estas alturas el pedido YA existe y el stock YA
   * se descontó. Si el correo hiciera fallar el checkout, la clienta vería un
   * error por una compra que sí ocurrió y compraría otra vez.
   */
  it('completa la compra aunque el correo falle', async () => {
    const { useCase, orders, notifier } = makeUseCase({
      cart: [{ productId: 'p1', quantity: 1 }],
      products: [{ id: 'p1', name: 'Crema', price: 50000, stock: 10, isActive: true }],
    })
    notifier.falla = true

    const pedido = await useCase.execute(asUser('user-1'), { shippingAddress: address })

    expect(pedido.orderNumber).toBeTruthy()
    expect(orders.captured).toBeDefined()
  })
})
