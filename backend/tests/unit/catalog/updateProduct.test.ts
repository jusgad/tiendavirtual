import { UpdateProductUseCase } from '../../../src/modules/catalog/application/productUseCases'
import { BadRequestError } from '../../../src/shared/errors/AppError'
import { FakeCatalogCache, InMemoryProductRepository } from './fakes'

async function preparar(precio: number) {
  const repo = new InMemoryProductRepository()
  const p = await repo.create({
    name: 'Borrador',
    slug: 'borrador',
    sku: 'SKU-B',
    description: 'x',
    brandId: 'b',
    categoryId: 'c',
    price: precio,
    stock: 0,
  })
  await repo.update(p.id, { isActive: false })
  return { repo, p, uc: new UpdateProductUseCase(repo, new FakeCatalogCache()) }
}

describe('UpdateProductUseCase', () => {
  it('cambia el precio desde el panel', async () => {
    const { p, uc } = await preparar(89900)
    await expect(uc.execute(p.id, { price: 99900 })).resolves.toMatchObject({ price: 99900 })
  })

  it('no deja activar un producto con precio 0', async () => {
    const { p, uc } = await preparar(0)
    await expect(uc.execute(p.id, { isActive: true })).rejects.toBeInstanceOf(BadRequestError)
  })

  it('sí deja activarlo si el precio llega en la misma petición', async () => {
    const { p, uc } = await preparar(0)
    await expect(uc.execute(p.id, { isActive: true, price: 45000 })).resolves.toMatchObject({ isActive: true })
  })

  it('un borrador sin precio se puede seguir editando mientras siga desactivado', async () => {
    const { p, uc } = await preparar(0)
    await expect(uc.execute(p.id, { name: 'Crema nueva' })).resolves.toMatchObject({ name: 'Crema nueva' })
  })
})
