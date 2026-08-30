import { ListProductsUseCase } from '../../../src/modules/catalog/application/productUseCases'
import { Product, ProductFilter } from '../../../src/modules/catalog/domain/ports'
import { FakeCatalogCache, InMemoryProductRepository } from './fakes'

async function seedProducts(repo: InMemoryProductRepository) {
  await repo.create({ name: 'A', slug: 'a', sku: 'A1', description: 'x', brandId: 'b', categoryId: 'c', price: 10000, stock: 5 })
  await repo.create({ name: 'B', slug: 'b', sku: 'B1', description: 'x', brandId: 'b', categoryId: 'c', price: 50000, stock: 5 })
}

// `repo.create()` siempre deja `isActive: true` (así se comporta también el
// repositorio Prisma real: un producto nace activo). Para probar el filtro de
// inactivos se arma el objeto Product directamente, como hace este mismo
// archivo de fakes en sus `seed()` de marca/categoría.
function productoBase(): Product {
  return {
    id: 'p-base',
    name: 'Base',
    slug: 'base',
    sku: 'SKU-BASE',
    description: 'x',
    brandId: 'b',
    categoryId: 'c',
    price: 10000,
    currency: 'COP',
    presentation: null,
    sizeMl: null,
    usageType: null,
    skinType: null,
    ingredients: null,
    warnings: null,
    stock: 5,
    isActive: true,
  }
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

describe('ListProductsUseCase · productos desactivados', () => {
  function repoConUnoDesactivado() {
    const repo = new InMemoryProductRepository()
    repo.products.push(
      { ...productoBase(), id: 'p-activo', slug: 'activo', isActive: true },
      { ...productoBase(), id: 'p-inactivo', slug: 'inactivo', isActive: false },
    )
    return repo
  }

  it('con activeOnly solo devuelve el activo', async () => {
    const useCase = new ListProductsUseCase(repoConUnoDesactivado(), new FakeCatalogCache())

    const res = await useCase.execute({ page: 1, pageSize: 20, activeOnly: true })

    expect(res.items.map((p) => p.id)).toEqual(['p-activo'])
  })

  it('sin activeOnly devuelve también el desactivado', async () => {
    const useCase = new ListProductsUseCase(repoConUnoDesactivado(), new FakeCatalogCache())

    const res = await useCase.execute({ page: 1, pageSize: 20, activeOnly: false })

    expect(res.items.map((p) => p.id)).toEqual(['p-activo', 'p-inactivo'])
  })
})
