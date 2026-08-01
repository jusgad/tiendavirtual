import { BadRequestError, ConflictError } from '../../../shared/errors/AppError'
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

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  ageConfirmed: boolean
}

export class RegisterUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async execute(input: RegisterInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    // Verificación de edad: declaración obligatoria "soy mayor de 18".
    if (!input.ageConfirmed) {
      throw new BadRequestError('Debes confirmar que eres mayor de 18 años para registrarte')
    }

    const existing = await this.users.findByEmail(input.email)
    if (existing) {
      throw new ConflictError('Ya existe una cuenta con ese correo')
    }

    const passwordHash = await this.hasher.hash(input.password)
    const user = await this.users.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? null,
      ageConfirmed: input.ageConfirmed,
    })

    const tokens = await issueTokens(user, this.tokens, this.refreshTokens)
    return { user: toSafeUser(user), tokens }
  }
}
