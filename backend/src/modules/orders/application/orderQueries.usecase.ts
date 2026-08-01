import { ConflictError, NotFoundError } from '../../../shared/errors/AppError'
import { CatalogCacheInvalidator, OrderRepository, OrderView, Paginated, OrderSummary } from '../domain/ports'

export class ListMyOrdersUseCase {
  constructor(private readonly orders: OrderRepository) {}
  execute(userId: string, page: number, pageSize: number): Promise<Paginated<OrderSummary>> {
    return this.orders.listByUser(userId, page, pageSize)
  }
}

export class GetMyOrderUseCase {
  constructor(private readonly orders: OrderRepository) {}
  async execute(userId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findByIdForUser(id, userId)
    if (!order) throw new NotFoundError('Pedido no encontrado')
    return order
  }
}

const CANCELLABLE = ['PENDING', 'PAID']

export class CancelOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly catalogCache: CatalogCacheInvalidator,
  ) {}
  async execute(userId: string, id: string): Promise<OrderView> {
    const order = await this.orders.findByIdForUser(id, userId)
    if (!order) throw new NotFoundError('Pedido no encontrado')
    if (!CANCELLABLE.includes(order.status)) {
      throw new ConflictError(`No se puede cancelar un pedido en estado ${order.status}`)
    }
    const cancelled = await this.orders.cancel(id, userId)

    // La cancelación restaura stock: el caché de catálogo queda desactualizado.
    await this.catalogCache.invalidate()

    return cancelled
  }
}
