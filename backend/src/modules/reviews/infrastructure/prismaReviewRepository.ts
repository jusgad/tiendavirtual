import { Prisma, PrismaClient } from '@prisma/client'
import { CreateReviewData, Paginated, Review, ReviewRepository } from '../domain/ports'

const withAuthor = {
  user: { select: { firstName: true, lastName: true } },
}

type PrismaReview = Prisma.ReviewGetPayload<{ include: typeof withAuthor }>

function toReview(r: PrismaReview): Review {
  return {
    id: r.id,
    productId: r.productId,
    userId: r.userId,
    orderId: r.orderId,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    isAnonymous: r.isAnonymous,
    isApproved: r.isApproved,
    createdAt: r.createdAt,
    authorName: r.isAnonymous ? null : `${r.user.firstName} ${r.user.lastName.charAt(0)}.`,
  }
}

export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listApprovedByProduct(productId: string, page: number, pageSize: number): Promise<Paginated<Review>> {
    const where: Prisma.ReviewWhereInput = { productId, isApproved: true }
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: withAuthor,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.review.count({ where }),
    ])
    return { items: rows.map(toReview), total, page, pageSize }
  }

  async findByUserAndProduct(userId: string, productId: string): Promise<Review | null> {
    const r = await this.prisma.review.findUnique({
      where: { userId_productId: { userId, productId } },
      include: withAuthor,
    })
    return r ? toReview(r) : null
  }

  async create(data: CreateReviewData): Promise<Review> {
    const r = await this.prisma.review.create({
      data: {
        productId: data.productId,
        userId: data.userId,
        orderId: data.orderId,
        rating: data.rating,
        title: data.title ?? null,
        comment: data.comment ?? null,
        isAnonymous: data.isAnonymous ?? false,
        isApproved: true,
      },
      include: withAuthor,
    })
    return toReview(r)
  }
}
