import { Request, Response } from 'express'
import { GetOrdersByStatusUseCase, GetSalesReportUseCase, GetTopProductsUseCase } from '../../application/reportUseCases'

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
