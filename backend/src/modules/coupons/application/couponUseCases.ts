import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/AppError'
import { Coupon, CouponRepository, CreateCouponData, UpdateCouponData } from '../domain/ports'
import { CouponType } from '../domain/couponType'

/** Lista cupones (admin). Por defecto solo los activos. */
export class ListCouponsUseCase {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(includeInactive = false): Promise<Coupon[]> {
    return this.coupons.list(includeInactive)
  }
}

/** Obtiene un cupón por id (admin). */
export class GetCouponUseCase {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(id: string): Promise<Coupon> {
    const coupon = await this.coupons.findById(id)
    if (!coupon) throw new NotFoundError('Cupón no encontrado')
    return coupon
  }
}

/** Crea un cupón (admin). El código es único y se normaliza en mayúsculas. */
export class CreateCouponUseCase {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(data: CreateCouponData): Promise<Coupon> {
    const code = data.code.trim().toUpperCase()
    if (await this.coupons.findByCode(code)) {
      throw new ConflictError(`Ya existe un cupón con el código ${code}`)
    }
    return this.coupons.create({ ...data, code })
  }
}

/** Actualiza un cupón (admin): campos, o desactivarlo con isActive: false. */
export class UpdateCouponUseCase {
  constructor(private readonly coupons: CouponRepository) {}

  async execute(id: string, data: UpdateCouponData): Promise<Coupon> {
    const existing = await this.coupons.findById(id)
    if (!existing) throw new NotFoundError('Cupón no encontrado')

    const type = data.type ?? existing.type
    const value = data.value ?? existing.value
    if (type === CouponType.PERCENTAGE && (value <= 0 || value > 100)) {
      throw new BadRequestError('Un cupón porcentual debe tener un valor entre 1 y 100')
    }

    return this.coupons.update(id, data)
  }
}
