import { Request, Response } from 'express'
import { CreateReviewUseCase, ListProductReviewsUseCase } from '../../application/reviewUseCases'

export class ReviewController {
  constructor(
    private readonly listProductReviews: ListProductReviewsUseCase,
    private readonly createReview: CreateReviewUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number }
    res.json(await this.listProductReviews.execute(req.params.productId, page, pageSize))
  }

  create = async (req: Request, res: Response) => {
    const review = await this.createReview.execute({
      ...req.body,
      productId: req.params.productId,
      userId: req.user!.id,
    })
    res.status(201).json({ review })
  }
}
