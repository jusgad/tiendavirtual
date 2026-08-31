import { Coupon, CouponRepository, CreateCouponData, UpdateCouponData } from '../../../src/modules/coupons/domain/ports'
import { CouponType } from '../../../src/modules/coupons/domain/couponType'

let seq = 0
const id = () => `coupon-${++seq}`

export class InMemoryCouponRepository implements CouponRepository {
  coupons: Coupon[] = []

  async list(includeInactive: boolean): Promise<Coupon[]> {
    return includeInactive ? this.coupons : this.coupons.filter((c) => c.isActive)
  }

  async findById(cid: string): Promise<Coupon | null> {
    return this.coupons.find((c) => c.id === cid) ?? null
  }

  async findByCode(code: string): Promise<Coupon | null> {
    return this.coupons.find((c) => c.code === code) ?? null
  }

  async create(data: CreateCouponData): Promise<Coupon> {
    const coupon: Coupon = {
      id: id(),
      code: data.code,
      type: data.type,
      value: data.value,
      minPurchase: data.minPurchase ?? null,
      maxUses: data.maxUses ?? null,
      usedCount: 0,
      perUserLimit: data.perUserLimit ?? null,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      // Igual que el repositorio Prisma real: si no viene, nace activo.
      isActive: data.isActive ?? true,
      createdAt: new Date(),
    }
    this.coupons.push(coupon)
    return coupon
  }

  async update(cid: string, data: UpdateCouponData): Promise<Coupon> {
    const c = this.coupons.find((x) => x.id === cid)!
    Object.assign(c, data)
    return c
  }

  seed(coupon: Partial<Coupon> & { id: string; code: string }): Coupon {
    const c: Coupon = {
      type: CouponType.PERCENTAGE,
      value: 10,
      minPurchase: null,
      maxUses: null,
      usedCount: 0,
      perUserLimit: null,
      startsAt: null,
      endsAt: null,
      isActive: true,
      createdAt: new Date(),
      ...coupon,
    }
    this.coupons.push(c)
    return c
  }
}
