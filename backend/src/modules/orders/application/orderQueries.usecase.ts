import { ConflictError, NotFoundError } from '../../../shared/errors/AppError'
import {
  CatalogCacheInvalidator,
  OrderRepository,
  OrderSummary,
  OrderTrackingView,
  OrderView,
  Paginated,
} from '../domain/ports'

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

/**
 * Seguimiento de pedido sin cuenta. Pide nº de pedido Y correo: exigir ambos
 * evita que alguien recorra números de pedido ajenos.
 *
 * Si el correo no coincide se responde igual que si el pedido no existiera —
 * un 403 confirmaría que ese número sí existe.
 */
export class TrackOrderUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(orderNumber: string, email: string): Promise<OrderTrackingView> {
    const order = await this.orders.findForTracking(orderNumber.trim(), email.trim().toLowerCase())
    if (!order) {
      throw new NotFoundError('No encontramos un pedido con ese número y correo')
    }
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
