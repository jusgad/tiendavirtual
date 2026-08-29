import {
  CancelOrderUseCase,
  TrackOrderUseCase,
} from '../../../src/modules/orders/application/orderQueries.usecase'
import {
  AddressSnapshot,
  CatalogCacheInvalidator,
  OrderRepository,
  OrderTrackingView,
  OrderView,
} from '../../../src/modules/orders/domain/ports'

const address: AddressSnapshot = {
  fullName: 'Ana Díaz',
  phone: '3105676187',
  line1: 'Calle 1 # 2-3',
  line2: null,
  city: 'Medellín',
  department: 'Antioquia',
  postalCode: null,
}

class FakeCatalogCache implements CatalogCacheInvalidator {
  invalidations = 0
  async invalidate() {
    this.invalidations += 1
  }
}

class FakeOrders implements OrderRepository {
  cancelled: string[] = []
  constructor(private order: OrderView | null) {}

  place(): Promise<never> {
    throw new Error('no usado')
  }
  listByUser(): Promise<never> {
    throw new Error('no usado')
  }
  async findByIdForUser(): Promise<OrderView | null> {
    return this.order
  }
  async cancel(id: string): Promise<OrderView> {
    this.cancelled.push(id)
    return { ...this.order!, status: 'CANCELLED' }
  }
  async findForTracking(): Promise<OrderTrackingView | null> {
    throw new Error('no usado')
  }
}

/** Repositorio que solo responde a la búsqueda de seguimiento. */
class FakeTrackingRepo implements OrderRepository {
  consultas: { orderNumber: string; email: string }[] = []
  constructor(private readonly resultado: OrderTrackingView | null) {}

  place(): Promise<never> {
    throw new Error('no usado')
  }
  listByUser(): Promise<never> {
    throw new Error('no usado')
  }
  findByIdForUser(): Promise<never> {
    throw new Error('no usado')
  }
  cancel(): Promise<never> {
    throw new Error('no usado')
  }
  async findForTracking(orderNumber: string, email: string): Promise<OrderTrackingView | null> {
    this.consultas.push({ orderNumber, email })
    return this.resultado
  }
}

const seguimiento: OrderTrackingView = {
  orderNumber: 'PA-2026-000001',
  status: 'SHIPPED',
  total: 58800,
  currency: 'COP',
  shipCity: 'Medellín',
  items: [{ productName: 'Estuche PomAss Día + Noche', quantity: 1, lineTotal: 79900 }],
  createdAt: new Date('2026-08-01T10:00:00Z'),
}

const order = (over: Partial<OrderView> & { status: OrderView['status'] }): OrderView => ({
  id: 'order-1',
  orderNumber: 'PA-2026-000001',
  subtotal: 45900,
  discountTotal: 0,
  shippingTotal: 12900,
  total: 58800,
  currency: 'COP',
  discreetPackaging: false,
  items: [],
  shipping: address,
  createdAt: new Date(),
  ...over,
})

describe('CancelOrderUseCase', () => {
  it('cancela un pedido PENDING e invalida el caché de catálogo (el stock se restauró)', async () => {
    const orders = new FakeOrders(order({ status: 'PENDING' }))
    const catalogCache = new FakeCatalogCache()
    const useCase = new CancelOrderUseCase(orders, catalogCache)

    const cancelled = await useCase.execute('user-1', 'order-1')

    expect(cancelled.status).toBe('CANCELLED')
    expect(orders.cancelled).toEqual(['order-1'])
    expect(catalogCache.invalidations).toBe(1)
  })

  it('cancela un pedido PAID', async () => {
    const orders = new FakeOrders(order({ status: 'PAID' }))
    const catalogCache = new FakeCatalogCache()
    const useCase = new CancelOrderUseCase(orders, catalogCache)

    await useCase.execute('user-1', 'order-1')

    expect(catalogCache.invalidations).toBe(1)
  })

  it('rechaza (404) si el pedido no existe y no invalida el caché', async () => {
    const orders = new FakeOrders(null)
    const catalogCache = new FakeCatalogCache()
    const useCase = new CancelOrderUseCase(orders, catalogCache)

    await expect(useCase.execute('user-1', 'inexistente')).rejects.toMatchObject({ statusCode: 404 })
    expect(catalogCache.invalidations).toBe(0)
  })

  it('rechaza (409) si el pedido ya no es cancelable y no invalida el caché', async () => {
    const orders = new FakeOrders(order({ status: 'SHIPPED' }))
    const catalogCache = new FakeCatalogCache()
    const useCase = new CancelOrderUseCase(orders, catalogCache)

    await expect(useCase.execute('user-1', 'order-1')).rejects.toMatchObject({ statusCode: 409 })
    expect(orders.cancelled).toEqual([])
    expect(catalogCache.invalidations).toBe(0)
  })
})

describe('TrackOrderUseCase', () => {
  it('devuelve el pedido cuando el número y el correo coinciden', async () => {
    const repo = new FakeTrackingRepo(seguimiento)
    const res = await new TrackOrderUseCase(repo).execute('PA-2026-000001', 'ana@correo.com')

    expect(res.orderNumber).toBe('PA-2026-000001')
    expect(res.status).toBe('SHIPPED')
  })

  it('normaliza el correo a minúsculas y recorta espacios', async () => {
    const repo = new FakeTrackingRepo(seguimiento)
    await new TrackOrderUseCase(repo).execute('  PA-2026-000001  ', '  Ana@Correo.COM ')

    expect(repo.consultas).toEqual([{ orderNumber: 'PA-2026-000001', email: 'ana@correo.com' }])
  })

  it('responde 404 (no 403) si el correo no coincide, para no confirmar que el pedido existe', async () => {
    const repo = new FakeTrackingRepo(null)
    await expect(
      new TrackOrderUseCase(repo).execute('PA-2026-000001', 'otro@correo.com'),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('da el mismo error si el pedido no existe', async () => {
    const repo = new FakeTrackingRepo(null)
    await expect(new TrackOrderUseCase(repo).execute('PA-INEXISTENTE', 'ana@correo.com')).rejects.toMatchObject({
      statusCode: 404,
      message: 'No encontramos un pedido con ese número y correo',
    })
  })

  it('no expone dirección completa, teléfono ni ids internos', async () => {
    const repo = new FakeTrackingRepo(seguimiento)
    const res = await new TrackOrderUseCase(repo).execute('PA-2026-000001', 'ana@correo.com')

    const campos = Object.keys(res)
    expect(campos).not.toContain('id')
    expect(campos).not.toContain('shipping')
    expect(campos).not.toContain('shipLine1')
    expect(campos).not.toContain('shipPhone')
    // Los ítems solo llevan nombre/cantidad/total, sin productId.
    expect(Object.keys(res.items[0])).toEqual(['productName', 'quantity', 'lineTotal'])
  })
})
