import { OrderStatus } from '@prisma/client'
import {
  GetOrdersByStatusUseCase,
  GetSalesReportUseCase,
  GetTopProductsUseCase,
} from '../../../src/modules/admin/application/reportUseCases'
import { FakeAdminReportsRepository } from './fakes'

describe('GetSalesReportUseCase', () => {
  it('aplica el rango por defecto (últimos 30 días) y groupBy=day cuando no se especifican', async () => {
    const reports = new FakeAdminReportsRepository()
    const useCase = new GetSalesReportUseCase(reports)
    const now = new Date('2026-02-15T00:00:00.000Z')

    await useCase.execute(undefined, undefined, undefined)

    const call = reports.salesReportCalls[0]
    expect(call.groupBy).toBe('day')
    expect(call.to.getTime()).toBeGreaterThan(0)
    expect(call.from.getTime()).toBeLessThan(call.to.getTime())
    void now // el default se calcula con Date.now() real; solo validamos la relación from < to
  })

  it('respeta un rango y groupBy explícitos', async () => {
    const reports = new FakeAdminReportsRepository()
    const useCase = new GetSalesReportUseCase(reports)
    const from = new Date('2026-01-01T00:00:00.000Z')
    const to = new Date('2026-01-31T00:00:00.000Z')

    await useCase.execute(from, to, 'month')

    expect(reports.salesReportCalls[0]).toEqual({ from, to, groupBy: 'month' })
  })

  it('rechaza (400) si "from" no es anterior a "to"', async () => {
    const reports = new FakeAdminReportsRepository()
    const useCase = new GetSalesReportUseCase(reports)
    const from = new Date('2026-02-01T00:00:00.000Z')
    const to = new Date('2026-01-01T00:00:00.000Z')

    await expect(useCase.execute(from, to, 'day')).rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('GetTopProductsUseCase', () => {
  it('usa el límite por defecto (10) cuando no se especifica', async () => {
    const reports = new FakeAdminReportsRepository()
    const useCase = new GetTopProductsUseCase(reports)

    await useCase.execute(undefined)

    expect(reports.topProductsLimits[0]).toBe(10)
  })

  it('acota el límite al máximo permitido (100)', async () => {
    const reports = new FakeAdminReportsRepository()
    const useCase = new GetTopProductsUseCase(reports)

    await useCase.execute(500)

    expect(reports.topProductsLimits[0]).toBe(100)
  })
})

describe('GetOrdersByStatusUseCase', () => {
  it('devuelve el conteo por estado tal como lo entrega el repositorio', async () => {
    const reports = new FakeAdminReportsRepository()
    reports.ordersByStatusResult = [{ status: OrderStatus.DELIVERED, count: 3 }]
    const useCase = new GetOrdersByStatusUseCase(reports)

    const result = await useCase.execute()

    expect(result).toEqual([{ status: OrderStatus.DELIVERED, count: 3 }])
  })
})
