import { Request, Response } from 'express'
import { GetOrdersByStatusUseCase, GetSalesReportUseCase, GetTopProductsUseCase } from '../../application/reportUseCases'
import {
  GetOrderUseCase,
  ListOrdersUseCase,
  UpdateOrderStatusUseCase,
} from '../../application/orderAdminUseCases'
import { OrderStatus } from '../../domain/orderStatus'
import { allowedTransitionsFrom } from '../../domain/orderTransitions'

export class AdminReportsController {
  constructor(
    private readonly getSalesReport: GetSalesReportUseCase,
    private readonly getTopProducts: GetTopProductsUseCase,
    private readonly getOrdersByStatus: GetOrdersByStatusUseCase,
  ) {}

  sales = async (req: Request, res: Response) => {
    const { from, to, groupBy } = req.query as unknown as { from?: Date; to?: Date; groupBy?: 'day' | 'month' }
    res.json(await this.getSalesReport.execute(from, to, groupBy))
  }

  topProducts = async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as { limit?: number }
    res.json({ products: await this.getTopProducts.execute(limit) })
  }

  ordersByStatus = async (_req: Request, res: Response) => {
    res.json({ statuses: await this.getOrdersByStatus.execute() })
  }
}

export class AdminOrdersController {
  constructor(
    private readonly listOrders: ListOrdersUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly updateStatus: UpdateOrderStatusUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    const { status, page, pageSize } = req.query as unknown as {
      status?: OrderStatus
      page: number
      pageSize: number
    }
    res.json(await this.listOrders.execute(status, page, pageSize))
  }

  get = async (req: Request, res: Response) => {
    const order = await this.getOrder.execute(req.params.id)
    // Se expone qué transiciones caben desde el estado actual: evita que el
    // panel tenga que duplicar la regla de negocio para pintar los botones.
    res.json({ order, allowedTransitions: allowedTransitionsFrom(order.status) })
  }

  updateOrderStatus = async (req: Request, res: Response) => {
    const { status, carrier, trackingNumber } = req.body as {
      status: OrderStatus
      carrier?: string
      trackingNumber?: string
    }

    // Se pasa el objeto en cuanto llega CUALQUIERA de los dos campos: así el
    // dominio puede rechazar un despacho a medias en vez de ignorarlo.
    const shipment = carrier || trackingNumber ? { carrier: carrier!, trackingNumber: trackingNumber! } : undefined

    const order = await this.updateStatus.execute(req.params.id, status, shipment)
    res.json({ order, allowedTransitions: allowedTransitionsFrom(order.status) })
  }
}
