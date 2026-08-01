import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { env } from '../../shared/config/env'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard } from '../../shared/middlewares/auth'
import { authRateLimiter } from '../../shared/middlewares/rateLimit'

import { BcryptPasswordHasher } from './infrastructure/bcryptPasswordHasher'
import { JwtTokenService } from './infrastructure/jwtTokenService'
import { PrismaUserRepository } from './infrastructure/prismaUserRepository'
import { PrismaRefreshTokenRepository } from './infrastructure/prismaRefreshTokenRepository'
import { PrismaPasswordResetRepository } from './infrastructure/prismaPasswordResetRepository'

import { RegisterUserUseCase } from './application/registerUser.usecase'
import { LoginUserUseCase } from './application/loginUser.usecase'
import { LogoutUseCase, RefreshTokensUseCase } from './application/tokenFlows.usecase'
import {
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
} from './application/passwordReset.usecase'

import { AuthController } from './interfaces/http/auth.controller'
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  requestResetSchema,
  resetSchema,
} from './interfaces/http/auth.dto'

/**
 * Composición del módulo Auth: instancia adaptadores → repos → casos de uso →
 * controlador, y arma el router. Único lugar donde se "cablea" el módulo.
 */
export function buildAuthModule(prisma: PrismaClient): Router {
  // Infraestructura
  const users = new PrismaUserRepository(prisma)
  const refreshTokens = new PrismaRefreshTokenRepository(prisma)
  const passwordResets = new PrismaPasswordResetRepository(prisma)
  const hasher = new BcryptPasswordHasher(env.BCRYPT_SALT_ROUNDS)
  const tokens = new JwtTokenService({
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
  })

  // Casos de uso
  const controller = new AuthController(
    new RegisterUserUseCase(users, hasher, tokens, refreshTokens),
    new LoginUserUseCase(users, hasher, tokens, refreshTokens),
    new RefreshTokensUseCase(users, tokens, refreshTokens),
    new LogoutUseCase(tokens, refreshTokens),
    new RequestPasswordResetUseCase(users, tokens, passwordResets, env.PASSWORD_RESET_TTL_MIN),
    new ResetPasswordUseCase(users, hasher, tokens, passwordResets, refreshTokens),
  )

  // Rutas
  const router = Router()
  router.post('/register', authRateLimiter, validate({ body: registerSchema }), asyncHandler(controller.register))
  router.post('/login', authRateLimiter, validate({ body: loginSchema }), asyncHandler(controller.login))
  router.post('/refresh', authRateLimiter, validate({ body: refreshSchema }), asyncHandler(controller.refresh))
  router.post('/logout', authRateLimiter, validate({ body: refreshSchema }), asyncHandler(controller.logoutHandler))
  router.post(
    '/forgot-password',
    authRateLimiter,
    validate({ body: requestResetSchema }),
    asyncHandler(controller.forgotPassword),
  )
  router.post(
    '/reset-password',
    authRateLimiter,
    validate({ body: resetSchema }),
    asyncHandler(controller.resetPasswordHandler),
  )
  router.get('/me', authGuard, asyncHandler(controller.me))

  return router
}
