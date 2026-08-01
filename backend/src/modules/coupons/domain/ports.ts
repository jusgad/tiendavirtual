import { CouponType } from './couponType'

// -------- Tipos de dominio (dinero como number para respuestas limpias) --------

export interface Coupon {
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
  createdAt: Date
}

export interface CreateCouponData {
  code: string
  type: CouponType
  value: number
  minPurchase?: number | null
  maxUses?: number | null
  perUserLimit?: number | null
  startsAt?: Date | null
  endsAt?: Date | null
}

export type UpdateCouponData = Partial<Omit<CreateCouponData, 'code'>> & {
  isActive?: boolean
}

// -------- Puerto --------

export interface CouponRepository {
  list(includeInactive: boolean): Promise<Coupon[]>
  findById(id: string): Promise<Coupon | null>
  findByCode(code: string): Promise<Coupon | null>
  create(data: CreateCouponData): Promise<Coupon>
  update(id: string, data: UpdateCouponData): Promise<Coupon>
}
