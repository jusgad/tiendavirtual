import { Request, Response } from 'express'
import { UnauthorizedError } from '../../../../shared/errors/AppError'
import { IncomingPaymentEvent } from '../../domain/ports'
import {
  GetPaymentUseCase,
  HandleWebhookUseCase,
  StartPaymentUseCase,
} from '../../application/paymentUseCases'

function userId(req: Request): string {
  if (!req.user) throw new UnauthorizedError()
  return req.user.id
}

/** Primera cabecera, cuando Express entrega un array por venir repetida. */
function cabecera(req: Request, nombre: string): string | null {
  const valor = req.headers[nombre]
  if (Array.isArray(valor)) return valor[0] ?? null
  return valor ?? null
}

/**
 * Traduce la petición HTTP al evento que espera el dominio.
 *
 * Mercado Pago reparte los datos que firma entre la query string (`data.id`),
 * dos cabeceras y el cuerpo. Juntarlos es trabajo de esta capa: el caso de uso
 * recibe un objeto y no sabe que existe Express.
 */
function eventoEntrante(req: Request): IncomingPaymentEvent {
  const query = req.query as Record<string, unknown>
  // Express expone `?data.id=123` como la clave literal `data.id`. Algunos
  // avisos antiguos la mandan como `id` a secas.
  const dataId = query['data.id'] ?? query.id
  const tipo = query.type ?? query.topic
  return {
    body: req.body,
    signatureHeader: cabecera(req, 'x-signature'),
    requestId: cabecera(req, 'x-request-id'),
    queryDataId: typeof dataId === 'string' ? dataId : null,
    queryType: typeof tipo === 'string' ? tipo : null,
  }
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

  // Sin auth de usuario: la confianza viene de la firma del propio aviso.
  handleWebhook = async (req: Request, res: Response) => {
    const result = await this.webhook.execute(eventoEntrante(req))
    res.status(200).json({ received: true, ...result })
  }

  get = async (req: Request, res: Response) => {
    res.json({ payment: await this.getPayment.execute(userId(req), req.params.id) })
  }
}
