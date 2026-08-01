import { RequestHandler } from 'express'

// Envuelve handlers async para que los errores lleguen al middleware central
// sin repetir try/catch en cada controlador.
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)
