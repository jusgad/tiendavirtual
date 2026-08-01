// Estado del pedido, propio del dominio de `orders` (independiente de Prisma).
// Los valores coinciden con el enum `OrderStatus` de `schema.prisma`; la
// conversión explícita hacia/desde Prisma vive en la infraestructura
// (ver `infrastructure/orderStatusMapper.ts`).
export const OrderStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PREPARING: 'PREPARING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]
