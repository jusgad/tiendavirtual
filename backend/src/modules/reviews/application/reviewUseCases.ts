import { BadRequestError, ConflictError } from '../../../shared/errors/AppError'
import { Paginated, PurchaseVerificationGateway, Review, ReviewRepository } from '../domain/ports'

export interface CreateReviewInput {
  productId: string
  userId: string
  rating: number
  title?: string
  comment?: string
  isAnonymous?: boolean
}

/**
 * Crea una reseña. Solo puede reseñar quien recibió (DELIVERED) el producto,
 * y una sola vez por producto (regla también reforzada por el @@unique del schema).
 * Se aprueba automáticamente: no hay cola de moderación.
 */
export class CreateReviewUseCase {
  constructor(
    private readonly reviews: ReviewRepository,
    private readonly purchases: PurchaseVerificationGateway,
  ) {}

  async execute(input: CreateReviewInput): Promise<Review> {
    const orderId = await this.purchases.findDeliveredOrderId(input.userId, input.productId)
    if (!orderId) {
      throw new BadRequestError('Solo puedes reseñar productos que hayas recibido')
    }

    if (await this.reviews.findByUserAndProduct(input.userId, input.productId)) {
      throw new ConflictError('Ya reseñaste este producto')
    }

    return this.reviews.create({
      productId: input.productId,
      userId: input.userId,
      orderId,
      rating: input.rating,
      title: input.title ?? null,
      comment: input.comment ?? null,
      isAnonymous: input.isAnonymous ?? false,
    })
  }
}

/** Lista pública de reseñas aprobadas de un producto. */
export class ListProductReviewsUseCase {
  constructor(private readonly reviews: ReviewRepository) {}

  async execute(productId: string, page: number, pageSize: number): Promise<Paginated<Review>> {
    return this.reviews.listApprovedByProduct(productId, page, pageSize)
  }
}
