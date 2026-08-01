import {
  CreateReviewData,
  Paginated,
  PurchaseVerificationGateway,
  Review,
  ReviewRepository,
} from '../../../src/modules/reviews/domain/ports'

let seq = 0
const id = () => `review-${++seq}`

export class InMemoryReviewRepository implements ReviewRepository {
  reviews: Review[] = []

  async listApprovedByProduct(productId: string, page: number, pageSize: number): Promise<Paginated<Review>> {
    const items = this.reviews.filter((r) => r.productId === productId && r.isApproved)
    const start = (page - 1) * pageSize
    return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize }
  }

  async findByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
    return this.reviews.find((r) => r.userId === userId && r.productId === productId) ?? null
  }

  async create(data: CreateReviewData): Promise<Review> {
    const review: Review = {
      id: id(),
      productId: data.productId,
      userId: data.userId,
      orderId: data.orderId,
      rating: data.rating,
      title: data.title ?? null,
      comment: data.comment ?? null,
      isAnonymous: data.isAnonymous ?? false,
      isApproved: true,
      createdAt: new Date(),
      authorName: data.isAnonymous ? null : 'Cliente P.',
    }
    this.reviews.push(review)
    return review
  }
}

export class FakePurchaseVerificationGateway implements PurchaseVerificationGateway {
  deliveredOrders = new Map<string, string>() // key `${userId}:${productId}` -> orderId

  grant(userId: string, productId: string, orderId = `order-${userId}-${productId}`) {
    this.deliveredOrders.set(`${userId}:${productId}`, orderId)
  }

  async findDeliveredOrderId(userId: string, productId: string): Promise<string | null> {
    return this.deliveredOrders.get(`${userId}:${productId}`) ?? null
  }
}
