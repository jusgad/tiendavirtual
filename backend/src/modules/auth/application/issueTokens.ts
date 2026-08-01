import {
  AuthTokens,
  DomainUser,
  RefreshTokenRepository,
  TokenService,
} from '../domain/ports'

// Lógica compartida por registro/login/refresh: firma el access token y crea
// y persiste (hasheado) un refresh token nuevo.
export async function issueTokens(
  user: DomainUser,
  tokenService: TokenService,
  refreshTokens: RefreshTokenRepository,
): Promise<AuthTokens> {
  const accessToken = tokenService.signAccessToken({ sub: user.id, role: user.role })
  const { raw, tokenHash, expiresAt } = tokenService.generateRefreshToken()
  await refreshTokens.save({ userId: user.id, tokenHash, expiresAt })
  return { accessToken, refreshToken: raw }
}
