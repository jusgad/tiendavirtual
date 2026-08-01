// Tipo de descuento del cupón, propio del dominio (independiente de Prisma).
// Los valores coinciden con el enum `CouponType` de `schema.prisma`; la
// conversión explícita hacia/desde Prisma vive en la infraestructura
// (ver `infrastructure/couponTypeMapper.ts`).
export const CouponType = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const

export type CouponType = (typeof CouponType)[keyof typeof CouponType]
