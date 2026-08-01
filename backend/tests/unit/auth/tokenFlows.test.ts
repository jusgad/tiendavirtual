import { RegisterUserUseCase } from '../../../src/modules/auth/application/registerUser.usecase'
import { LogoutUseCase, RefreshTokensUseCase } from '../../../src/modules/auth/application/tokenFlows.usecase'
import {
  FakePasswordHasher,
  FakeTokenService,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from './fakes'

function makeEnv() {
  const users = new InMemoryUserRepository()
  const refresh = new InMemoryRefreshTokenRepository()
  const tokens = new FakeTokenService()
  const register = new RegisterUserUseCase(users, new FakePasswordHasher(), tokens, refresh)
  const refreshUC = new RefreshTokensUseCase(users, tokens, refresh)
  const logoutUC = new LogoutUseCase(tokens, refresh)
  return { users, refresh, register, refreshUC, logoutUC }
}

const creds = {
  email: 'ana@test.com',
  password: 'Password1',
  firstName: 'Ana',
  lastName: 'Díaz',
  ageConfirmed: true as const,
}

describe('RefreshTokensUseCase', () => {
  it('rota el refresh token: revoca el usado y emite uno nuevo', async () => {
    const { register, refresh, refreshUC } = makeEnv()
    const { tokens } = await register.execute(creds)

    const result = await refreshUC.execute(tokens.refreshToken)

    expect(result.tokens.refreshToken).not.toBe(tokens.refreshToken)
    // el original quedó revocado
    const original = refresh.tokens.find((t) => t.tokenHash === `h:${tokens.refreshToken}`)
    expect(original?.revokedAt).not.toBeNull()
    expect(refresh.tokens).toHaveLength(2)
  })

  it('rechaza un refresh token ya revocado (reuse detection)', async () => {
    const { register, refreshUC } = makeEnv()
    const { tokens } = await register.execute(creds)
    await refreshUC.execute(tokens.refreshToken) // primer uso: lo revoca
    await expect(refreshUC.execute(tokens.refreshToken)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('rechaza un refresh token inexistente', async () => {
    const { refreshUC } = makeEnv()
    await expect(refreshUC.execute('no-existe')).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('LogoutUseCase', () => {
  it('revoca el refresh token entregado', async () => {
    const { register, refresh, logoutUC } = makeEnv()
    const { tokens } = await register.execute(creds)

    await logoutUC.execute(tokens.refreshToken)

    const stored = refresh.tokens.find((t) => t.tokenHash === `h:${tokens.refreshToken}`)
    expect(stored?.revokedAt).not.toBeNull()
  })

  it('es idempotente con un token inexistente (no lanza)', async () => {
    const { logoutUC } = makeEnv()
    await expect(logoutUC.execute('no-existe')).resolves.toBeUndefined()
  })
})
