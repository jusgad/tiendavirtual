import { Coupon as PrismaCoupon, PrismaClient } from '@prisma/client'
import { Coupon, CouponRepository, CreateCouponData, UpdateCouponData } from '../domain/ports'
import { toDomainCouponType, toPrismaCouponType } from './couponTypeMapper'

function toCoupon(c: PrismaCoupon): Coupon {
  return {
    id: c.id,
    code: c.code,
    type: toDomainCouponType(c.type),
    value: Number(c.value),
    minPurchase: c.minPurchase != null ? Number(c.minPurchase) : null,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    perUserLimit: c.perUserLimit,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    isActive: c.isActive,
    createdAt: c.createdAt,
  }
}

export class PrismaCouponRepository implements CouponRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(includeInactive: boolean): Promise<Coupon[]> {
    const rows = await this.prisma.coupon.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(toCoupon)
  }

  async findById(id: string): Promise<Coupon | null> {
    const c = await this.prisma.coupon.findUnique({ where: { id } })
    return c ? toCoupon(c) : null
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const c = await this.prisma.coupon.findUnique({ where: { code } })
    return c ? toCoupon(c) : null
  }

  async create(data: CreateCouponData): Promise<Coupon> {
    const c = await this.prisma.coupon.create({
      data: {
        code: data.code,
        type: toPrismaCouponType(data.type),
        value: data.value,
        minPurchase: data.minPurchase ?? null,
        maxUses: data.maxUses ?? null,
        perUserLimit: data.perUserLimit ?? null,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        // Si no viene, se omite la clave y la columna toma su valor por
        // defecto en base de datos (`true`) — no se fuerza aquí.
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })
    return toCoupon(c)
  }

  async update(id: string, data: UpdateCouponData): Promise<Coupon> {
    const { type, ...rest } = data
    const c = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...rest,
        ...(type !== undefined ? { type: toPrismaCouponType(type) } : {}),
      },
    })
    return toCoupon(c)
  }
}
