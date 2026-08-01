// Copia propia del dominio de `admin` (sin depender del módulo `orders` ni de
// Prisma) para clasificar/agrupar pedidos en los reportes. Los valores
// coinciden con el enum `OrderStatus` de `schema.prisma`; la conversión
// explícita hacia/desde Prisma vive en la infraestructura.
export const OrderStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PREPARING: 'PREPARING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]
