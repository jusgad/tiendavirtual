import { OrderStatus as PrismaOrderStatus } from '@prisma/client'
import { OrderStatus as DomainOrderStatus } from '../domain/orderStatus'

// Punto único de conversión entre el `OrderStatus` de dominio de `admin` y el
// enum de Prisma. Solo se necesitan reportes de solo lectura: se usa para
// traducir filtros (SALE_STATUSES) hacia Prisma y filas leídas hacia dominio.
const toDomainMap: Record<PrismaOrderStatus, DomainOrderStatus> = {
  PENDING: DomainOrderStatus.PENDING,
  PAID: DomainOrderStatus.PAID,
  PREPARING: DomainOrderStatus.PREPARING,
  SHIPPED: DomainOrderStatus.SHIPPED,
  DELIVERED: DomainOrderStatus.DELIVERED,
  CANCELLED: DomainOrderStatus.CANCELLED,
}

const toPrismaMap: Record<DomainOrderStatus, PrismaOrderStatus> = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PREPARING: 'PREPARING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
}

export function toDomainOrderStatus(status: PrismaOrderStatus): DomainOrderStatus {
  return toDomainMap[status]
}

export function toPrismaOrderStatus(status: DomainOrderStatus): PrismaOrderStatus {
  return toPrismaMap[status]
}
