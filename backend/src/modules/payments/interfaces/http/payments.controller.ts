import { Request, Response } from 'express'
import { UnauthorizedError } from '../../../../shared/errors/AppError'
import {
  GetPaymentUseCase,
  HandleWebhookUseCase,
  StartPaymentUseCase,
} from '../../application/paymentUseCases'

function userId(req: Request): string {
  if (!req.user) throw new UnauthorizedError()
  return req.user.id
}

export class PaymentsController {
  constructor(
    private readonly startPayment: StartPaymentUseCase,
    private readonly webhook: HandleWebhookUseCase,
    private readonly getPayment: GetPaymentUseCase,
  ) {}

  create = async (req: Request, res: Response) => {
    const result = await this.startPayment.execute(req.user?.id ?? null, req.body.orderId)
    res.status(201).json(result)
  }

  // Sin auth de usuario: la confianza viene del checksum del propio evento.
  handleWebhook = async (req: Request, res: Response) => {
    const result = await this.webhook.execute(req.body)
    res.status(200).json({ received: true, ...result })
  }

  get = async (req: Request, res: Response) => {
    res.json({ payment: await this.getPayment.execute(userId(req), req.params.id) })
  }
}
