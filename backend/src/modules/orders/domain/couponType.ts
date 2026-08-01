// Copia propia del dominio de `orders` (sin depender del módulo `coupons` ni
// de Prisma) para poder calcular el descuento del cupón aplicado al pedido.
// Los valores coinciden con el enum `CouponType` de `schema.prisma`; la
// conversión explícita hacia/desde Prisma vive en la infraestructura.
export const CouponType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const

export type CouponType = (typeof CouponType)[keyof typeof CouponType]
