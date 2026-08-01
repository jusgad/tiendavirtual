import { ForbiddenError, UnauthorizedError } from '../../../shared/errors/AppError'
import {
  AuthTokens,
  PasswordHasher,
  RefreshTokenRepository,
  SafeUser,
  TokenService,
  UserRepository,
  toSafeUser,
} from '../domain/ports'
import { issueTokens } from './issueTokens'

export interface LoginInput {
  email: string
  password: string
}

export class LoginUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await this.users.findByEmail(input.email)

    if (!user) {
      // Gasta un tiempo de hashing equivalente para no filtrar por timing si el
      // correo existe o no (mitiga enumeración de usuarios). Mensaje genérico.
      await this.hasher.hash(input.password)
      throw new UnauthorizedError('Credenciales inválidas')
    }

    const passwordOk = await this.hasher.compare(input.password, user.passwordHash)
    if (!passwordOk) throw new UnauthorizedError('Credenciales inválidas')

    if (!user.isActive) throw new ForbiddenError('La cuenta está desactivada')

    const tokens = await issueTokens(user, this.tokens, this.refreshTokens)
    return { user: toSafeUser(user), tokens }
  }
}
