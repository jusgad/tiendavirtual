import { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { ForbiddenError, UnauthorizedError } from '../errors/AppError'
import { SharedRole } from '../types/express'

export interface AccessTokenPayload {
  sub: string // user id
  role: SharedRole
}

/** Exige un access token válido en el header Authorization: Bearer <token>. */
export const authGuard: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Falta el token de acceso'))
  }
  const token = header.slice('Bearer '.length)
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'], // evita confusión de algoritmo / tokens "alg: none"
    }) as AccessTokenPayload
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    next(new UnauthorizedError('Token de acceso inválido o expirado'))
  }
}

/** Restringe una ruta a determinados roles. Debe ir después de authGuard. */
export const roleGuard =
  (...roles: SharedRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new UnauthorizedError())
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('No tienes permisos para esta acción'))
    }
    next()
  }
