import { CouponType as PrismaCouponType } from '@prisma/client'
import { CouponType as DomainCouponType } from '../domain/couponType'

// Punto único de conversión entre el `CouponType` de dominio de `orders` y el
// enum de Prisma. Solo se necesita la dirección Prisma -> dominio: `orders`
// únicamente lee cupones para aplicar el descuento en el checkout.
const toDomainMap: Record<PrismaCouponType, DomainCouponType> = {
  PERCENTAGE: DomainCouponType.PERCENTAGE,
  FIXED: DomainCouponType.FIXED,
}

export function toDomainCouponType(type: PrismaCouponType): DomainCouponType {
  return toDomainMap[type]
}
