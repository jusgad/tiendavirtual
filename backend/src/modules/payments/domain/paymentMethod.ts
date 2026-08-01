// Método de pago del dominio, independiente del enum generado por Prisma.
// Los valores coinciden con el enum `PaymentMethod` de `schema.prisma`; la
// conversión explícita hacia/desde Prisma vive en la infraestructura
// (ver `infrastructure/paymentEnumMapper.ts`).
export const PaymentMethod = {
  NEQUI: 'NEQUI',
  DAVIPLATA: 'DAVIPLATA',
  CREDIT_CARD: 'CREDIT_CARD',
} as const

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod]
