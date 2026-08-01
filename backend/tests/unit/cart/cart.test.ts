import {
  AddItemUseCase,
  MergeGuestCartUseCase,
  UpdateItemUseCase,
} from '../../../src/modules/cart/application/cartUseCases'
import { FakeProductGateway, InMemoryCartStore, product } from './fakes'

describe('AddItemUseCase', () => {
  it('agrega un producto y calcula subtotal e itemCount', async () => {
    const gw = new FakeProductGateway([product({ id: 'p1', price: 45900, stock: 10 })])
    const store = new InMemoryCartStore()

    const cart = await new AddItemUseCase(gw).execute(store, 'p1', 2)

    expect(cart.itemCount).toBe(2)
    expect(cart.subtotal).toBe(91800)
    expect(cart.items[0].inStock).toBe(true)
  })

  it('suma cantidades si el producto ya está y valida el stock combinado', async () => {
    const gw = new FakeProductGateway([product({ id: 'p1', stock: 3 })])
    const store = new InMemoryCartStore([{ productId: 'p1', quantity: 2 }])

    await expect(new AddItemUseCase(gw).execute(store, 'p1', 2)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('rechaza (409) si se pide más del stock disponible', async () => {
    const gw = new FakeProductGateway([product({ id: 'p1', stock: 1 })])
    const store = new InMemoryCartStore()
    await expect(new AddItemUseCase(gw).execute(store, 'p1', 5)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('rechaza (404) un producto inexistente o inactivo', async () => {
    const gw = new FakeProductGateway([product({ id: 'p1', isActive: false })])
    const store = new InMemoryCartStore()
    await expect(new AddItemUseCase(gw).execute(store, 'p1', 1)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('UpdateItemUseCase', () => {
  it('quitar el ítem cuando la cantidad es 0', async () => {
    const gw = new FakeProductGateway([product({ id: 'p1' })])
    const store = new InMemoryCartStore([{ productId: 'p1', quantity: 3 }])

    const cart = await new UpdateItemUseCase(gw).execute(store, 'p1', 0)

    expect(cart.items).toHaveLength(0)
  })

  it('rechaza (409) al fijar una cantidad mayor al stock', async () => {
    const gw = new FakeProductGateway([product({ id: 'p1', stock: 2 })])
    const store = new InMemoryCartStore([{ productId: 'p1', quantity: 1 }])
    await expect(new UpdateItemUseCase(gw).execute(store, 'p1', 5)).rejects.toMatchObject({
      statusCode: 409,
    })
  })
})

describe('MergeGuestCartUseCase', () => {
  it('fusiona el carrito de invitado en el del usuario (sumando y respetando stock)', async () => {
    const gw = new FakeProductGateway([
      product({ id: 'p1', stock: 10 }),
      product({ id: 'p2', stock: 1 }),
    ])
    const userStore = new InMemoryCartStore([{ productId: 'p1', quantity: 1 }])
    const guestStore = new InMemoryCartStore([
      { productId: 'p1', quantity: 2 }, // 1 + 2 = 3
      { productId: 'p2', quantity: 5 }, // limitado a stock 1
    ])

    const cart = await new MergeGuestCartUseCase(gw).execute(userStore, guestStore)

    const p1 = cart.items.find((i) => i.productId === 'p1')!
    const p2 = cart.items.find((i) => i.productId === 'p2')!
    expect(p1.quantity).toBe(3)
    expect(p2.quantity).toBe(1) // no supera el stock
    expect((await guestStore.getItems()).length).toBe(0) // guest vaciado
  })
})
