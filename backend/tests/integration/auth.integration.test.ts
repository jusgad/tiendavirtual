import request from 'supertest'
import { createApp } from '../../src/app'
import { prisma } from '../../src/shared/database/prisma'

// Requiere Postgres migrado (ver README). Usa la DATABASE_URL del entorno.
const app = createApp(prisma)

const user = {
  email: `int-${Date.now()}@test.com`,
  password: 'Password1',
  firstName: 'Integr',
  lastName: 'Test',
  ageConfirmed: true,
}

describe('Auth endpoints (integración)', () => {
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } })
    await prisma.$disconnect()
  })

  it('POST /api/auth/register crea el usuario (201)', async () => {
    const res = await request(app).post('/api/auth/register').send(user)
    expect(res.status).toBe(201)
    expect(res.body.user.email).toBe(user.email)
    expect(res.body.tokens.accessToken).toBeTruthy()
    expect(res.body.tokens.refreshToken).toBeTruthy()
    expect(res.body.user.passwordHash).toBeUndefined()
  })

  it('POST /api/auth/register rechaza edad no confirmada (400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...user, email: `x-${Date.now()}@test.com`, ageConfirmed: false })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/register rechaza correo duplicado (409)', async () => {
    const res = await request(app).post('/api/auth/register').send(user)
    expect(res.status).toBe(409)
  })

  it('POST /api/auth/login inicia sesión (200) y /me responde con el token', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
    expect(login.status).toBe(200)

    const token = login.body.tokens.accessToken
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    expect(me.status).toBe(200)
    expect(me.body.user.role).toBe('CLIENT')
  })

  it('POST /api/auth/login con contraseña errónea (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'incorrecta' })
    expect(res.status).toBe(401)
  })

  it('GET /api/auth/me sin token responde 401', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('POST /api/auth/refresh rota los tokens (200)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: login.body.tokens.refreshToken })
    expect(res.status).toBe(200)
    expect(res.body.tokens.accessToken).toBeTruthy()
  })
})
