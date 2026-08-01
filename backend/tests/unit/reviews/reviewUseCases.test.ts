import { CreateReviewUseCase, ListProductReviewsUseCase } from '../../../src/modules/reviews/application/reviewUseCases'
import { FakePurchaseVerificationGateway, InMemoryReviewRepository } from './fakes'

describe('CreateReviewUseCase', () => {
  it('crea la reseña vinculada al pedido DELIVERED que habilita la compra', async () => {
    const reviews = new InMemoryReviewRepository()
    const purchases = new FakePurchaseVerificationGateway()
    purchases.grant('user-1', 'prod-1', 'order-99')
    const useCase = new CreateReviewUseCase(reviews, purchases)

    const review = await useCase.execute({ productId: 'prod-1', userId: 'user-1', rating: 5, comment: 'Excelente' })

    expect(review.orderId).toBe('order-99')
    expect(review.isApproved).toBe(true) // auto-aprobada, sin moderación
  })

  it('rechaza (400) si el usuario no tiene una compra entregada del producto', async () => {
    const reviews = new InMemoryReviewRepository()
    const purchases = new FakePurchaseVerificationGateway()
    const useCase = new CreateReviewUseCase(reviews, purchases)

    await expect(
      useCase.execute({ productId: 'prod-1', userId: 'user-1', rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rechaza (409) una segunda reseña del mismo usuario para el mismo producto', async () => {
    const reviews = new InMemoryReviewRepository()
    const purchases = new FakePurchaseVerificationGateway()
    purchases.grant('user-1', 'prod-1')
    const useCase = new CreateReviewUseCase(reviews, purchases)

    await useCase.execute({ productId: 'prod-1', userId: 'user-1', rating: 4 })

    await expect(
      useCase.execute({ productId: 'prod-1', userId: 'user-1', rating: 5 }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('oculta el nombre del autor cuando la reseña es anónima', async () => {
    const reviews = new InMemoryReviewRepository()
    const purchases = new FakePurchaseVerificationGateway()
    purchases.grant('user-1', 'prod-1')
    const useCase = new CreateReviewUseCase(reviews, purchases)

    const review = await useCase.execute({ productId: 'prod-1', userId: 'user-1', rating: 3, isAnonymous: true })

    expect(review.authorName).toBeNull()
  })
})

describe('ListProductReviewsUseCase', () => {
  it('solo devuelve reseñas aprobadas del producto pedido', async () => {
    const reviews = new InMemoryReviewRepository()
    const purchases = new FakePurchaseVerificationGateway()
    purchases.grant('user-1', 'prod-1')
    purchases.grant('user-2', 'prod-2')
    await new CreateReviewUseCase(reviews, purchases).execute({ productId: 'prod-1', userId: 'user-1', rating: 5 })
    await new CreateReviewUseCase(reviews, purchases).execute({ productId: 'prod-2', userId: 'user-2', rating: 2 })

    const result = await new ListProductReviewsUseCase(reviews).execute('prod-1', 1, 20)

    expect(result.items).toHaveLength(1)
    expect(result.items[0].productId).toBe('prod-1')
  })
})
