import { NotFoundError } from '../../../shared/errors/AppError'
import {
  AdminOrderDetail,
  AdminOrderRepository,
  AdminOrderSummary,
  CatalogCacheInvalidator,
  Paginated,
} from '../domain/ports'
import { OrderStatus } from '../domain/orderStatus'
import { assertTransitionAllowed, cancellationRestoresStock } from '../domain/orderTransitions'

export class ListOrdersUseCase {
  constructor(private readonly orders: AdminOrderRepository) {}

  execute(status: OrderStatus | undefined, page: number, pageSize: number): Promise<Paginated<AdminOrderSummary>> {
    return this.orders.list({ status, page, pageSize })
  }
}

export class GetOrderUseCase {
  constructor(private readonly orders: AdminOrderRepository) {}

  async execute(id: string): Promise<AdminOrderDetail> {
    const order = await this.orders.findById(id)
    if (!order) throw new NotFoundError('Pedido no encontrado')
    return order
  }
}

/**
 * Avanza (o cancela) un pedido. Es lo que mueve la línea de tiempo que ve el
 * cliente en el seguimiento, y lo que finalmente habilita las reseñas: solo se
 * puede reseñar un producto de un pedido en estado DELIVERED.
 */
export class UpdateOrderStatusUseCase {
  constructor(
    private readonly orders: AdminOrderRepository,
    private readonly catalogCache: CatalogCacheInvalidator,
  ) {}

  async execute(id: string, to: OrderStatus): Promise<AdminOrderDetail> {
    const order = await this.orders.findById(id)
    if (!order) throw new NotFoundError('Pedido no encontrado')

    assertTransitionAllowed(order.status, to)

    const restoreStock = to === OrderStatus.CANCELLED && cancellationRestoresStock(order.status)
    const updated = await this.orders.updateStatus(id, to, restoreStock)

    // Solo si volvieron unidades al inventario cambia lo que el catálogo
    // muestra; invalidar siempre sería tirar el caché sin motivo.
    if (restoreStock) await this.catalogCache.invalidate()

    return updated
  }
}
