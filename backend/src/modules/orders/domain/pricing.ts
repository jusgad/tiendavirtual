import { BadRequestError } from '../../../shared/errors/AppError'
import { CouponType } from './couponType'

export interface CouponData {
  id: string
  code: string
  type: CouponType
  value: number
  minPurchase: number | null
  maxUses: number | null
  usedCount: number
  perUserLimit: number | null
  startsAt: Date | null
  endsAt: Date | null
  isActive: boolean
}

/**
 * Valida que un cupón sea usable para un subtotal/usuario dados.
 * Lanza BadRequestError con el motivo si no lo es. Lógica de negocio pura.
 */
export function assertCouponUsable(
  coupon: CouponData,
  subtotal: number,
  userRedemptions: number,
  now: Date = new Date(),
): void {
  if (!coupon.isActive) throw new BadRequestError('El cupón no está activo')
  if (coupon.startsAt && now < coupon.startsAt) throw new BadRequestError('El cupón aún no es válido')
  if (coupon.endsAt && now > coupon.endsAt) throw new BadRequestError('El cupón ya expiró')
  if (coupon.minPurchase != null && subtotal < coupon.minPurchase) {
    throw new BadRequestError(`El cupón requiere una compra mínima de ${coupon.minPurchase}`)
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new BadRequestError('El cupón alcanzó su límite de usos')
  }
  if (coupon.perUserLimit != null && userRedemptions >= coupon.perUserLimit) {
    throw new BadRequestError('Ya usaste este cupón el máximo de veces permitido')
  }
}

/** Calcula el descuento (entero COP), sin exceder el subtotal. */
export function computeDiscount(coupon: CouponData, subtotal: number): number {
  const raw =
    coupon.type === CouponType.PERCENTAGE ? (subtotal * coupon.value) / 100 : coupon.value
  return Math.min(subtotal, Math.round(raw))
}

/**
 * ¿La ciudad escrita en la dirección es Bogotá? Compara sin tildes ni
 * mayúsculas y por inclusión, para aceptar variantes como "Bogotá",
 * "bogota", "Bogotá D.C." o "BOGOTA DC" sin mantener una lista exacta.
 */
function esBogota(ciudad: string): boolean {
  const normalizada = ciudad
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
  return normalizada.includes('bogota')
}

/**
 * Envío: gratis en Bogotá (decisión de negocio: ahí el envío sale más
 * barato que en el resto del país y se absorbe en el margen); en el resto
 * del país, tarifa plana, gratis igual si el neto alcanza el umbral.
 */
export function computeShipping(
  net: number,
  flatRate: number,
  freeThreshold: number,
  ciudad: string,
): number {
  if (esBogota(ciudad)) return 0
  if (freeThreshold > 0 && net >= freeThreshold) return 0
  return flatRate
}
