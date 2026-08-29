# Cómo agregar un módulo nuevo al backend

Al terminar tendrás un dominio nuevo con sus cuatro capas, montado en la API,
documentado en Swagger y cubierto por tests unitarios que corren sin base de
datos.

Como ejemplo usaremos un módulo `wishlist` (lista de deseos): un usuario guarda
productos para después. Es lo bastante simple para no estorbar y lo bastante
real para tocar todas las piezas.

## Requisitos previos

- Entorno local funcionando ([cómo montarlo](howto-entorno-local.md)).
- Haber leído la sección de capas de [ARCHITECTURE.md](../ARCHITECTURE.md).
- Saber qué dominio vas a modelar y qué endpoints expone.

**Dos reglas que no se rompen en este repo:**

1. **Imports relativos.** No hay alias de rutas configurados, a propósito: mantiene simple la resolución en `tsx`, `jest`, `tsc` y Docker.
2. **`domain/` no importa framework.** Nada de Express, Prisma, ioredis, bcrypt ni jsonwebtoken. Si tu tipo de dominio necesita un tipo de Prisma, va al revés: define el tuyo y mapéalo en `infrastructure/`.

---

## Pasos

### 1. Crea la estructura de carpetas

```bash
cd backend/src/modules
mkdir -p wishlist/{domain,application,infrastructure,interfaces/http}
```

Queda así:

```
modules/wishlist/
├── domain/            tipos + puertos + reglas puras
├── application/       casos de uso
├── infrastructure/    adaptadores (Prisma, Redis…)
├── interfaces/http/   controlador, DTOs, fragmento OpenAPI
└── wishlist.module.ts composición
```

### 2. Modela el dominio y sus puertos

`domain/ports.ts` — tipos propios del dominio y las interfaces que necesitará el
caso de uso. Ni una sola importación de framework.

```ts
export interface WishlistItem {
  productId: string
  productName: string
  price: number
  addedAt: Date
}

/** Persistencia de la lista de deseos. Lo implementa infrastructure/. */
export interface WishlistRepository {
  listByUser(userId: string): Promise<WishlistItem[]>
  add(userId: string, productId: string): Promise<void>
  remove(userId: string, productId: string): Promise<void>
  exists(userId: string, productId: string): Promise<boolean>
}

/** Datos del producto necesarios para validar la operación. */
export interface WishlistProductGateway {
  findById(id: string): Promise<{ id: string; isActive: boolean } | null>
}
```

Si el dominio tiene reglas puras (cálculos, validaciones sin efectos), van en su
propio archivo — como `orders/domain/pricing.ts`. Son las más fáciles y más
valiosas de testear.

### 3. Escribe el caso de uso

`application/wishlistUseCases.ts`. Recibe todo por constructor; **nunca**
instancia sus dependencias. Lanza errores de dominio, nunca códigos HTTP.

```ts
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError'
import { WishlistItem, WishlistProductGateway, WishlistRepository } from '../domain/ports'

export class ListWishlistUseCase {
  constructor(private readonly wishlist: WishlistRepository) {}

  execute(userId: string): Promise<WishlistItem[]> {
    return this.wishlist.listByUser(userId)
  }
}

export class AddToWishlistUseCase {
  constructor(
    private readonly wishlist: WishlistRepository,
    private readonly products: WishlistProductGateway,
  ) {}

  async execute(userId: string, productId: string): Promise<void> {
    const product = await this.products.findById(productId)
    if (!product || !product.isActive) throw new NotFoundError('Producto no disponible')

    if (await this.wishlist.exists(userId, productId)) {
      throw new ConflictError('El producto ya está en tu lista de deseos')
    }

    await this.wishlist.add(userId, productId)
  }
}
```

Errores disponibles en
[`shared/errors/AppError`](../backend/src/shared/errors/AppError.ts):
`BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403),
`NotFoundError` (404), `ConflictError` (409), `UnprocessableError` (422). El
manejador central los traduce.

### 4. Escribe los tests ahora, no después

Es el momento correcto: el caso de uso ya existe y todavía no hay ni una línea
de Prisma. Crea los dobles en memoria en `tests/unit/wishlist/fakes.ts`,
siguiendo el patrón de los que ya hay (mira
[`tests/unit/reviews/fakes.ts`](../backend/tests/unit/reviews/fakes.ts)):

```ts
import { WishlistItem, WishlistProductGateway, WishlistRepository } from '../../../src/modules/wishlist/domain/ports'

export class InMemoryWishlistRepository implements WishlistRepository {
  items = new Map<string, WishlistItem[]>()

  async listByUser(userId: string): Promise<WishlistItem[]> {
    return this.items.get(userId) ?? []
  }

  async add(userId: string, productId: string): Promise<void> {
    const list = this.items.get(userId) ?? []
    list.push({ productId, productName: `Producto ${productId}`, price: 1000, addedAt: new Date() })
    this.items.set(userId, list)
  }

  async remove(userId: string, productId: string): Promise<void> {
    this.items.set(userId, (this.items.get(userId) ?? []).filter((i) => i.productId !== productId))
  }

  async exists(userId: string, productId: string): Promise<boolean> {
    return (this.items.get(userId) ?? []).some((i) => i.productId === productId)
  }
}

export class FakeWishlistProductGateway implements WishlistProductGateway {
  products = new Map<string, { id: string; isActive: boolean }>()

  add(id: string, isActive = true) {
    this.products.set(id, { id, isActive })
  }

  async findById(id: string) {
    return this.products.get(id) ?? null
  }
}
```

Y el test en `tests/unit/wishlist/wishlist.test.ts`:

```ts
import { AddToWishlistUseCase } from '../../../src/modules/wishlist/application/wishlistUseCases'
import { FakeWishlistProductGateway, InMemoryWishlistRepository } from './fakes'

describe('AddToWishlistUseCase', () => {
  it('rechaza un producto inactivo', async () => {
    const repo = new InMemoryWishlistRepository()
    const products = new FakeWishlistProductGateway()
    products.add('p1', false)

    await expect(new AddToWishlistUseCase(repo, products).execute('u1', 'p1'))
      .rejects.toThrow('Producto no disponible')
  })

  it('rechaza un producto duplicado', async () => {
    const repo = new InMemoryWishlistRepository()
    const products = new FakeWishlistProductGateway()
    products.add('p1')
    const useCase = new AddToWishlistUseCase(repo, products)

    await useCase.execute('u1', 'p1')
    await expect(useCase.execute('u1', 'p1')).rejects.toThrow('ya está en tu lista')
  })
})
```

```bash
cd backend && npx jest tests/unit/wishlist
```

Debe pasar **sin Postgres ni Redis**. Si necesitas levantar algo para que corra,
alguna dependencia se coló donde no debía.

### 5. Añade el modelo a Prisma (si hace falta persistencia nueva)

En [`prisma/schema.prisma`](../backend/prisma/schema.prisma), siguiendo las
convenciones del esquema — `@@map` en snake_case plural, dinero en
`Decimal(12,2)`, índices en las columnas por las que filtras:

```prisma
model WishlistItem {
  id        String   @id @default(uuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
  @@index([userId])
  @@map("wishlist_items")
}
```

Añade las relaciones inversas en `User` y `Product`.

Genera la migración:

```bash
npm run prisma:migrate
```

> **Sin base de datos disponible** puedes escribir la migración igualmente — así
> se generó la inicial de este repo:
>
> ```bash
> npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
> ```

### 6. Implementa los adaptadores

`infrastructure/prismaWishlistRepository.ts` — la única capa que conoce Prisma:

```ts
import { PrismaClient } from '@prisma/client'
import { WishlistItem, WishlistRepository } from '../domain/ports'

export class PrismaWishlistRepository implements WishlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listByUser(userId: string): Promise<WishlistItem[]> {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { select: { name: true, price: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => ({
      productId: r.productId,
      productName: r.product.name,
      price: Number(r.product.price),   // Decimal -> number en el borde
      addedAt: r.createdAt,
    }))
  }

  async add(userId: string, productId: string): Promise<void> {
    await this.prisma.wishlistItem.create({ data: { userId, productId } })
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } })
  }

  async exists(userId: string, productId: string): Promise<boolean> {
    const found = await this.prisma.wishlistItem.findFirst({
      where: { userId, productId },
      select: { id: true },
    })
    return found !== null
  }
}
```

Dos detalles que sigue todo el proyecto:

- **Los `Decimal` de Prisma se convierten a `number` aquí**, en el borde. El dominio trabaja con números.
- **Las consultas filtran por `userId`** además de por id, aunque el caso de uso ya lo compruebe. Defensa en profundidad — es lo que hacen `orders`, `addresses` y `payments`.

Si tu dominio necesita mapear enums entre Prisma y dominio, crea un
`infrastructure/<algo>Mapper.ts`, como hacen `orders` y `payments`.

### 7. Define los DTOs de validación

`interfaces/http/wishlist.dto.ts`:

```ts
import { z } from 'zod'

export const productIdParamSchema = z.object({
  productId: z.string().uuid('productId inválido'),
})

export const addToWishlistSchema = z.object({
  productId: z.string().uuid('productId inválido'),
})
```

El middleware `validate` **reemplaza** `req.body` / `req.query` / `req.params`
por la versión parseada, así que los defaults y las coerciones (`z.coerce`) ya
vienen aplicados en el controlador.

### 8. Escribe el controlador

`interfaces/http/wishlist.controller.ts`. Solo traduce HTTP ↔ caso de uso. Cero
lógica de negocio.

```ts
import { Request, Response } from 'express'
import { UnauthorizedError } from '../../../../shared/errors/AppError'
import { AddToWishlistUseCase, ListWishlistUseCase } from '../../application/wishlistUseCases'

function userId(req: Request): string {
  if (!req.user) throw new UnauthorizedError()
  return req.user.id
}

export class WishlistController {
  constructor(
    private readonly listWishlist: ListWishlistUseCase,
    private readonly addToWishlist: AddToWishlistUseCase,
  ) {}

  list = async (req: Request, res: Response) => {
    res.json({ items: await this.listWishlist.execute(userId(req)) })
  }

  add = async (req: Request, res: Response) => {
    await this.addToWishlist.execute(userId(req), req.body.productId)
    res.status(201).json({ message: 'Agregado a tu lista de deseos' })
  }
}
```

Usa **propiedades de clase con función flecha** (`list = async (…) => {}`), no
métodos. Es lo que permite pasarlos como `asyncHandler(controller.list)` sin
perder el `this`.

### 9. Escribe el fragmento OpenAPI

`interfaces/http/wishlist.openapi.ts`. Se registra por **efecto de importación**:

```ts
import { registerPaths, registerSchemas } from '../../../../shared/docs/openapi'

registerSchemas({
  WishlistItem: {
    type: 'object',
    properties: {
      productId: { type: 'string', format: 'uuid' },
      productName: { type: 'string' },
      price: { type: 'number' },
      addedAt: { type: 'string', format: 'date-time' },
    },
  },
})

const authed = [{ bearerAuth: [] }]

registerPaths({
  '/wishlist': {
    get: {
      tags: ['Wishlist'],
      summary: 'Listar mi lista de deseos',
      security: authed,
      responses: {
        200: {
          description: 'Lista de deseos',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { $ref: '#/components/schemas/WishlistItem' } },
                },
              },
            },
          },
        },
        401: { description: 'No autenticado' },
      },
    },
    post: {
      tags: ['Wishlist'],
      summary: 'Agregar un producto a la lista de deseos',
      security: authed,
      responses: {
        201: { description: 'Agregado' },
        404: { description: 'Producto no disponible' },
        409: { description: 'Ya está en la lista' },
      },
    },
  },
})
```

Si usas una etiqueta nueva, añádela al array `tags` de
[`shared/docs/openapi.ts`](../backend/src/shared/docs/openapi.ts) para que
Swagger la agrupe bien.

### 10. Cablea el módulo

`wishlist.module.ts` — el único archivo que conoce las cuatro capas:

```ts
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { asyncHandler } from '../../shared/http/asyncHandler'
import { validate } from '../../shared/middlewares/validate'
import { authGuard } from '../../shared/middlewares/auth'

import { PrismaWishlistRepository } from './infrastructure/prismaWishlistRepository'
import { PrismaWishlistProductGateway } from './infrastructure/prismaWishlistProductGateway'
import { AddToWishlistUseCase, ListWishlistUseCase } from './application/wishlistUseCases'
import { WishlistController } from './interfaces/http/wishlist.controller'
import { addToWishlistSchema } from './interfaces/http/wishlist.dto'

/** Composición del módulo Wishlist: cablea repos → casos de uso → rutas. */
export function buildWishlistModule(prisma: PrismaClient): Router {
  const wishlist = new PrismaWishlistRepository(prisma)
  const products = new PrismaWishlistProductGateway(prisma)

  const controller = new WishlistController(
    new ListWishlistUseCase(wishlist),
    new AddToWishlistUseCase(wishlist, products),
  )

  const router = Router()
  router.get('/', authGuard, asyncHandler(controller.list))
  router.post('/', authGuard, validate({ body: addToWishlistSchema }), asyncHandler(controller.add))

  return router
}
```

Middlewares disponibles:

| Middleware | Para qué |
|---|---|
| `authGuard` | Exige access token válido |
| `roleGuard('ADMIN')` | Restringe por rol. Va **después** de `authGuard` |
| `optionalAuth` | Adjunta `req.user` si hay token válido; no falla si no lo hay |
| `validate({ body, query, params })` | Validación Zod |
| `asyncHandler(fn)` | Envuelve el controlador para que los rechazos lleguen al manejador de errores |

Para rutas de solo admin, el patrón del repo es:

```ts
const adminOnly = [authGuard, roleGuard('ADMIN')]
router.post('/', ...adminOnly, validate({ body: schema }), asyncHandler(controller.create))
```

### 11. Registra el módulo en las rutas

En [`src/routes.ts`](../backend/src/routes.ts), **dos** cambios:

```ts
import { buildWishlistModule } from './modules/wishlist/wishlist.module'

// Registro de documentación OpenAPI por módulo (efecto de importación).
import './modules/wishlist/interfaces/http/wishlist.openapi'

export function buildApiRouter(prisma: PrismaClient): Router {
  const router = Router()
  // …módulos existentes…
  router.use('/wishlist', buildWishlistModule(prisma))
  return router
}
```

**Olvidar el import del `.openapi` es el fallo más habitual**: las rutas
funcionan pero no aparecen en Swagger, y nada avisa.

Si tu módulo necesita Redis, pásalo igual que hacen `cart`, `catalog` y `orders`:

```ts
router.use('/wishlist', buildWishlistModule(prisma, redis))
```

---

## Verificación

Los tres comandos, en orden:

```bash
cd backend && npm run typecheck
```

```bash
npm run lint
```

```bash
npm run test:unit
```

Con el servidor arriba (`npm run dev`):

```bash
curl -i http://localhost:3000/api/wishlist
```

Debe devolver `401` con `{"error":{"code":"UNAUTHORIZED",...}}` — señal de que
la ruta está montada y el guard funciona.

Y comprueba Swagger: abre <http://localhost:3000/api/docs> y confirma que
aparece la sección "Wishlist" con sus dos operaciones.

---

## Lista de comprobación

```
[ ] domain/ no importa Express, Prisma, ioredis, bcrypt ni jsonwebtoken
[ ] El caso de uso recibe TODO por constructor
[ ] El caso de uso lanza errores de AppError, nunca res.status()
[ ] Los Decimal de Prisma se convierten a number en infrastructure/
[ ] Las consultas de datos propios del usuario filtran por userId
[ ] Los controladores son propiedades con función flecha
[ ] Todas las rutas con entrada usan validate()
[ ] Todas las rutas usan asyncHandler()
[ ] Todos los imports son relativos (sin alias)
[ ] El router está registrado en routes.ts
[ ] El .openapi.ts está IMPORTADO en routes.ts
[ ] Hay tests unitarios con dobles en memoria en tests/unit/<dominio>/
[ ] Los tests pasan sin Postgres ni Redis
[ ] Comentarios y mensajes de error en español
[ ] Si añadiste una variable de entorno: está en env.ts, .env.example y el workflow de CI
```

---

## Errores comunes

**Las rutas funcionan pero Swagger no las muestra** → falta el `import` del
`.openapi.ts` en `routes.ts`. No hay error, simplemente no aparece.

**`Cannot find module '@/...'`** → estás usando un alias de rutas. No están
configurados a propósito; usa rutas relativas.

**Los tests unitarios necesitan base de datos** → alguna dependencia real se
coló en el caso de uso. Comprueba que todo entra por constructor y que el doble
implementa el puerto, no la clase concreta.

**`TypeError: Cannot read properties of undefined (reading 'execute')`** →
declaraste el controlador con métodos en vez de propiedades con función flecha,
y `this` se perdió al pasarlo a `asyncHandler`.

**Un error async devuelve 500 en vez del código correcto** → falta
`asyncHandler`. Sin él, el rechazo de la promesa nunca llega a `next(err)`.

**CI rompe con "Configuración de entorno inválida"** → añadiste una variable
obligatoria a `env.ts` pero no al bloque `env` de
[`.github/workflows/backend-ci.yml`](../.github/workflows/backend-ci.yml).

---

## Relacionado

- [ARCHITECTURE.md](../ARCHITECTURE.md) — capas y traza de una petición
- [Explicación: decisiones de diseño](explicacion-decisiones.md)
- [Referencia: modelo de datos](referencia-modelo-datos.md)
- [Referencia: API REST](referencia-api.md)
