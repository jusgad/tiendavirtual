import { CreateProductUseCase, UpdateProductUseCase } from '../../../src/modules/catalog/application/productUseCases'
import { Product } from '../../../src/modules/catalog/domain/ports'
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

// Este archivo no crea productos vía `repo.create()` para las pruebas de
// actualización porque necesitamos un producto ya persistido con un id
// conocido; se arma el objeto directamente, igual que hace `listProducts.test.ts`
// con su propio `productoBase()`.
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

describe('UpdateProductUseCase · imágenes', () => {
  function repoConProducto() {
    const repo = new InMemoryProductRepository()
    repo.products.push({ ...productoBase(), id: 'p1', slug: 'p1' })
    return repo
  }

  it('pasa las imágenes nuevas al repositorio', async () => {
    const repo = repoConProducto()
    const useCase = new UpdateProductUseCase(repo, new FakeCatalogCache())

    await useCase.execute('p1', {
      images: [
        { url: 'nueva1.png', alt: 'Frente', position: 0 },
        { url: 'nueva2.png', alt: null, position: 1 },
      ],
    })

    expect(repo.ultimaActualizacion?.images).toHaveLength(2)
    expect(repo.ultimaActualizacion?.images?.[0].url).toBe('nueva1.png')
  })

  it('no manda imágenes si la actualización no las trae', async () => {
    const repo = repoConProducto()
    const useCase = new UpdateProductUseCase(repo, new FakeCatalogCache())

    await useCase.execute('p1', { price: 89900 })

    expect(repo.ultimaActualizacion?.images).toBeUndefined()
  })
})
