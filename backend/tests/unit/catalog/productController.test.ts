import { Request, Response } from 'express'
import { ProductController } from '../../../src/modules/catalog/interfaces/http/catalog.controllers'
import { productListQuerySchema } from '../../../src/modules/catalog/interfaces/http/catalog.dto'
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
} from '../../../src/modules/catalog/application/productUseCases'
import {
  FakeCatalogCache,
  InMemoryBrandRepository,
  InMemoryCategoryRepository,
  InMemoryProductRepository,
} from './fakes'

// `ProductController.list` es exactamente la capa que arregla que el panel
// pueda ver productos desactivados: decide `activeOnly` combinando
// `includeInactive` con `req.user?.role`. Estas pruebas construyen un
// controlador real (con sus 5 casos de uso reales sobre los fakes en memoria
// que ya usa este directorio) y espían `repo.list` para capturar el filtro
// exacto que le llega, sin inventar ninguna API de fake nueva.
function makeController() {
  const products = new InMemoryProductRepository()
  const brands = new InMemoryBrandRepository()
  const categories = new InMemoryCategoryRepository()
  const cache = new FakeCatalogCache()
  const controller = new ProductController(
    new ListProductsUseCase(products, cache),
    new GetProductUseCase(products, cache),
    new CreateProductUseCase(products, brands, categories, cache),
    new UpdateProductUseCase(products, cache),
    new DeleteProductUseCase(products, cache),
  )
  const listSpy = jest.spyOn(products, 'list')
  return { controller, listSpy }
}

// `rawQuery` simula lo que llega en `req.query` desde HTTP (todo strings) y
// se pasa por el mismo schema que usa la ruta real (`validate`), para que el
// test cubra también la coerción de `includeInactive` — no solo la lógica
// del controlador.
function makeReq(rawQuery: Record<string, string>, user?: { id: string; role: 'CLIENT' | 'ADMIN' }): Request {
  const query = productListQuerySchema.parse(rawQuery)
  return { query, user } as unknown as Request
}

function makeRes(): Response {
  return { json: jest.fn() } as unknown as Response
}

describe('ProductController.list · includeInactive solo para ADMIN', () => {
  it('visitante sin sesión con includeInactive=true → activeOnly true', async () => {
    const { controller, listSpy } = makeController()

    await controller.list(makeReq({ includeInactive: 'true' }), makeRes())

    expect(listSpy.mock.calls[0][0]).toMatchObject({ activeOnly: true })
  })

  it('CLIENT autenticado con includeInactive=true → activeOnly true', async () => {
    const { controller, listSpy } = makeController()

    await controller.list(makeReq({ includeInactive: 'true' }, { id: 'u1', role: 'CLIENT' }), makeRes())

    expect(listSpy.mock.calls[0][0]).toMatchObject({ activeOnly: true })
  })

  it('ADMIN con includeInactive=true → activeOnly false (ve también los inactivos)', async () => {
    const { controller, listSpy } = makeController()

    await controller.list(makeReq({ includeInactive: 'true' }, { id: 'u1', role: 'ADMIN' }), makeRes())

    expect(listSpy.mock.calls[0][0]).toMatchObject({ activeOnly: false })
  })

  it('ADMIN sin includeInactive → activeOnly true (comportamiento por defecto no cambia)', async () => {
    const { controller, listSpy } = makeController()

    await controller.list(makeReq({}, { id: 'u1', role: 'ADMIN' }), makeRes())

    expect(listSpy.mock.calls[0][0]).toMatchObject({ activeOnly: true })
  })

  it('ADMIN con includeInactive="false" (string) → activeOnly true', async () => {
    // Este es el caso que fallaría con `z.coerce.boolean()`: Boolean('false')
    // es `true` en JS, así que un ADMIN pidiendo explícitamente que NO le
    // manden inactivos terminaría recibiéndolos igual.
    const { controller, listSpy } = makeController()

    await controller.list(makeReq({ includeInactive: 'false' }, { id: 'u1', role: 'ADMIN' }), makeRes())

    expect(listSpy.mock.calls[0][0]).toMatchObject({ activeOnly: true })
  })
})
