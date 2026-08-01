import { RegisterUserUseCase } from '../../../src/modules/auth/application/registerUser.usecase'
import { AppError } from '../../../src/shared/errors/AppError'
import {
  FakePasswordHasher,
  FakeTokenService,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from './fakes'

function makeUseCase() {
  const users = new InMemoryUserRepository()
  const refresh = new InMemoryRefreshTokenRepository()
  const useCase = new RegisterUserUseCase(users, new FakePasswordHasher(), new FakeTokenService(), refresh)
  return { users, refresh, useCase }
}

const baseInput = {
  email: 'Cliente@Test.com',
  password: 'Password1',
  firstName: 'Ana',
  lastName: 'Díaz',
  ageConfirmed: true as const,
}

describe('RegisterUserUseCase', () => {
  it('registra un usuario, hashea la contraseña y emite tokens', async () => {
    const { users, refresh, useCase } = makeUseCase()

    const result = await useCase.execute(baseInput)

    expect(result.user.email).toBe('cliente@test.com') // normalizado a minúsculas
    expect(result.user).not.toHaveProperty('passwordHash') // no se filtra el hash
    expect(result.tokens.accessToken).toContain('access:')
    expect(result.tokens.refreshToken).toBeTruthy()
    expect(users.users[0].passwordHash).toBe('hashed:Password1')
    expect(refresh.tokens).toHaveLength(1) // se persistió el refresh token
  })

  it('rechaza el registro si no se confirma la mayoría de edad', async () => {
    const { useCase } = makeUseCase()
    await expect(
      useCase.execute({ ...baseInput, ageConfirmed: false as unknown as true }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('rechaza correos duplicados con conflicto (409)', async () => {
    const { useCase } = makeUseCase()
    await useCase.execute(baseInput)
    await expect(useCase.execute(baseInput)).rejects.toMatchObject({ statusCode: 409 })
  })
})
