import { CancelOrderUseCase } from '../../../src/modules/orders/application/orderQueries.usecase'
import {
  AddressSnapshot,
  CatalogCacheInvalidator,
  OrderRepository,
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
