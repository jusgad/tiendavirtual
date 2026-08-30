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

  // Cubre el reemplazo de imágenes de PATCH /api/products/:id contra Postgres
  // real: la única forma de comprobar la transacción, el `tx` vs `this.prisma`
  // y las condiciones `if (images)` / `if (images.length > 0)` que de verdad
  // implementan la semántica pedida (el fake en memoria no las ejerce).
  describe('PATCH /api/products/:id — reemplazo de imágenes', () => {
    const admin = {
      email: `admin-img-${Date.now()}@test.com`,
      password: 'Password1',
      firstName: 'Admin',
      lastName: 'Imagenes',
      ageConfirmed: true,
    }
    let token = ''
    let brandId = ''
    let categoryId = ''
    const productIds: string[] = []

    beforeAll(async () => {
      // No hay admin sembrado garantizado en este entorno (la CI no corre el
      // seed): se registra un usuario normal y se promueve a ADMIN en la
      // base directamente. El rol viaja embebido en el JWT al firmarlo
      // (ver `issueTokens.ts`), así que hace falta un login nuevo después de
      // la promoción para obtener un token que ya refleje ADMIN.
      const reg = await request(app).post('/api/auth/register').send(admin)
      expect(reg.status).toBe(201)
      await prisma.user.update({ where: { email: admin.email }, data: { role: 'ADMIN' } })
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: admin.email, password: admin.password })
      expect(login.status).toBe(200)
      token = login.body.tokens.accessToken

      // Marca y categoría propias del test, para no depender del seed.
      const brand = await request(app)
        .post('/api/brands')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Marca Imágenes ${Date.now()}` })
      expect(brand.status).toBe(201)
      brandId = brand.body.brand.id

      const category = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Categoría Imágenes ${Date.now()}` })
      expect(category.status).toBe(201)
      categoryId = category.body.category.id
    })

    afterAll(async () => {
      // Los productos se borran primero: Product -> Brand/Category no tiene
      // cascada, así que hay que quitar la FK antes de borrar marca/categoría.
      // Las filas de `product_images` sí tienen cascada desde Product.
      if (productIds.length > 0) {
        await prisma.product.deleteMany({ where: { id: { in: productIds } } })
      }
      if (categoryId) await prisma.category.delete({ where: { id: categoryId } })
      if (brandId) await prisma.brand.delete({ where: { id: brandId } })
      const u = await prisma.user.findUnique({ where: { email: admin.email } })
      if (u) await prisma.user.delete({ where: { id: u.id } })
    })

    async function crearProductoConDosImagenes(): Promise<string> {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: `Producto Imágenes ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          sku: `IMG-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          description: 'Producto de prueba para el reemplazo de imágenes',
          brandId,
          categoryId,
          price: 45900,
          stock: 5,
          images: [
            { url: 'https://picsum.photos/seed/vieja1/200', alt: 'Vieja 1', position: 0 },
            { url: 'https://picsum.photos/seed/vieja2/200', alt: 'Vieja 2', position: 1 },
          ],
        })
      expect(res.status).toBe(201)
      const productId = res.body.product.id as string
      productIds.push(productId)
      return productId
    }

    it('reemplaza el juego completo de fotos por las nuevas', async () => {
      const productId = await crearProductoConDosImagenes()

      const patch = await request(app)
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          images: [
            { url: 'https://picsum.photos/seed/nueva1/200', alt: 'Nueva 1', position: 0 },
            { url: 'https://picsum.photos/seed/nueva2/200', alt: 'Nueva 2', position: 1 },
          ],
        })
      expect(patch.status).toBe(200)

      // Se verifica contra la tabla, no contra lo que devuelve el endpoint:
      // las filas viejas ya no deben existir y solo deben quedar las nuevas.
      const rows = await prisma.productImage.findMany({
        where: { productId },
        orderBy: { position: 'asc' },
      })
      expect(rows).toHaveLength(2)
      expect(rows[0].url).toBe('https://picsum.photos/seed/nueva1/200')
      expect(rows[0].position).toBe(0)
      expect(rows[1].url).toBe('https://picsum.photos/seed/nueva2/200')
      expect(rows[1].position).toBe(1)
    })

    it('deja las fotos intactas cuando la carga no trae `images`', async () => {
      const productId = await crearProductoConDosImagenes()

      const antes = await prisma.productImage.findMany({ where: { productId } })
      expect(antes).toHaveLength(2)

      const patch = await request(app)
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ price: 89900 })
      expect(patch.status).toBe(200)

      // Este es el caso que evita una pérdida silenciosa de datos: sin
      // `images` en la carga, las fotos del producto no deben tocarse.
      const despues = await prisma.productImage.findMany({ where: { productId } })
      expect(despues).toHaveLength(2)
      expect(despues.map((r) => r.url).sort()).toEqual(antes.map((r) => r.url).sort())
    })

    it('deja el producto sin fotos cuando la carga trae `images: []`', async () => {
      const productId = await crearProductoConDosImagenes()

      const patch = await request(app)
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ images: [] })
      expect(patch.status).toBe(200)

      // Distinto del caso anterior: un array vacío es la instrucción legítima
      // de "quítalas todas", no la ausencia del campo.
      const rows = await prisma.productImage.findMany({ where: { productId } })
      expect(rows).toHaveLength(0)
    })
  })
})
