import { UnauthorizedError } from '../../../shared/errors/AppError'
import {
  AuthTokens,
  RefreshTokenRepository,
  TokenService,
  UserRepository,
} from '../domain/ports'
import { issueTokens } from './issueTokens'

/** Rota el refresh token: revoca el usado y emite un par nuevo. */
export class RefreshTokensUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(rawRefreshToken: string): Promise<{ tokens: AuthTokens }> {
    const hash = this.tokens.hashToken(rawRefreshToken)
    const stored = await this.refreshTokens.findByHash(hash)

    if (!stored || stored.revokedAt || stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedError('Refresh token inválido o expirado')
    }

    const user = await this.users.findById(stored.userId)
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Refresh token inválido o expirado')
    }

    // Rotación: el token usado ya no sirve.
    await this.refreshTokens.revoke(stored.id)
    const tokens = await issueTokens(user, this.tokens, this.refreshTokens)
    return { tokens }
  }
}

/** Cierra sesión revocando el refresh token entregado. Idempotente. */
export class LogoutUseCase {
  constructor(
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(rawRefreshToken: string): Promise<void> {
    const hash = this.tokens.hashToken(rawRefreshToken)
    const stored = await this.refreshTokens.findByHash(hash)
    if (stored && !stored.revokedAt) {
      await this.refreshTokens.revoke(stored.id)
    }
  }
}
