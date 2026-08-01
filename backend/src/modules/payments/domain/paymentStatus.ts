// Estado de un pago del dominio, independiente del enum generado por Prisma.
// Los valores coinciden con el enum `PaymentStatus` de `schema.prisma`; la
// conversión explícita hacia/desde Prisma vive en la infraestructura
// (ver `infrastructure/paymentEnumMapper.ts`).
export const PaymentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DECLINED: 'DECLINED',
  REFUNDED: 'REFUNDED',
} as const

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]
