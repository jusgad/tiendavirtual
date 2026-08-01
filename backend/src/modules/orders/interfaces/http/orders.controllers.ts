import { randomUUID } from 'node:crypto'
import { Request, Response } from 'express'
import { UnauthorizedError } from '../../../../shared/errors/AppError'
import { CartOwner } from '../../domain/ports'
import { CheckoutUseCase } from '../../application/checkout.usecase'
import {
  CancelOrderUseCase,
  GetMyOrderUseCase,
  ListMyOrdersUseCase,
} from '../../application/orderQueries.usecase'
import {
  CreateAddressUseCase,
  DeleteAddressUseCase,
  ListAddressesUseCase,
  UpdateAddressUseCase,
} from '../../application/addresses.usecase'

function userId(req: Request): string {
  if (!req.user) throw new UnauthorizedError()
  return req.user.id
}

// Igual que CartController.resolve: acepta solo tokens de invitado con forma
// segura (alfanumérico/guion, acotado); cualquier otra cosa se descarta y se
// genera uno nuevo, para no meter valores arbitrarios del cliente en Redis.
function resolveOwner(req: Request): CartOwner {
  if (req.user) return { type: 'user', id: req.user.id }
  const provided = req.header('x-guest-id')
  const id = provided && /^[A-Za-z0-9-]{1,64}$/.test(provided) ? provided : randomUUID()
  return { type: 'guest', id }
}

export class OrdersController {
  constructor(
    private readonly checkout: CheckoutUseCase,
    private readonly listOrders: ListMyOrdersUseCase,
    private readonly getOrder: GetMyOrderUseCase,
    private readonly cancelOrder: CancelOrderUseCase,
  ) {}

  create = async (req: Request, res: Response) => {
    const owner = resolveOwner(req)
    const order = await this.checkout.execute(owner, req.body)
    res.status(201).json(owner.type === 'guest' ? { order, guestId: owner.id } : { order })
  }

  list = async (req: Request, res: Response) => {
    const { page, pageSize } = req.query as unknown as { page: number; pageSize: number }
    res.json(await this.listOrders.execute(userId(req), page, pageSize))
  }

  get = async (req: Request, res: Response) => {
    res.json({ order: await this.getOrder.execute(userId(req), req.params.id) })
  }

  cancel = async (req: Request, res: Response) => {
    res.json({ order: await this.cancelOrder.execute(userId(req), req.params.id) })
  }
}

export class AddressController {
  constructor(
    private readonly listAddresses: ListAddressesUseCase,
    private readonly createAddress: CreateAddressUseCase,
    private readonly updateAddress: UpdateAddressUseCase,
    private readonly deleteAddress: DeleteAddressUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    res.json({ addresses: await this.listAddresses.execute(userId(req)) })
  }

  create = async (req: Request, res: Response) => {
    res.status(201).json({ address: await this.createAddress.execute(userId(req), req.body) })
  }

  update = async (req: Request, res: Response) => {
    res.json({ address: await this.updateAddress.execute(userId(req), req.params.id, req.body) })
  }

  remove = async (req: Request, res: Response) => {
    await this.deleteAddress.execute(userId(req), req.params.id)
    res.status(204).send()
  }
}
