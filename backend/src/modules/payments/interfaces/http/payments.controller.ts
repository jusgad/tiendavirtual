import { Request, Response } from 'express'
import { UnauthorizedError } from '../../../../shared/errors/AppError'
import {
  GetPaymentUseCase,
  HandleWebhookUseCase,
  InitiatePaymentUseCase,
} from '../../application/paymentUseCases'

function userId(req: Request): string {
  if (!req.user) throw new UnauthorizedError()
  return req.user.id
}

export class PaymentsController {
  constructor(
    private readonly initiate: InitiatePaymentUseCase,
    private readonly webhook: HandleWebhookUseCase,
    private readonly getPayment: GetPaymentUseCase,
  ) {}

  create = async (req: Request, res: Response) => {
    const { orderId, method, phone, card } = req.body
    const result = await this.initiate.execute(req.user?.id ?? null, {
      orderId,
      method,
      methodData: { phone, card },
    })
    res.status(201).json(result)
  }

  handleWebhook = async (req: Request, res: Response) => {
    const signature = req.header('x-signature')
    const result = await this.webhook.execute(req.params.provider, req.body, signature)
    res.status(200).json({ received: true, ...result })
  }

  get = async (req: Request, res: Response) => {
    res.json({ payment: await this.getPayment.execute(userId(req), req.params.id) })
  }
}
