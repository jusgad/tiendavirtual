import { GetProductUseCase } from '../../../src/modules/catalog/application/productUseCases'
import { NotFoundError } from '../../../src/shared/errors/AppError'
import { FakeCatalogCache, InMemoryProductRepository } from './fakes'

async function preparar() {
  const repo = new InMemoryProductRepository()
  const cache = new FakeCatalogCache()
  const p = await repo.create({
    name: 'Borrador',
    slug: 'borrador',
    sku: 'SKU-B',
    description: 'x',
    brandId: 'b',
    categoryId: 'c',
    price: 10000,
    stock: 0,
  })
  return { repo, cache, p, uc: new GetProductUseCase(repo, cache) }
}

describe('GetProductUseCase', () => {
  it('devuelve un producto activo al público', async () => {
    const { uc } = await preparar()
    await expect(uc.execute('borrador')).resolves.toMatchObject({ slug: 'borrador' })
  })

  it('un producto desactivado responde como inexistente para el público', async () => {
    const { repo, p, uc } = await preparar()
    await repo.update(p.id, { isActive: false })
    await expect(uc.execute('borrador')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('el admin sí ve el producto desactivado', async () => {
    const { repo, p, uc } = await preparar()
    await repo.update(p.id, { isActive: false })
    await expect(uc.execute('borrador', { includeInactive: true })).resolves.toMatchObject({ isActive: false })
  })

  it('la caché no se salta la regla: lo cacheado por el admin no se filtra al público', async () => {
    const { repo, p, uc } = await preparar()
    await repo.update(p.id, { isActive: false })
    await uc.execute('borrador', { includeInactive: true })
    await expect(uc.execute('borrador')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('un slug que no existe da NotFoundError', async () => {
    const { uc } = await preparar()
    await expect(uc.execute('nada')).rejects.toBeInstanceOf(NotFoundError)
  })
})
