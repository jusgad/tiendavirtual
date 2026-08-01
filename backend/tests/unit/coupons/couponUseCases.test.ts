import { CouponType } from '../../../src/modules/coupons/domain/couponType'
import {
  CreateCouponUseCase,
  GetCouponUseCase,
  ListCouponsUseCase,
  UpdateCouponUseCase,
} from '../../../src/modules/coupons/application/couponUseCases'
import { InMemoryCouponRepository } from './fakes'

describe('CreateCouponUseCase', () => {
  it('crea un cupón y normaliza el código en mayúsculas', async () => {
    const coupons = new InMemoryCouponRepository()
    const useCase = new CreateCouponUseCase(coupons)

    const coupon = await useCase.execute({ code: 'bienvenida10', type: CouponType.PERCENTAGE, value: 10 })

    expect(coupon.code).toBe('BIENVENIDA10')
    expect(coupon.isActive).toBe(true)
    expect(coupon.usedCount).toBe(0)
  })

  it('rechaza (409) un código duplicado, sin distinguir mayúsculas/minúsculas', async () => {
    const coupons = new InMemoryCouponRepository()
    coupons.seed({ id: 'c1', code: 'VERANO20' })
    const useCase = new CreateCouponUseCase(coupons)

    await expect(
      useCase.execute({ code: 'verano20', type: CouponType.FIXED, value: 5000 }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('UpdateCouponUseCase', () => {
  it('actualiza campos y permite desactivar el cupón', async () => {
    const coupons = new InMemoryCouponRepository()
    const seeded = coupons.seed({ id: 'c1', code: 'VERANO20', type: CouponType.PERCENTAGE, value: 20 })
    const useCase = new UpdateCouponUseCase(coupons)

    const updated = await useCase.execute(seeded.id, { isActive: false })

    expect(updated.isActive).toBe(false)
  })

  it('rechaza (400) subir el valor de un cupón porcentual por encima de 100', async () => {
    const coupons = new InMemoryCouponRepository()
    const seeded = coupons.seed({ id: 'c1', code: 'VERANO20', type: CouponType.PERCENTAGE, value: 20 })
    const useCase = new UpdateCouponUseCase(coupons)

    await expect(useCase.execute(seeded.id, { value: 150 })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rechaza (404) si el cupón no existe', async () => {
    const coupons = new InMemoryCouponRepository()
    const useCase = new UpdateCouponUseCase(coupons)

    await expect(useCase.execute('inexistente', { isActive: false })).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('ListCouponsUseCase / GetCouponUseCase', () => {
  it('lista solo cupones activos por defecto', async () => {
    const coupons = new InMemoryCouponRepository()
    coupons.seed({ id: 'c1', code: 'ACTIVO', isActive: true })
    coupons.seed({ id: 'c2', code: 'INACTIVO', isActive: false })
    const useCase = new ListCouponsUseCase(coupons)

    const result = await useCase.execute()

    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('ACTIVO')
  })

  it('rechaza (404) al obtener un cupón inexistente', async () => {
    const coupons = new InMemoryCouponRepository()
    const useCase = new GetCouponUseCase(coupons)

    await expect(useCase.execute('inexistente')).rejects.toMatchObject({ statusCode: 404 })
  })
})
