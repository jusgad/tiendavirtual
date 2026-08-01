import request from 'supertest'
import { createApp } from '../../src/app'
import { prisma } from '../../src/shared/database/prisma'
import { redis } from '../../src/shared/cache/redis'

// Requiere Postgres migrado y con seed (ver README). Redis es opcional
// (la caché degrada a "sin caché" si no está disponible).
const app = createApp(prisma)

describe('Catálogo endpoints (integración)', () => {
  afterAll(async () => {
    await prisma.$disconnect()
    redis.disconnect()
  })

  it('GET /api/products devuelve una página de productos (200)', async () => {
    const res = await request(app).get('/api/products?pageSize=5')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
    expect(typeof res.body.total).toBe('number')
  })

  it('GET /api/products filtra por rango de precio', async () => {
    const res = await request(app).get('/api/products?minPrice=0&maxPrice=1000000')
    expect(res.status).toBe(200)
  })

  it('GET /api/categories devuelve la lista (200)', async () => {
    const res = await request(app).get('/api/categories')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.categories)).toBe(true)
  })

  it('POST /api/products sin token responde 401', async () => {
    const res = await request(app).post('/api/products').send({ name: 'X' })
    expect(res.status).toBe(401)
  })

  it('GET /api/products/:slug inexistente responde 404', async () => {
    const res = await request(app).get('/api/products/no-existe-xyz')
    expect(res.status).toBe(404)
  })
})
