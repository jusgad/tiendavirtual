import { RequestHandler } from 'express'
import { ZodError, ZodTypeAny } from 'zod'
import { BadRequestError } from '../errors/AppError'

type Schemas = {
  body?: ZodTypeAny
  query?: ZodTypeAny
  params?: ZodTypeAny
}

/**
 * Middleware de validación con Zod. Valida body/query/params y reemplaza cada
 * uno por la versión parseada (con defaults/coerciones aplicadas).
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) req.query = schemas.query.parse(req.query) as typeof req.query
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        next(new BadRequestError('Datos de entrada inválidos', err.flatten()))
      } else {
        next(err)
      }
    }
  }
