import { Request, Response } from 'express'
import {
  CreateCouponUseCase,
  GetCouponUseCase,
  ListCouponsUseCase,
  UpdateCouponUseCase,
} from '../../application/couponUseCases'

export class CouponController {
  constructor(
    private readonly listCoupons: ListCouponsUseCase,
    private readonly getCoupon: GetCouponUseCase,
    private readonly createCoupon: CreateCouponUseCase,
    private readonly updateCoupon: UpdateCouponUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true'
    res.json({ coupons: await this.listCoupons.execute(includeInactive) })
  }

  get = async (req: Request, res: Response) => {
    res.json({ coupon: await this.getCoupon.execute(req.params.id) })
  }

  create = async (req: Request, res: Response) => {
    res.status(201).json({ coupon: await this.createCoupon.execute(req.body) })
  }

  update = async (req: Request, res: Response) => {
    res.json({ coupon: await this.updateCoupon.execute(req.params.id, req.body) })
  }
}
