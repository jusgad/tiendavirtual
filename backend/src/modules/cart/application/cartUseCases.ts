import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/AppError'
import {
  CartProductGateway,
  CartStore,
  CartView,
} from '../domain/ports'

/** Construye la vista enriquecida del carrito (precios, totales, stock). */
export async function buildCartView(
  store: CartStore,
  products: CartProductGateway,
): Promise<CartView> {
  const lines = await store.getItems()
  if (lines.length === 0) return { items: [], subtotal: 0, itemCount: 0 }

  const infos = await products.findManyByIds(lines.map((l) => l.productId))
  const byId = new Map(infos.map((p) => [p.id, p]))

  const items = lines
    .map((line) => {
      const p = byId.get(line.productId)
      if (!p || !p.isActive) return null // ignora productos inexistentes/inactivos
      return {
        productId: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        quantity: line.quantity,
        lineTotal: p.price * line.quantity,
        image: p.image,
        stock: p.stock,
        inStock: p.stock >= line.quantity,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const subtotal = items.reduce((acc, i) => acc + i.lineTotal, 0)
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0)
  return { items, subtotal, itemCount }
}

export class GetCartUseCase {
  constructor(private readonly products: CartProductGateway) {}
  execute(store: CartStore): Promise<CartView> {
    return buildCartView(store, this.products)
  }
}

export class AddItemUseCase {
  constructor(private readonly products: CartProductGateway) {}

  async execute(store: CartStore, productId: string, quantity: number): Promise<CartView> {
    const product = await this.products.findById(productId)
    if (!product || !product.isActive) throw new NotFoundError('Producto no disponible')

    const items = await store.getItems()
    const existing = items.find((i) => i.productId === productId)
    const newQty = (existing?.quantity ?? 0) + quantity

    if (newQty > product.stock) {
      throw new ConflictError(`Stock insuficiente: quedan ${product.stock} unidades`)
    }

    await store.setItem(productId, newQty)
    return buildCartView(store, this.products)
  }
}

export class UpdateItemUseCase {
  constructor(private readonly products: CartProductGateway) {}

  async execute(store: CartStore, productId: string, quantity: number): Promise<CartView> {
    if (quantity <= 0) {
      await store.removeItem(productId)
      return buildCartView(store, this.products)
    }

    const product = await this.products.findById(productId)
    if (!product || !product.isActive) throw new NotFoundError('Producto no disponible')
    if (quantity > product.stock) {
      throw new ConflictError(`Stock insuficiente: quedan ${product.stock} unidades`)
    }

    await store.setItem(productId, quantity)
    return buildCartView(store, this.products)
  }
}

export class RemoveItemUseCase {
  constructor(private readonly products: CartProductGateway) {}
  async execute(store: CartStore, productId: string): Promise<CartView> {
    await store.removeItem(productId)
    return buildCartView(store, this.products)
  }
}

export class ClearCartUseCase {
  async execute(store: CartStore): Promise<CartView> {
    await store.clear()
    return { items: [], subtotal: 0, itemCount: 0 }
  }
}

/** Fusiona el carrito de invitado en el del usuario al iniciar sesión. */
export class MergeGuestCartUseCase {
  constructor(private readonly products: CartProductGateway) {}

  async execute(userStore: CartStore, guestStore: CartStore): Promise<CartView> {
    const [guestItems, userItems] = await Promise.all([guestStore.getItems(), userStore.getItems()])
    const userMap = new Map(userItems.map((i) => [i.productId, i.quantity]))

    for (const g of guestItems) {
      const product = await this.products.findById(g.productId)
      if (!product || !product.isActive) continue
      const merged = (userMap.get(g.productId) ?? 0) + g.quantity
      // no exceder el stock disponible
      await userStore.setItem(g.productId, Math.min(merged, product.stock))
    }

    if (guestItems.length > 0) {
      // BadRequest defensivo: si el guest store no soporta clear, no rompe el flujo
      try {
        await guestStore.clear()
      } catch {
        throw new BadRequestError('No se pudo vaciar el carrito de invitado')
      }
    }

    return buildCartView(userStore, this.products)
  }
}
