import { Role } from '@prisma/client'
import {
  CreateUserData,
  DomainUser,
  PasswordHasher,
  PasswordResetRepository,
  RefreshTokenRepository,
  StoredPasswordReset,
  StoredRefreshToken,
  TokenService,
  UserRepository,
  AccessTokenPayload,
} from '../../../src/modules/auth/domain/ports'

let idCounter = 0
const nextId = (prefix: string) => `${prefix}-${++idCounter}`

export class InMemoryUserRepository implements UserRepository {
  users: DomainUser[] = []

  async findByEmail(email: string): Promise<DomainUser | null> {
    return this.users.find((u) => u.email === email.toLowerCase()) ?? null
  }
  async findById(id: string): Promise<DomainUser | null> {
    return this.users.find((u) => u.id === id) ?? null
  }
  async create(data: CreateUserData): Promise<DomainUser> {
    const user: DomainUser = {
      id: nextId('user'),
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? null,
      role: Role.CLIENT,
      ageConfirmed: data.ageConfirmed,
      isActive: true,
    }
    this.users.push(user)
    return user
  }
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const u = this.users.find((x) => x.id === userId)
    if (u) u.passwordHash = passwordHash
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  tokens: StoredRefreshToken[] = []

  async save(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    this.tokens.push({ id: nextId('rt'), revokedAt: null, ...data })
  }
  async findByHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    return this.tokens.find((t) => t.tokenHash === tokenHash) ?? null
  }
  async revoke(id: string): Promise<void> {
    const t = this.tokens.find((x) => x.id === id)
    if (t) t.revokedAt = new Date()
  }
  async revokeAllForUser(userId: string): Promise<void> {
    this.tokens.filter((t) => t.userId === userId && !t.revokedAt).forEach((t) => (t.revokedAt = new Date()))
  }
}

export class InMemoryPasswordResetRepository implements PasswordResetRepository {
  resets: (StoredPasswordReset & { tokenHash: string })[] = []

  async save(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    this.resets.push({ id: nextId('pr'), usedAt: null, ...data })
  }
  async findByHash(tokenHash: string): Promise<StoredPasswordReset | null> {
    return this.resets.find((r) => r.tokenHash === tokenHash) ?? null
  }
  async markUsed(id: string): Promise<void> {
    const r = this.resets.find((x) => x.id === id)
    if (r) r.usedAt = new Date()
  }
}

export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }
  async compare(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`
  }
}

export class FakeTokenService implements TokenService {
  private counter = 0
  signAccessToken(payload: AccessTokenPayload): string {
    return `access:${payload.sub}:${payload.role}`
  }
  generateRefreshToken(): { raw: string; tokenHash: string; expiresAt: Date } {
    const raw = `raw-${++this.counter}`
    return { raw, tokenHash: this.hashToken(raw), expiresAt: new Date(Date.now() + 3_600_000) }
  }
  hashToken(raw: string): string {
    return `h:${raw}`
  }
}
