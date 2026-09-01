import { Role } from './role'

// -------- Entidades de dominio (independientes de Prisma) --------

export interface DomainUser {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone: string | null
  role: Role
  ageConfirmed: boolean
  isActive: boolean
}

export interface CreateUserData {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone?: string | null
  ageConfirmed: boolean
}

export interface StoredRefreshToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
}

export interface StoredPasswordReset {
  id: string
  userId: string
  expiresAt: Date
  usedAt: Date | null
}

export interface AccessTokenPayload {
  sub: string
  role: Role
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// -------- Puertos (interfaces implementadas por infraestructura) --------

export interface UserRepository {
  findByEmail(email: string): Promise<DomainUser | null>
  findById(id: string): Promise<DomainUser | null>
  create(data: CreateUserData): Promise<DomainUser>
  updatePassword(userId: string, passwordHash: string): Promise<void>
}

export interface RefreshTokenRepository {
  save(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>
  findByHash(tokenHash: string): Promise<StoredRefreshToken | null>
  revoke(id: string): Promise<void>
  revokeAllForUser(userId: string): Promise<void>
}

export interface PasswordResetRepository {
  save(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>
  findByHash(tokenHash: string): Promise<StoredPasswordReset | null>
  markUsed(id: string): Promise<void>
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>
  compare(plain: string, hash: string): Promise<boolean>
}

export interface TokenService {
  signAccessToken(payload: AccessTokenPayload): string
  /** Genera un refresh token opaco (rotación); se guarda solo el hash. */
  generateRefreshToken(): { raw: string; tokenHash: string; expiresAt: Date }
  hashToken(raw: string): string
}

/** Vista pública del usuario (sin passwordHash). */
export type SafeUser = Omit<DomainUser, 'passwordHash'>

export function toSafeUser(user: DomainUser): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user
  return safe
}

/**
 * Entrega del enlace de recuperación de contraseña.
 *
 * Vive detrás de un puerto porque el caso de uso no puede saber cómo se
 * entrega: hoy es un correo, y antes era exponer el token en la respuesta HTTP
 * (que solo servía en desarrollo y dejaba la función rota en producción).
 *
 * No lanza: si el envío falla, la respuesta al usuario debe seguir siendo la
 * misma genérica de siempre. Un error aquí revelaría, por diferencia de
 * comportamiento, que el correo sí existe.
 */
export interface PasswordResetNotifier {
  passwordReset(data: { to: string; rawToken: string; minutosDeVigencia: number }): Promise<void>
}
