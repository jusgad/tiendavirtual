import { CouponType } from '@prisma/client'
import {
  assertCouponUsable,
  computeDiscount,
  computeShipping,
  CouponData,
} from '../../../src/modules/orders/domain/pricing'

const coupon = (over: Partial<CouponData> = {}): CouponData => ({
  id: 'c1',
  code: 'TEST',
  type: CouponType.PERCENTAGE,
  value: 10,
  minPurchase: null,
  maxUses: null,
  usedCount: 0,
  perUserLimit: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
  ...over,
})

describe('computeShipping', () => {
  it('cobra tarifa plana por debajo del umbral', () => {
    expect(computeShipping(100000, 12900, 150000)).toBe(12900)
  })
  it('es gratis al alcanzar el umbral', () => {
    expect(computeShipping(150000, 12900, 150000)).toBe(0)
  })
  it('con umbral 0 siempre cobra la tarifa', () => {
    expect(computeShipping(999999, 12900, 0)).toBe(12900)
  })
})

describe('computeDiscount', () => {
  it('aplica porcentaje', () => {
    expect(computeDiscount(coupon({ type: CouponType.PERCENTAGE, value: 10 }), 100000)).toBe(10000)
  })
  it('aplica monto fijo', () => {
    expect(computeDiscount(coupon({ type: CouponType.FIXED, value: 15000 }), 100000)).toBe(15000)
  })
  it('no excede el subtotal', () => {
    expect(computeDiscount(coupon({ type: CouponType.FIXED, value: 999999 }), 50000)).toBe(50000)
  })
})

describe('assertCouponUsable', () => {
  it('acepta un cupón válido', () => {
    expect(() => assertCouponUsable(coupon(), 100000, 0)).not.toThrow()
  })
  it('rechaza un cupón inactivo', () => {
    expect(() => assertCouponUsable(coupon({ isActive: false }), 100000, 0)).toThrow()
  })
  it('rechaza si no alcanza la compra mínima', () => {
    expect(() => assertCouponUsable(coupon({ minPurchase: 200000 }), 100000, 0)).toThrow()
  })
  it('rechaza un cupón expirado', () => {
    expect(() =>
      assertCouponUsable(coupon({ endsAt: new Date('2020-01-01') }), 100000, 0),
    ).toThrow()
  })
  it('rechaza al superar el límite total de usos', () => {
    expect(() => assertCouponUsable(coupon({ maxUses: 5, usedCount: 5 }), 100000, 0)).toThrow()
  })
  it('rechaza al superar el límite por usuario', () => {
    expect(() => assertCouponUsable(coupon({ perUserLimit: 1 }), 100000, 1)).toThrow()
  })
})
