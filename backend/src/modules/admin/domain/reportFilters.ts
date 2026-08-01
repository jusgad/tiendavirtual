import { BadRequestError } from '../../../shared/errors/AppError'
import { SalesGroupBy } from './ports'

const DEFAULT_RANGE_DAYS = 30
const MAX_TOP_PRODUCTS = 100
const DEFAULT_TOP_PRODUCTS = 10

/**
 * Resuelve el rango de fechas del reporte de ventas: aplica defaults (últimos
 * 30 días) y valida que `from` sea anterior a `to`. Lógica de negocio pura.
 */
export function resolveSalesRange(
  from: Date | undefined,
  to: Date | undefined,
  now: Date = new Date(),
): { from: Date; to: Date } {
  const resolvedTo = to ?? now
  const resolvedFrom = from ?? new Date(resolvedTo.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)
  if (resolvedFrom >= resolvedTo) {
    throw new BadRequestError('"from" debe ser anterior a "to"')
  }
  return { from: resolvedFrom, to: resolvedTo }
}

export function resolveGroupBy(groupBy: SalesGroupBy | undefined): SalesGroupBy {
  return groupBy ?? 'day'
}

/** Aplica el límite por defecto/máximo del listado de productos top. */
export function resolveTopProductsLimit(limit: number | undefined): number {
  if (limit == null) return DEFAULT_TOP_PRODUCTS
  return Math.min(limit, MAX_TOP_PRODUCTS)
}
