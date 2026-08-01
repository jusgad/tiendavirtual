import { CouponType as PrismaCouponType } from '@prisma/client'
import { CouponType as DomainCouponType } from '../domain/couponType'

// Punto único de conversión entre el `CouponType` de dominio y el enum de Prisma.
const toDomainMap: Record<PrismaCouponType, DomainCouponType> = {
  PERCENTAGE: DomainCouponType.PERCENTAGE,
  FIXED: DomainCouponType.FIXED,
}

const toPrismaMap: Record<DomainCouponType, PrismaCouponType> = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
}

export function toDomainCouponType(type: PrismaCouponType): DomainCouponType {
  return toDomainMap[type]
}

export function toPrismaCouponType(type: DomainCouponType): PrismaCouponType {
  return toPrismaMap[type]
}
