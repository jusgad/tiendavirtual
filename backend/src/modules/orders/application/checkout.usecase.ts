import { randomBytes } from 'node:crypto'
import { BadRequestError, ConflictError } from '../../../shared/errors/AppError'
import { assertCouponUsable, computeDiscount, computeShipping } from '../domain/pricing'
import {
  AddressRepository,
  AddressSnapshot,
  AppliedCoupon,
  CartGateway,
  CartOwner,
  CatalogCacheInvalidator,
  CouponGateway,
  OrderItemSnapshot,
  OrderNotifier,
  OrderProductGateway,
  OrderRepository,
  OrderView,
} from '../domain/ports'

export interface CheckoutInput {
  addressId?: string
  shippingAddress?: AddressSnapshot
  couponCode?: string
  discreetPackaging?: boolean
  guestEmail?: string
}

export interface ShippingConfig {
  flatRate: number
  freeThreshold: number
}

function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const suffix = randomBytes(3).toString('hex').toUpperCase() // 6 hex
  return `PA-${year}-${suffix}`
}

export class CheckoutUseCase {
  constructor(
    private readonly cart: CartGateway,
    private readonly products: OrderProductGateway,
    private readonly coupons: CouponGateway,
    private readonly addresses: AddressRepository,
    private readonly orders: OrderRepository,
    private readonly config: ShippingConfig,
    private readonly catalogCache: CatalogCacheInvalidator,
    private readonly notifier: OrderNotifier,
  ) {}

  async execute(owner: CartOwner, input: CheckoutInput): Promise<OrderView> {
    if (owner.type === 'guest' && input.addressId) {
      throw new BadRequestError('Un invitado no puede usar una dirección guardada')
    }
    if (owner.type === 'guest' && !input.guestEmail) {
      throw new BadRequestError('Debes indicar un correo de contacto')
    }

    const cartItems = await this.cart.getItems(owner)
    if (cartItems.length === 0) throw new BadRequestError('El carrito está vacío')

    // ---- Validación de stock + snapshots ----
    const prods = await this.products.findManyByIds(cartItems.map((c) => c.productId))
    const byId = new Map(prods.map((p) => [p.id, p]))

    const items: OrderItemSnapshot[] = cartItems.map((ci) => {
      const p = byId.get(ci.productId)
      if (!p || !p.isActive) throw new BadRequestError('Hay un producto no disponible en tu carrito')
      if (p.stock < ci.quantity) throw new ConflictError(`Stock insuficiente para "${p.name}"`)
      return {
        productId: p.id,
        productName: p.name,
        unitPrice: p.price,
        quantity: ci.quantity,
        lineTotal: p.price * ci.quantity,
      }
    })

    const subtotal = items.reduce((acc, i) => acc + i.lineTotal, 0)

    // ---- Cupón (opcional) ----
    let appliedCoupon: AppliedCoupon | null = null
    let discountTotal = 0
    if (input.couponCode) {
      const coupon = await this.coupons.findByCode(input.couponCode)
      if (!coupon) throw new BadRequestError('Cupón no válido')
      // Los invitados no tienen identidad persistente: el límite por usuario no
      // se puede rastrear para ellos, solo aplica el límite global (maxUses).
      const uses = owner.type === 'user' ? await this.coupons.countUserRedemptions(coupon.id, owner.id) : 0
      assertCouponUsable(coupon, subtotal, uses)
      discountTotal = computeDiscount(coupon, subtotal)
      appliedCoupon = { id: coupon.id, maxUses: coupon.maxUses, perUserLimit: coupon.perUserLimit }
    }

    // ---- Dirección de envío ----
    // Se resuelve antes del envío porque el precio del envío depende de la
    // ciudad (gratis en Bogotá, ver `computeShipping`).
    let addressId: string | null = null
    let address: AddressSnapshot
    if (input.addressId && owner.type === 'user') {
      const addr = await this.addresses.findByIdForUser(input.addressId, owner.id)
      if (!addr) throw new BadRequestError('Dirección de envío no válida')
      addressId = addr.id
      address = {
        fullName: addr.fullName,
        phone: addr.phone,
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        department: addr.department,
        postalCode: addr.postalCode,
      }
    } else if (input.shippingAddress) {
      address = input.shippingAddress
    } else {
      throw new BadRequestError('Debes indicar una dirección de envío')
    }

    const net = subtotal - discountTotal
    const shippingTotal = computeShipping(net, this.config.flatRate, this.config.freeThreshold, address.city)
    const total = net + shippingTotal

    const placed = await this.orders.place({
      userId: owner.type === 'user' ? owner.id : null,
      guestEmail: owner.type === 'guest' ? input.guestEmail! : null,
      orderNumber: generateOrderNumber(),
      items,
      subtotal,
      discountTotal,
      shippingTotal,
      total,
      coupon: appliedCoupon,
      discreetPackaging: Boolean(input.discreetPackaging),
      addressId,
      address,
    })

    // El carrito de usuario se vacía atómicamente dentro de la transacción de
    // `place`. El de invitado vive en Redis (fuera de esa transacción), así
    // que se limpia aparte, ya con el pedido creado.
    //
    // Y por eso NO puede tumbar la respuesta: a estas alturas el pedido existe,
    // el stock ya se descontó y el cupón ya se canjeó. Si Redis cayó justo
    // ahora, devolver un error haría creer al cliente que la compra falló, y
    // volvería a comprar. Un carrito que queda con restos es molesto; un pedido
    // fantasma cobrado dos veces, no.
    if (owner.type === 'guest') {
      try {
        await this.cart.clear(owner)
      } catch {
        // Se ignora a propósito: el carrito de invitado caduca solo por TTL.
      }
    }

    // El stock cambió: el caché de catálogo (listados/detalle de producto)
    // queda desactualizado. Se invalida tras confirmar el pedido (nunca antes,
    // para no invalidar si el checkout terminó fallando).
    await this.catalogCache.invalidate()

    // Aviso de "recibimos tu pedido". Va al final y por el mismo motivo que el
    // carrito de invitado: el pedido ya existe y el stock ya se descontó, así
    // que nada de aquí puede tumbar la respuesta. El puerto no lanza.
    // El `try` cubre también la consulta del correo: el notificador promete no
    // lanzar, pero `contactEmail` va a la base de datos y sí podría.
    try {
      const destino = await this.orders.contactEmail(placed.id)
      if (destino) {
        await this.notifier.orderPlaced({
          to: destino,
          orderNumber: placed.orderNumber,
          total: placed.total,
          items: placed.items.map((i) => ({
            productName: i.productName,
            quantity: i.quantity,
            lineTotal: i.lineTotal,
          })),
        })
      }
    } catch {
      // Se ignora a propósito: el adaptador ya deja el fallo en el log y el
      // pedido está cerrado. Ver el comentario del carrito de invitado.
    }

    return placed
  }
}
