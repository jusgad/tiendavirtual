import { LoginUserUseCase } from '../../../src/modules/auth/application/loginUser.usecase'
import { RegisterUserUseCase } from '../../../src/modules/auth/application/registerUser.usecase'
import {
  FakePasswordHasher,
  FakeTokenService,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from './fakes'

function makeEnv() {
  const users = new InMemoryUserRepository()
  const refresh = new InMemoryRefreshTokenRepository()
  const hasher = new FakePasswordHasher()
  const tokens = new FakeTokenService()
  const register = new RegisterUserUseCase(users, hasher, tokens, refresh)
  const login = new LoginUserUseCase(users, hasher, tokens, refresh)
  return { users, refresh, register, login }
}

const creds = {
  email: 'ana@test.com',
  password: 'Password1',
  firstName: 'Ana',
  lastName: 'Díaz',
  ageConfirmed: true as const,
}

describe('LoginUserUseCase', () => {
  it('inicia sesión con credenciales válidas y emite tokens', async () => {
    const { register, login } = makeEnv()
    await register.execute(creds)

    const result = await login.execute({ email: creds.email, password: creds.password })

    expect(result.user.email).toBe('ana@test.com')
    expect(result.tokens.accessToken).toContain('access:')
  })

  it('rechaza con 401 si la contraseña es incorrecta', async () => {
    const { register, login } = makeEnv()
    await register.execute(creds)
    await expect(login.execute({ email: creds.email, password: 'wrong' })).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('rechaza con 401 si el usuario no existe', async () => {
    const { login } = makeEnv()
    await expect(login.execute({ email: 'nope@test.com', password: 'x' })).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('rechaza con 403 si la cuenta está desactivada', async () => {
    const { users, register, login } = makeEnv()
    await register.execute(creds)
    users.users[0].isActive = false
    await expect(login.execute({ email: creds.email, password: creds.password })).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})
