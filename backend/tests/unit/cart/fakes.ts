import { CartLine, CartProductGateway, CartProductInfo, CartStore } from '../../../src/modules/cart/domain/ports'

export class InMemoryCartStore implements CartStore {
  constructor(public lines: CartLine[] = []) {}
  async getItems(): Promise<CartLine[]> {
    return this.lines.map((l) => ({ ...l }))
  }
  async setItem(productId: string, quantity: number): Promise<void> {
    const existing = this.lines.find((l) => l.productId === productId)
    if (existing) existing.quantity = quantity
    else this.lines.push({ productId, quantity })
  }
  async removeItem(productId: string): Promise<void> {
    this.lines = this.lines.filter((l) => l.productId !== productId)
  }
  async clear(): Promise<void> {
    this.lines = []
  }
}

export class FakeProductGateway implements CartProductGateway {
  constructor(private readonly products: CartProductInfo[]) {}
  async findById(productId: string): Promise<CartProductInfo | null> {
    return this.products.find((p) => p.id === productId) ?? null
  }
  async findManyByIds(ids: string[]): Promise<CartProductInfo[]> {
    return this.products.filter((p) => ids.includes(p.id))
  }
}

export const product = (over: Partial<CartProductInfo> & { id: string }): CartProductInfo => ({
  name: 'Producto',
  slug: 'producto',
  price: 10000,
  stock: 10,
  isActive: true,
  image: null,
  ...over,
})
