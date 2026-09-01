import { NotFoundError } from '../../../shared/errors/AppError'
import {
  AdminOrderDetail,
  AdminOrderRepository,
  AdminOrderSummary,
  CatalogCacheInvalidator,
  Paginated,
  ShipmentNotifier,
} from '../domain/ports'
import { OrderStatus } from '../domain/orderStatus'
import {
  assertShipmentDataFor,
  assertTransitionAllowed,
  cancellationRestoresStock,
  ShipmentData,
} from '../domain/orderTransitions'

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
    private readonly notifier: ShipmentNotifier,
  ) {}

  async execute(id: string, to: OrderStatus, shipment?: ShipmentData): Promise<AdminOrderDetail> {
    const order = await this.orders.findById(id)
    if (!order) throw new NotFoundError('Pedido no encontrado')

    // El orden importa: primero si la transición cabe, después si los datos que
    // la acompañan son los correctos. Al revés, un salto de estado se reportaría
    // como "falta la guía", que despista a quien opera.
    assertTransitionAllowed(order.status, to)
    assertShipmentDataFor(to, shipment)

    const restoreStock = to === OrderStatus.CANCELLED && cancellationRestoresStock(order.status)
    const updated = await this.orders.updateStatus(id, to, restoreStock, shipment)

    // Solo si volvieron unidades al inventario cambia lo que el catálogo
    // muestra; invalidar siempre sería tirar el caché sin motivo.
    if (restoreStock) await this.catalogCache.invalidate()

    // El único cambio de estado que le interesa a la clienta por correo es el
    // despacho: ahí tiene guía que rastrear. Los demás los ve en seguimiento.
    if (to === OrderStatus.SHIPPED && updated.contactEmail && updated.carrier && updated.trackingNumber) {
      // Igual que en el checkout: el despacho ya quedó registrado. Un error de
      // correo aquí haría creer a quien opera que el despacho no se guardó, y
      // lo repetiría.
      try {
        await this.notifier.orderShipped({
          to: updated.contactEmail,
          orderNumber: updated.orderNumber,
          carrier: updated.carrier,
          trackingNumber: updated.trackingNumber,
        })
      } catch {
        // Ignorado a propósito: el adaptador ya deja el fallo en el log.
      }
    }

    return updated
  }
}
