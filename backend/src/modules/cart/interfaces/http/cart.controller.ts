import { randomUUID } from 'node:crypto'
import { Request, Response } from 'express'
import { UnauthorizedError } from '../../../../shared/errors/AppError'
import { CartStore, CartView } from '../../domain/ports'
import {
  AddItemUseCase,
  ClearCartUseCase,
  GetCartUseCase,
  MergeGuestCartUseCase,
  RemoveItemUseCase,
  UpdateItemUseCase,
} from '../../application/cartUseCases'

export interface CartStoreFactory {
  userStore(userId: string): CartStore
  guestStore(token: string): CartStore
}

/** Resuelve si la petición usa el carrito de usuario (DB) o de invitado (Redis). */
interface Resolution {
  store: CartStore
  guestId?: string
}

export class CartController {
  constructor(
    private readonly stores: CartStoreFactory,
    private readonly getCart: GetCartUseCase,
    private readonly addItem: AddItemUseCase,
    private readonly updateItem: UpdateItemUseCase,
    private readonly removeItem: RemoveItemUseCase,
    private readonly clearCart: ClearCartUseCase,
    private readonly mergeCart: MergeGuestCartUseCase,
  ) {}

  private resolve(req: Request): Resolution {
    if (req.user) return { store: this.stores.userStore(req.user.id) }
    // Acepta solo tokens de invitado con forma segura (alfanumérico/guion, acotado);
    // cualquier otra cosa se descarta y se genera uno nuevo, para no meter valores
    // arbitrarios del cliente en la clave de Redis.
    const provided = req.header('x-guest-id')
    const token = provided && /^[A-Za-z0-9-]{1,64}$/.test(provided) ? provided : randomUUID()
    return { store: this.stores.guestStore(token), guestId: token }
  }

  private send(res: Response, cart: CartView, guestId?: string, status = 200) {
    res.status(status).json(guestId ? { cart, guestId } : { cart })
  }

  get = async (req: Request, res: Response) => {
    const { store, guestId } = this.resolve(req)
    this.send(res, await this.getCart.execute(store), guestId)
  }

  add = async (req: Request, res: Response) => {
    const { store, guestId } = this.resolve(req)
    const cart = await this.addItem.execute(store, req.body.productId, req.body.quantity)
    this.send(res, cart, guestId, 201)
  }

  update = async (req: Request, res: Response) => {
    const { store, guestId } = this.resolve(req)
    const cart = await this.updateItem.execute(store, req.params.productId, req.body.quantity)
    this.send(res, cart, guestId)
  }

  remove = async (req: Request, res: Response) => {
    const { store, guestId } = this.resolve(req)
    this.send(res, await this.removeItem.execute(store, req.params.productId), guestId)
  }

  clear = async (req: Request, res: Response) => {
    const { store, guestId } = this.resolve(req)
    this.send(res, await this.clearCart.execute(store), guestId)
  }

  // Requiere autenticación: fusiona el carrito de invitado en el del usuario.
  merge = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError()
    const userStore = this.stores.userStore(req.user.id)
    const guestStore = this.stores.guestStore(req.body.guestId)
    this.send(res, await this.mergeCart.execute(userStore, guestStore))
  }
}
