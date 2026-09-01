import { SpyNotifier } from '../shared/notifierFakes'
import { RegisterUserUseCase } from '../../../src/modules/auth/application/registerUser.usecase'
import {
  RequestPasswordResetUseCase,
  ResetPasswordUseCase,
} from '../../../src/modules/auth/application/passwordReset.usecase'
import { LoginUserUseCase } from '../../../src/modules/auth/application/loginUser.usecase'
import {
  FakePasswordHasher,
  FakeTokenService,
  InMemoryPasswordResetRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from './fakes'

function makeEnv() {
  const users = new InMemoryUserRepository()
  const refresh = new InMemoryRefreshTokenRepository()
  const resets = new InMemoryPasswordResetRepository()
  const hasher = new FakePasswordHasher()
  const tokens = new FakeTokenService()
  const register = new RegisterUserUseCase(users, hasher, tokens, refresh)
  const notifier = new SpyNotifier()
  const requestReset = new RequestPasswordResetUseCase(users, tokens, resets, 30, notifier)
  const resetPassword = new ResetPasswordUseCase(users, hasher, tokens, resets, refresh)
  const login = new LoginUserUseCase(users, hasher, tokens, refresh)
  return { users, refresh, resets, register, requestReset, resetPassword, login, notifier }
}

const creds = {
  email: 'ana@test.com',
  password: 'Password1',
  firstName: 'Ana',
  lastName: 'Díaz',
  ageConfirmed: true as const,
}

describe('Password reset', () => {
  it('genera un token cuando el usuario existe', async () => {
    const { register, requestReset, resets } = makeEnv()
    await register.execute(creds)
    const result = await requestReset.execute(creds.email)
    expect(result?.rawToken).toBeTruthy()
    expect(resets.resets).toHaveLength(1)
  })

  it('devuelve null (sin filtrar) cuando el correo no existe', async () => {
    const { requestReset } = makeEnv()
    await expect(requestReset.execute('desconocido@test.com')).resolves.toBeNull()
  })

  it('restablece la contraseña y permite iniciar sesión con la nueva', async () => {
    const { register, requestReset, resetPassword, login } = makeEnv()
    await register.execute(creds)
    const req = await requestReset.execute(creds.email)

    await resetPassword.execute(req!.rawToken, 'NuevaPass1')

    const result = await login.execute({ email: creds.email, password: 'NuevaPass1' })
    expect(result.tokens.accessToken).toContain('access:')
  })

  it('revoca las sesiones activas al restablecer la contraseña', async () => {
    const { register, requestReset, resetPassword, refresh } = makeEnv()
    const { tokens } = await register.execute(creds)
    const req = await requestReset.execute(creds.email)

    await resetPassword.execute(req!.rawToken, 'NuevaPass1')

    const previous = refresh.tokens.find((t) => t.tokenHash === `h:${tokens.refreshToken}`)
    expect(previous?.revokedAt).not.toBeNull()
  })

  it('rechaza un token de reseteo ya usado', async () => {
    const { register, requestReset, resetPassword } = makeEnv()
    await register.execute(creds)
    const req = await requestReset.execute(creds.email)
    await resetPassword.execute(req!.rawToken, 'NuevaPass1')
    await expect(resetPassword.execute(req!.rawToken, 'OtraPass1')).rejects.toMatchObject({
      statusCode: 400,
    })
  })
})

describe('RequestPasswordResetUseCase · entrega del enlace', () => {
  it('manda el token al correo del usuario, con su vigencia', async () => {
    const { register, requestReset, notifier } = makeEnv()
    await register.execute(creds)

    const res = await requestReset.execute(creds.email)

    expect(notifier.de('passwordReset')).toEqual([
      { to: creds.email, rawToken: res!.rawToken, minutosDeVigencia: 30 },
    ])
  })

  /**
   * Si el correo no existe no se manda nada y no se distingue por fuera: el
   * controlador responde lo mismo en los dos casos, que es lo que impide usar
   * este endpoint para averiguar qué cuentas existen.
   */
  it('no manda nada si el correo no corresponde a ninguna cuenta', async () => {
    const { requestReset, notifier } = makeEnv()

    const res = await requestReset.execute('nadie@ejemplo.co')

    expect(res).toBeNull()
    expect(notifier.enviados).toHaveLength(0)
  })
})
