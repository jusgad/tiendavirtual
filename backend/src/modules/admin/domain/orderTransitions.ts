import { BadRequestError, ConflictError } from '../../../shared/errors/AppError'
import { OrderStatus } from './orderStatus'

/**
 * Transiciones de estado que un administrador puede aplicar a un pedido.
 *
 * El avance operativo (preparar → enviar → entregar) vive aquí porque no lo
 * dispara el cliente ni la pasarela: lo hace quien opera la tienda.
 *
 * Dos transiciones NO están en este mapa a propósito:
 * - `PENDING → PAID`: solo la produce el webhook de pago verificado. Permitir
 *   marcar un pedido como pagado a mano abriría la puerta a despachar sin cobro.
 * - Cualquier salida de `DELIVERED` o `CANCELLED`: son estados finales.
 */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CANCELLED],
  PAID: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
}

/** Estados a los que un admin puede mover un pedido desde `from`. */
export function allowedTransitionsFrom(from: OrderStatus): OrderStatus[] {
  return ALLOWED[from] ?? []
}

/**
 * Valida una transición. Lanza si no es aplicable.
 * Lógica de negocio pura: sin base de datos, sin HTTP.
 */
export function assertTransitionAllowed(from: OrderStatus, to: OrderStatus): void {
  if (from === to) {
    throw new BadRequestError(`El pedido ya está en estado ${to}`)
  }
  if (to === OrderStatus.PAID) {
    throw new BadRequestError(
      'Un pedido solo pasa a PAID cuando la pasarela confirma el pago; no se puede marcar a mano',
    )
  }
  if (!allowedTransitionsFrom(from).includes(to)) {
    const posibles = allowedTransitionsFrom(from)
    const detalle = posibles.length > 0 ? `Desde ${from} solo puedes pasar a: ${posibles.join(', ')}` : `${from} es un estado final`
    throw new ConflictError(`Transición no permitida de ${from} a ${to}. ${detalle}`)
  }
}

/** ¿Cancelar este estado debe devolver el stock al catálogo? */
export function cancellationRestoresStock(from: OrderStatus): boolean {
  // Mientras el pedido no se haya despachado, las unidades vuelven al inventario.
  return from === OrderStatus.PENDING || from === OrderStatus.PAID || from === OrderStatus.PREPARING
}
