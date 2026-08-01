// Línea cruda del carrito (lo que se persiste): producto + cantidad.
export interface CartLine {
  productId: string
  quantity: number
}

/** Abstracción de almacenamiento del carrito: DB (usuario) o Redis (invitado). */
export interface CartStore {
  getItems(): Promise<CartLine[]>
  setItem(productId: string, quantity: number): Promise<void>
  removeItem(productId: string): Promise<void>
  clear(): Promise<void>
}

export interface CartProductInfo {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  isActive: boolean
  image: string | null
}

/** Puerto para consultar datos de producto necesarios para el carrito. */
export interface CartProductGateway {
  findById(productId: string): Promise<CartProductInfo | null>
  findManyByIds(ids: string[]): Promise<CartProductInfo[]>
}

// -------- Vistas devueltas al cliente --------

export interface CartItemView {
  productId: string
  name: string
  slug: string
  price: number
  quantity: number
  lineTotal: number
  image: string | null
  stock: number
  inStock: boolean // stock suficiente para la cantidad pedida
}

export interface CartView {
  items: CartItemView[]
  subtotal: number
  itemCount: number
}
