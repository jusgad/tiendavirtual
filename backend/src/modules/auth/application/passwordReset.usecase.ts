import { BadRequestError } from '../../../shared/errors/AppError'
import {
  PasswordHasher,
  PasswordResetNotifier,
  PasswordResetRepository,
  RefreshTokenRepository,
  TokenService,
  UserRepository,
} from '../domain/ports'

/**
 * Solicita recuperación de contraseña. Por seguridad NO revela si el correo
 * existe: el controlador responde siempre lo mismo, exista o no.
 *
 * El envío ocurre aquí dentro, no en el controlador. Antes el token se
 * devolvía y el controlador solo lo exponía fuera de producción, así que en la
 * tienda real la recuperación simplemente no funcionaba: se generaba un token
 * que nadie recibía nunca.
 */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
    private readonly resets: PasswordResetRepository,
    private readonly ttlMinutes: number,
    private readonly notifier: PasswordResetNotifier,
  ) {}

  async execute(email: string): Promise<{ rawToken: string; userId: string } | null> {
    const user = await this.users.findByEmail(email)
    if (!user) return null

    const raw = this.tokens.generateRefreshToken().raw // token opaco de un solo uso
    const tokenHash = this.tokens.hashToken(raw)
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000)
    await this.resets.save({ userId: user.id, tokenHash, expiresAt })

    await this.notifier.passwordReset({
      to: user.email,
      rawToken: raw,
      minutosDeVigencia: this.ttlMinutes,
    })

    return { rawToken: raw, userId: user.id }
  }
}

/** Restablece la contraseña con un token válido e invalida sesiones activas. */
export class ResetPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly resets: PasswordResetRepository,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(rawToken: string, newPassword: string): Promise<void> {
    const hash = this.tokens.hashToken(rawToken)
    const stored = await this.resets.findByHash(hash)

    if (!stored || stored.usedAt || stored.expiresAt.getTime() < Date.now()) {
      throw new BadRequestError('Token de recuperación inválido o expirado')
    }

    const passwordHash = await this.hasher.hash(newPassword)
    await this.users.updatePassword(stored.userId, passwordHash)
    await this.resets.markUsed(stored.id)
    // Fuerza cerrar todas las sesiones tras cambiar la contraseña.
    await this.refreshTokens.revokeAllForUser(stored.userId)
  }
}
