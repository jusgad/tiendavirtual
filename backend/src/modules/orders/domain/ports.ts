import { CouponData } from './pricing'
import { OrderStatus } from './orderStatus'

export interface OrderProductInfo {
  id: string
  name: string
  price: number
  stock: number
  isActive: boolean
}

/** Datos de producto necesarios para armar y validar el pedido. */
export interface OrderProductGateway {
  findManyByIds(ids: string[]): Promise<OrderProductInfo[]>
}

/** Identifica el dueño del carrito/pedido: un usuario registrado o un invitado. */
export type CartOwner = { type: 'user'; id: string } | { type: 'guest'; id: string }

/** Lectura/limpieza del carrito (DB para usuario, Redis para invitado) para el checkout. */
export interface CartGateway {
  getItems(owner: CartOwner): Promise<{ productId: string; quantity: number }[]>
  clear(owner: CartOwner): Promise<void>
}

/** Acceso a cupones para el checkout. */
export interface CouponGateway {
  findByCode(code: string): Promise<CouponData | null>
  countUserRedemptions(couponId: string, userId: string): Promise<number>
}

export interface AddressSnapshot {
  fullName: string
  phone: string
  line1: string
  line2: string | null
  city: string
  department: string
  postalCode: string | null
}

export interface Address extends AddressSnapshot {
  id: string
  userId: string
  country: string
  isDefault: boolean
}

export interface AddressRepository {
  listByUser(userId: string): Promise<Address[]>
  findByIdForUser(id: string, userId: string): Promise<Address | null>
  create(userId: string, data: AddressSnapshot & { isDefault?: boolean }): Promise<Address>
  update(id: string, userId: string, data: Partial<AddressSnapshot & { isDefault: boolean }>): Promise<Address>
  delete(id: string, userId: string): Promise<void>
}

export interface OrderItemSnapshot {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface AppliedCoupon {
  id: string
  maxUses: number | null
  perUserLimit: number | null
}

export interface PlaceOrderData {
  userId: string | null // null = pedido de invitado
  guestEmail: string | null
  orderNumber: string
  items: OrderItemSnapshot[]
  subtotal: number
  discountTotal: number
  shippingTotal: number
  total: number
  coupon: AppliedCoupon | null
  discreetPackaging: boolean
  addressId: string | null
  address: AddressSnapshot
}

export interface OrderView {
  id: string
  orderNumber: string
  status: OrderStatus
  subtotal: number
  discountTotal: number
  shippingTotal: number
  total: number
  currency: string
  discreetPackaging: boolean
  items: OrderItemSnapshot[]
  shipping: AddressSnapshot
  createdAt: Date
}

export interface OrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  total: number
  createdAt: Date
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * Vista pública de seguimiento. Deliberadamente MÁS POBRE que `OrderView`:
 * este endpoint no exige sesión, así que solo expone lo imprescindible para
 * que el cliente sepa en qué va su pedido. Sin dirección completa, sin
 * teléfono, sin datos de pago y sin ids internos.
 */
export interface OrderTrackingView {
  orderNumber: string
  status: OrderStatus
  total: number
  currency: string
  /** Solo la ciudad de destino: suficiente para reconocer el pedido. */
  shipCity: string | null
  items: { productName: string; quantity: number; lineTotal: number }[]
  createdAt: Date
}

export interface OrderRepository {
  /** Transacción atómica: descuenta stock (con guarda), crea el pedido + ítems,
   *  registra el canje del cupón y vacía el carrito del usuario. */
  place(data: PlaceOrderData): Promise<OrderView>
  listByUser(userId: string, page: number, pageSize: number): Promise<Paginated<OrderSummary>>
  findByIdForUser(id: string, userId: string): Promise<OrderView | null>
  /** Transacción: restaura stock y marca CANCELLED (solo si el estado lo permite). */
  cancel(id: string, userId: string): Promise<OrderView>
  /**
   * Búsqueda para el seguimiento público. Exige que el correo coincida con el
   * del pedido (`guestEmail` o el del usuario dueño): el número de pedido por
   * sí solo nunca basta.
   */
  findForTracking(orderNumber: string, email: string): Promise<OrderTrackingView | null>
}

/**
 * Puerto mínimo (segregado) para avisar que el caché de catálogo quedó
 * desactualizado porque cambió el stock (checkout o cancelación). `orders` no
 * necesita saber cómo se cachea el catálogo (Redis, versión de namespace,
 * TTLs, etc.), solo que debe invalidarse; lo implementa infraestructura
 * reutilizando el mismo adaptador que usa el módulo `catalog`.
 */
export interface CatalogCacheInvalidator {
  invalidate(): Promise<void>
}
