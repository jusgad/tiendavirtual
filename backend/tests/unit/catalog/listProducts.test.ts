import { ListProductsUseCase } from '../../../src/modules/catalog/application/productUseCases'
import { ProductFilter } from '../../../src/modules/catalog/domain/ports'
import { FakeCatalogCache, InMemoryProductRepository } from './fakes'

async function seedProducts(repo: InMemoryProductRepository) {
  await repo.create({ name: 'A', slug: 'a', sku: 'A1', description: 'x', brandId: 'b', categoryId: 'c', price: 10000, stock: 5 })
  await repo.create({ name: 'B', slug: 'b', sku: 'B1', description: 'x', brandId: 'b', categoryId: 'c', price: 50000, stock: 5 })
}

const filter: ProductFilter = { activeOnly: true, page: 1, pageSize: 20 }

describe('ListProductsUseCase', () => {
  it('devuelve productos y guarda el resultado en caché', async () => {
    const repo = new InMemoryProductRepository()
    const cache = new FakeCatalogCache()
    await seedProducts(repo)

    const result = await new ListProductsUseCase(repo, cache).execute(filter)

    expect(result.total).toBe(2)
    expect(cache.store.size).toBe(1) // se cacheó la página
  })

  it('sirve desde caché en la segunda llamada (no vuelve al repositorio)', async () => {
    const repo = new InMemoryProductRepository()
    const cache = new FakeCatalogCache()
    await seedProducts(repo)
    const useCase = new ListProductsUseCase(repo, cache)

    await useCase.execute(filter)
    const spy = jest.spyOn(repo, 'list')
    await useCase.execute(filter)

    expect(spy).not.toHaveBeenCalled() // la segunda vez viene de caché
  })

  it('filtra por rango de precio', async () => {
    const repo = new InMemoryProductRepository()
    const cache = new FakeCatalogCache()
    await seedProducts(repo)

    const result = await new ListProductsUseCase(repo, cache).execute({ ...filter, minPrice: 20000 })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('B')
  })
})
