import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { AccessTokenPayload, TokenService } from '../domain/ports'

/** Convierte "15m" / "7d" / "30s" / "12h" a milisegundos. */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim())
  if (!match) throw new Error(`Duración inválida: ${value}`)
  const amount = Number(match[1])
  const unit = match[2]
  const factors: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }
  return amount * factors[unit]
}

export interface JwtConfig {
  accessSecret: string
  accessTtl: string // p.ej. "15m"
  refreshTtl: string // p.ej. "7d"
}

export class JwtTokenService implements TokenService {
  constructor(private readonly config: JwtConfig) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign({ role: payload.role }, this.config.accessSecret, {
      subject: payload.sub,
      expiresIn: this.config.accessTtl,
    } as jwt.SignOptions)
  }

  generateRefreshToken(): { raw: string; tokenHash: string; expiresAt: Date } {
    const raw = crypto.randomBytes(48).toString('hex')
    return {
      raw,
      tokenHash: this.hashToken(raw),
      expiresAt: new Date(Date.now() + parseDurationMs(this.config.refreshTtl)),
    }
  }

  hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex')
  }
}
