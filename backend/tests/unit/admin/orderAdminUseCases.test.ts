import {
  GetOrderUseCase,
  ListOrdersUseCase,
  UpdateOrderStatusUseCase,
} from '../../../src/modules/admin/application/orderAdminUseCases'
import { OrderStatus } from '../../../src/modules/admin/domain/orderStatus'
import { InMemoryAdminOrderRepository, SpyCatalogCache } from './fakes'

function repoConPedido(status: OrderStatus = OrderStatus.PAID) {
  const repo = new InMemoryAdminOrderRepository()
  repo.add({ id: 'order-1', orderNumber: 'PA-2026-ABC', status })
  return repo
}

describe('UpdateOrderStatusUseCase', () => {
  it('avanza el pedido y devuelve el detalle actualizado', async () => {
    const repo = repoConPedido(OrderStatus.PAID)
    const cache = new SpyCatalogCache()

    const res = await new UpdateOrderStatusUseCase(repo, cache).execute('order-1', OrderStatus.PREPARING)

    expect(res.status).toBe(OrderStatus.PREPARING)
  })

  it('rechaza (404) un pedido inexistente', async () => {
    const useCase = new UpdateOrderStatusUseCase(new InMemoryAdminOrderRepository(), new SpyCatalogCache())
    await expect(useCase.execute('no-existe', OrderStatus.PREPARING)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rechaza (409) una transición no permitida', async () => {
    const useCase = new UpdateOrderStatusUseCase(repoConPedido(OrderStatus.PAID), new SpyCatalogCache())
    await expect(useCase.execute('order-1', OrderStatus.DELIVERED)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('rechaza (400) marcar PAID a mano', async () => {
    const useCase = new UpdateOrderStatusUseCase(repoConPedido(OrderStatus.PENDING), new SpyCatalogCache())
    await expect(useCase.execute('order-1', OrderStatus.PAID)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('al cancelar antes del despacho devuelve stock e invalida el caché', async () => {
    const repo = repoConPedido(OrderStatus.PAID)
    const cache = new SpyCatalogCache()

    await new UpdateOrderStatusUseCase(repo, cache).execute('order-1', OrderStatus.CANCELLED)

    expect(repo.lastRestoreStock).toBe(true)
    expect(cache.invalidations).toBe(1)
  })

  it('avanzar un pedido NO toca el caché de catálogo (el stock no cambia)', async () => {
    const repo = repoConPedido(OrderStatus.PREPARING)
    const cache = new SpyCatalogCache()

    await new UpdateOrderStatusUseCase(repo, cache).execute('order-1', OrderStatus.SHIPPED)

    expect(repo.lastRestoreStock).toBe(false)
    expect(cache.invalidations).toBe(0)
  })

  it('habilita las reseñas: SHIPPED -> DELIVERED es alcanzable', async () => {
    const repo = repoConPedido(OrderStatus.SHIPPED)
    const res = await new UpdateOrderStatusUseCase(repo, new SpyCatalogCache()).execute(
      'order-1',
      OrderStatus.DELIVERED,
    )
    expect(res.status).toBe(OrderStatus.DELIVERED)
  })
})

describe('ListOrdersUseCase', () => {
  it('pagina y filtra por estado', async () => {
    const repo = new InMemoryAdminOrderRepository()
    repo.add({ id: 'o1', orderNumber: 'PA-1', status: OrderStatus.PAID })
    repo.add({ id: 'o2', orderNumber: 'PA-2', status: OrderStatus.SHIPPED })
    repo.add({ id: 'o3', orderNumber: 'PA-3', status: OrderStatus.PAID })

    const todos = await new ListOrdersUseCase(repo).execute(undefined, 1, 10)
    expect(todos.total).toBe(3)

    const soloPagados = await new ListOrdersUseCase(repo).execute(OrderStatus.PAID, 1, 10)
    expect(soloPagados.total).toBe(2)
    expect(soloPagados.items.map((o) => o.orderNumber)).toEqual(['PA-1', 'PA-3'])
  })
})

describe('GetOrderUseCase', () => {
  it('rechaza (404) un pedido inexistente', async () => {
    await expect(
      new GetOrderUseCase(new InMemoryAdminOrderRepository()).execute('no-existe'),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
