import { CreateProductUseCase } from '../../../src/modules/catalog/application/productUseCases'
import {
  FakeCatalogCache,
  InMemoryBrandRepository,
  InMemoryCategoryRepository,
  InMemoryProductRepository,
} from './fakes'

function makeEnv() {
  const products = new InMemoryProductRepository()
  const brands = new InMemoryBrandRepository()
  const categories = new InMemoryCategoryRepository()
  const cache = new FakeCatalogCache()
  const brand = brands.seed({ id: 'brand-1', slug: 'pomass', name: 'PomAss' })
  const category = categories.seed({ id: 'cat-1', slug: 'cremas', name: 'Cremas' })
  const useCase = new CreateProductUseCase(products, brands, categories, cache)
  return { products, cache, useCase, brand, category }
}

const baseData = {
  name: 'Crema Íntima Día',
  sku: 'PA-DIA-50',
  description: 'Crema de uso diario',
  price: 45900,
  stock: 10,
}

describe('CreateProductUseCase', () => {
  it('crea un producto con slug derivado del nombre e invalida la caché', async () => {
    const { useCase, cache, brand, category } = makeEnv()

    const product = await useCase.execute({ ...baseData, brandId: brand.id, categoryId: category.id })

    expect(product.slug).toBe('crema-intima-dia') // sin acentos, minúsculas
    expect(cache.invalidateCalls).toBe(1)
  })

  it('genera un slug único si ya existe uno igual', async () => {
    const { useCase, brand, category } = makeEnv()
    const a = await useCase.execute({ ...baseData, brandId: brand.id, categoryId: category.id })
    const b = await useCase.execute({ ...baseData, sku: 'PA-DIA-51', brandId: brand.id, categoryId: category.id })
    expect(b.slug).not.toBe(a.slug)
  })

  it('rechaza (400) si la marca no existe', async () => {
    const { useCase, category } = makeEnv()
    await expect(
      useCase.execute({ ...baseData, brandId: 'inexistente', categoryId: category.id }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('rechaza (400) si la categoría no existe', async () => {
    const { useCase, brand } = makeEnv()
    await expect(
      useCase.execute({ ...baseData, brandId: brand.id, categoryId: 'inexistente' }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
