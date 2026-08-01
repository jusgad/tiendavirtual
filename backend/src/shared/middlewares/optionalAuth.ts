import { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AccessTokenPayload } from './auth'

// Como authGuard, pero no falla si no hay token: solo adjunta req.user si el
// token es válido. Útil en endpoints que sirven tanto a usuarios como invitados.
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, {
        algorithms: ['HS256'],
      }) as AccessTokenPayload
      req.user = { id: payload.sub, role: payload.role }
    } catch {
      // token inválido/expirado → se trata como invitado
    }
  }
  next()
}
