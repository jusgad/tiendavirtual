# Panel de administración · Plan de implementación (F4–F6)

> **Para trabajadores agénticos:** SUB-SKILL REQUERIDA: usa
> `superpowers:subagent-driven-development` (recomendado) o
> `superpowers:executing-plans` para ejecutar este plan tarea por tarea. Los
> pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** Completar el panel con las cuatro secciones que hoy son
marcadores: productos, categorías y marcas, cupones y reportes.

**Arquitectura:** El backend ya expone todos los endpoints necesarios, salvo
dos huecos que este plan corrige primero. El frontend sigue el patrón ya
establecido en la sección de pedidos: lógica pura en un módulo `*Model.js` con
sus tests, y el componente React como renderizador delgado.

**Stack:** Backend Node + TypeScript + Express + Prisma, tests con Jest y fakes
en memoria. Frontend React 18 + Vite + Tailwind, tests con Vitest.

**Especificación:** [2026-08-29-panel-administracion-design.md](../specs/2026-08-29-panel-administracion-design.md)

**Plan anterior:** [F1–F3](2026-08-29-panel-admin-f1-f3.md) construyó el acceso,
el enrutador, el cliente admin y la sección de pedidos. Este plan continúa desde
ahí.

## Dos huecos que la especificación no previó

Encontrados al leer el backend antes de escribir este plan. Ambos **bloquean**
la pantalla de productos, y por eso se corrigen en las Tasks 1 y 2:

1. **`GET /products` fuerza `activeOnly: true`.** Si el administrador desactiva
   un producto, desaparece de su propio panel y no puede volver a activarlo.
   Categorías y marcas sí aceptan `includeInactive`; productos no.
2. **`PATCH /products/:id` no acepta imágenes.** `UpdateProductData` las excluye
   explícitamente (`Partial<Omit<CreateProductData, 'images'>>`) y el
   repositorio no las toca. Hoy las fotos solo se pueden fijar al **crear** el
   producto. La especificación daba por hecho un editor de imágenes.

## Restricciones globales

- **Idioma:** comentarios, mensajes de error y textos de interfaz en **español**.
- **Imports relativos siempre.** No hay alias de rutas configurados.
- **Sin dependencias nuevas** en ningún `package.json`. Ni librería de gráficas,
  ni `@testing-library/react`, ni jsdom, ni configuración de Vitest.
- **Errores de dominio** desde `backend/src/shared/errors/AppError`. El dominio
  no importa Express ni Prisma.
- **Regla de dependencias del backend:** `interfaces/http → application → domain
  ← infrastructure`.
- **Vitest corre en entorno node**, sin DOM. La lógica testeable va en módulos
  puros; los componentes son renderizadores delgados sin tests propios.
- **Comandos:** backend `npm run test:unit`, `npm run typecheck`, `npm run lint`.
  Frontend `npm test`, `npm run build`.
- **Punto de partida:** backend 151 tests en 18 suites; frontend 51 en 6
  archivos; 4 páginas compilando.

## Endpoints que consume este plan

Todos existen ya, salvo lo que corrigen las Tasks 1 y 2.

| Método y ruta | Respuesta |
|---|---|
| `GET /products?page&pageSize&includeInactive` | `{ items, total, page, pageSize }` |
| `POST /products` | 201 `{ product }` |
| `PATCH /products/:id` | `{ product }` |
| `DELETE /products/:id` | 204 sin cuerpo |
| `GET /categories?includeInactive=true` | `{ categories }` |
| `POST /categories` · `PATCH /categories/:id` | `{ category }` |
| `DELETE /categories/:id` | 204 |
| `GET /brands?includeInactive=true` | `{ brands }` |
| `POST /brands` · `PATCH /brands/:id` | `{ brand }` |
| `DELETE /brands/:id` | 204 |
| `GET /coupons?includeInactive=true` | `{ coupons }` |
| `POST /coupons` · `PATCH /coupons/:id` | `{ coupon }` |
| `GET /admin/reports/sales?from&to&groupBy` | `{ points: [{period, orders, revenue}], totalOrders, totalRevenue }` |
| `GET /admin/reports/top-products?limit` | `{ products: [{productId, name, quantitySold, revenue}] }` |
| `GET /admin/reports/orders-by-status` | `{ statuses: [{status, count}] }` |

Un producto trae: `id, name, slug, sku, description, brandId, categoryId, price,
currency, presentation, sizeMl, usageType, skinType, ingredients, warnings,
stock, isActive, brand{id,name,slug}, category{id,name,slug}, images[{id,url,alt,position}]`.

Un cupón trae: `id, code, type, value, minPurchase, maxUses, usedCount,
perUserLimit, startsAt, endsAt, isActive`.

> `updateCouponSchema` **no** incluye `code`: un cupón no se puede renombrar.
> El formulario de edición debe mostrarlo como solo lectura.

## Estructura de archivos

**Backend — se modifican:**

| Archivo | Cambio |
|---|---|
| `src/modules/catalog/interfaces/http/catalog.dto.ts` | `includeInactive` en el query; `images` en el update |
| `src/modules/catalog/interfaces/http/catalog.controllers.ts` | Honra `includeInactive` solo para ADMIN |
| `src/modules/catalog/catalog.module.ts` | `optionalAuth` en el listado de productos |
| `src/modules/catalog/domain/ports.ts` | `UpdateProductData` admite `images` |
| `src/modules/catalog/infrastructure/prismaProductRepository.ts` | Reemplaza las imágenes en el update |

**Frontend — se crean:**

| Archivo | Responsabilidad |
|---|---|
| `src/admin/catalog/productsModel.js` | Lógica pura de productos (validación, formulario vacío, imágenes) |
| `src/admin/catalog/productsModel.test.js` | Sus tests |
| `src/admin/catalog/ProductsPage.jsx` | Lista de productos |
| `src/admin/catalog/ProductForm.jsx` | Alta y edición, con el editor de imágenes |
| `src/admin/catalog/TaxonomyPage.jsx` | Categorías y marcas |
| `src/admin/coupons/couponsModel.js` | Lógica pura de cupones |
| `src/admin/coupons/couponsModel.test.js` | Sus tests |
| `src/admin/coupons/CouponsPage.jsx` | Lista y formulario de cupones |
| `src/admin/reports/reportsModel.js` | Lógica pura de reportes (escalas, rangos) |
| `src/admin/reports/reportsModel.test.js` | Sus tests |
| `src/admin/reports/Bars.jsx` | Barras horizontales en SVG plano |
| `src/admin/reports/ReportsPage.jsx` | Tarjetas, tablas y barras |

**Frontend — se modifican:** `src/admin/api.js` (métodos nuevos),
`src/admin/api.test.js`, `src/admin/AdminApp.jsx` (sustituir los cuatro
marcadores), `src/admin/components/ui.jsx` (añadir `Confirmacion`).

---

# F4 · Backend: los dos huecos

### Task 1: El administrador ve los productos inactivos

**Archivos:**
- Modificar: `backend/src/modules/catalog/interfaces/http/catalog.dto.ts`
- Modificar: `backend/src/modules/catalog/interfaces/http/catalog.controllers.ts`
- Modificar: `backend/src/modules/catalog/catalog.module.ts`
- Test: `backend/tests/unit/catalog/listProducts.test.ts`

**Interfaces:**
- Consume: `ProductFilter.activeOnly?: boolean`, que ya existe en
  `catalog/domain/ports.ts`; `optionalAuth` de `shared/middlewares/optionalAuth`,
  que adjunta `req.user = { id, role }` cuando el token es válido.
  El fake es `InMemoryProductRepository` de `tests/unit/catalog/fakes.ts`, que
  ya filtra por `activeOnly` en su método `list` y expone el array `products`.
  El caché falso es `FakeCatalogCache`, del mismo archivo.
- Produce: `GET /products?includeInactive=true` devuelve también los inactivos,
  **solo** si quien pregunta es ADMIN. Lo consume la Task 5.

- [ ] **Paso 1: Escribir el test que falla**

Añadir a `backend/tests/unit/catalog/listProducts.test.ts`, reutilizando los
imports y ayudantes que ese archivo ya tiene:

```ts
describe('ListProductsUseCase · productos desactivados', () => {
  function repoConUnoDesactivado() {
    const repo = new InMemoryProductRepository()
    repo.products.push(
      { ...productoBase(), id: 'p-activo', slug: 'activo', isActive: true },
      { ...productoBase(), id: 'p-inactivo', slug: 'inactivo', isActive: false },
    )
    return repo
  }

  it('con activeOnly solo devuelve el activo', async () => {
    const useCase = new ListProductsUseCase(repoConUnoDesactivado(), new FakeCatalogCache())

    const res = await useCase.execute({ page: 1, pageSize: 20, activeOnly: true })

    expect(res.items.map((p) => p.id)).toEqual(['p-activo'])
  })

  it('sin activeOnly devuelve también el desactivado', async () => {
    const useCase = new ListProductsUseCase(repoConUnoDesactivado(), new FakeCatalogCache())

    const res = await useCase.execute({ page: 1, pageSize: 20, activeOnly: false })

    expect(res.items.map((p) => p.id)).toEqual(['p-activo', 'p-inactivo'])
  })
})
```

> `productoBase()` es el ayudante que ya usa ese archivo para construir un
> producto de prueba. **Léelo antes de escribir** y usa el nombre real que
> tenga; si construye el producto en línea en vez de con un ayudante, copia esa
> misma forma. No inventes una API de fake que no exista.

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx jest tests/unit/catalog/listProducts.test.ts
```

Esperado: el segundo test FALLA. Hoy `ListProductsUseCase` recibe el filtro tal
cual, así que este test en realidad ya pasaría a nivel de caso de uso: lo que
falla es el camino HTTP, que fuerza `activeOnly: true`. Si ambos pasan de
entrada, déjalos como red de seguridad y comprueba el arreglo en el Paso 6 con
`npm run test:unit`, más la verificación en navegador de la Task 12 (punto 1),
que es donde este hueco se ve de verdad.

- [ ] **Paso 3: Aceptar el parámetro en el DTO**

En `catalog.dto.ts`, añadir a `productListQuerySchema`, después de `sort`:

```ts
  // Solo lo honra el panel de administración; ver el controlador.
  includeInactive: z.coerce.boolean().optional(),
```

- [ ] **Paso 4: Honrarlo solo para ADMIN en el controlador**

En `catalog.controllers.ts`, dentro de `ProductController.list`, reemplazar la
línea `activeOnly: true,` por:

```ts
      // El listado es público: un visitante nunca debe ver productos
      // desactivados, aunque mande `includeInactive`. Solo el panel, que va
      // autenticado como ADMIN, puede pedirlos.
      activeOnly: !(q.includeInactive && req.user?.role === 'ADMIN'),
```

- [ ] **Paso 5: Adjuntar el usuario en la ruta**

En `catalog.module.ts`, añadir `optionalAuth` a la ruta de listado:

```ts
  router.get(
    '/products',
    optionalAuth,
    validate({ query: productListQuerySchema }),
    asyncHandler(productController.list),
  )
```

Y su import, junto a los que ya hay:

```ts
import { optionalAuth } from '../../shared/middlewares/optionalAuth'
```

- [ ] **Paso 6: Verificar**

```bash
npx jest tests/unit/catalog && npm run typecheck && npm run lint
```

Esperado: todo limpio.

- [ ] **Paso 7: Confirmar**

```bash
git add backend/src/modules/catalog backend/tests/unit/catalog
git commit -m "feat(catalog): el panel puede listar los productos desactivados"
```

---

### Task 2: Editar las imágenes de un producto existente

**Archivos:**
- Modificar: `backend/src/modules/catalog/domain/ports.ts`
- Modificar: `backend/src/modules/catalog/interfaces/http/catalog.dto.ts`
- Modificar: `backend/src/modules/catalog/infrastructure/prismaProductRepository.ts`
- Modificar: `backend/tests/unit/catalog/fakes.ts`
- Test: `backend/tests/unit/catalog/createProduct.test.ts`

**Interfaces:**
- Consume: `InMemoryProductRepository` y `FakeCatalogCache` de
  `tests/unit/catalog/fakes.ts`.
- Produce: `UpdateProductData` admite
  `images?: { url: string; alt?: string | null; position?: number }[]`.
  Cuando llega, **reemplaza** el juego completo de imágenes del producto; cuando
  no llega, las deja intactas. Lo consume la Task 6.

- [ ] **Paso 1: Registrar la actualización en el fake**

`InMemoryProductRepository.update` hoy hace `Object.assign(p, data)` y no guarda
lo recibido, así que no se puede afirmar nada sobre ello. Añádele el registro,
en `tests/unit/catalog/fakes.ts`:

```ts
export class InMemoryProductRepository implements ProductRepository {
  products: Product[] = []
  /** Última carga recibida por `update`: permite comprobar qué se pidió cambiar. */
  ultimaActualizacion: UpdateProductData | null = null
```

y dentro de su método `update`, como primera línea:

```ts
    this.ultimaActualizacion = data
```

- [ ] **Paso 2: Escribir el test que falla**

Añadir a `backend/tests/unit/catalog/createProduct.test.ts` (es el archivo donde
viven las pruebas de escritura de producto; reutiliza sus imports):

```ts
describe('UpdateProductUseCase · imágenes', () => {
  function repoConProducto() {
    const repo = new InMemoryProductRepository()
    repo.products.push({ ...productoBase(), id: 'p1', slug: 'p1' })
    return repo
  }

  it('pasa las imágenes nuevas al repositorio', async () => {
    const repo = repoConProducto()
    const useCase = new UpdateProductUseCase(repo, new FakeCatalogCache())

    await useCase.execute('p1', {
      images: [
        { url: 'nueva1.png', alt: 'Frente', position: 0 },
        { url: 'nueva2.png', alt: null, position: 1 },
      ],
    })

    expect(repo.ultimaActualizacion?.images).toHaveLength(2)
    expect(repo.ultimaActualizacion?.images?.[0].url).toBe('nueva1.png')
  })

  it('no manda imágenes si la actualización no las trae', async () => {
    const repo = repoConProducto()
    const useCase = new UpdateProductUseCase(repo, new FakeCatalogCache())

    await useCase.execute('p1', { price: 89900 })

    expect(repo.ultimaActualizacion?.images).toBeUndefined()
  })
})
```

> `productoBase()` es el ayudante que ese archivo ya usa para construir un
> producto de prueba. **Léelo antes de escribir** y usa su nombre real; si el
> archivo lo construye en línea, copia esa misma forma.

- [ ] **Paso 3: Ejecutar el test para verificar que falla**

```bash
npx jest tests/unit/catalog/createProduct.test.ts
```

Esperado: FALLA al compilar — `images` no existe en `UpdateProductData`.

- [ ] **Paso 4: Ampliar el tipo del dominio**

En `catalog/domain/ports.ts`, reemplazar:

```ts
export type UpdateProductData = Partial<Omit<CreateProductData, 'images'>> & {
  isActive?: boolean
}
```

por:

```ts
export type UpdateProductData = Partial<Omit<CreateProductData, 'images'>> & {
  isActive?: boolean
  /**
   * Cuando llega, REEMPLAZA el juego completo de imágenes del producto.
   * Cuando no llega, las deja como estaban. No hay actualización parcial:
   * `ProductImage` no tiene clave natural con la que casar filas sueltas.
   */
  images?: { url: string; alt?: string | null; position?: number }[]
}
```

- [ ] **Paso 5: Aceptarlas en el DTO**

En `catalog.dto.ts`, `updateProductSchema` es un `.partial()` sobre un objeto.
Añadir `images` **fuera** del `.partial()`, porque ya es opcional por sí mismo:

```ts
export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(160),
    sku: z.string().min(1).max(60),
    description: z.string().min(1),
    brandId: z.string().uuid(),
    categoryId: z.string().uuid(),
    price: z.number().positive(),
    presentation: z.string().nullable(),
    sizeMl: z.number().int().positive().nullable(),
    usageType: z.string().nullable(),
    skinType: z.string().nullable(),
    ingredients: z.string().nullable(),
    warnings: z.string().nullable(),
    stock: z.number().int().nonnegative(),
    isActive: z.boolean(),
    images: z.array(imageSchema),
  })
  .partial()
```

- [ ] **Paso 6: Reemplazarlas en el repositorio**

En `prismaProductRepository.ts`, reemplazar el método `update`:

```ts
  async update(id: string, data: UpdateProductData): Promise<Product> {
    const { images, ...campos } = data

    // Las imágenes se reemplazan en bloque dentro de la misma transacción que
    // el resto de campos: si algo falla, el producto no queda a medias con las
    // fotos viejas borradas y las nuevas sin escribir.
    const p = await this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } })
        if (images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img, i) => ({
              productId: id,
              url: img.url,
              alt: img.alt ?? null,
              position: img.position ?? i,
            })),
          })
        }
      }
      return tx.product.update({ where: { id }, data: campos, include: withRelations })
    })

    return toProduct(p)
  }
```

- [ ] **Paso 7: Verificar**

```bash
npm run test:unit && npm run typecheck && npm run lint
```

Esperado: todo limpio, con los tests nuevos incluidos.

- [ ] **Paso 8: Confirmar**

```bash
git add backend/src/modules/catalog backend/tests/unit/catalog
git commit -m "feat(catalog): PATCH de producto reemplaza sus imágenes"
```

---

# F4 · Frontend: productos

### Task 3: Métodos de catálogo en el cliente admin

**Archivos:**
- Modificar: `frontend/src/admin/api.js`
- Modificar: `frontend/src/admin/api.test.js`

**Interfaces:**
- Consume: `request(path, { method, body })` de `../shared/httpClient.js`.
- Produce, en `adminApi`:
  `listProducts({ page, pageSize })`, `createProduct(datos)`,
  `updateProduct(id, datos)`, `deleteProduct(id)`,
  `listCategories()`, `createCategory(datos)`, `updateCategory(id, datos)`, `deleteCategory(id)`,
  `listBrands()`, `createBrand(datos)`, `updateBrand(id, datos)`, `deleteBrand(id)`.
  Los consumen las Tasks 5, 6 y 7.

- [ ] **Paso 1: Escribir el test que falla**

Añadir a `frontend/src/admin/api.test.js`, reutilizando sus ayudantes
(`stubLocalStorage`, `json`, `loadAdminApi`):

```js
describe('adminApi · catálogo', () => {
  it('pide los productos incluyendo los desactivados', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { items: [], total: 0 }))

    await adminApi.listProducts({ page: 1, pageSize: 50 })

    const url = globalThis.fetch.mock.calls[0][0]
    expect(url).toContain('/products?')
    expect(url).toContain('includeInactive=true')
    expect(url).toContain('pageSize=50')
  })

  it('crea un producto con POST', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(201, { product: {} }))

    await adminApi.createProduct({ name: 'Nuevo' })

    const [url, opciones] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/products')
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body)).toEqual({ name: 'Nuevo' })
  })

  it('lista categorías y marcas incluyendo las inactivas', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { categories: [] }))
    await adminApi.listCategories()
    expect(globalThis.fetch.mock.calls[0][0]).toContain('/categories?includeInactive=true')

    globalThis.fetch = vi.fn().mockResolvedValue(json(200, { brands: [] }))
    await adminApi.listBrands()
    expect(globalThis.fetch.mock.calls[0][0]).toContain('/brands?includeInactive=true')
  })

  it('borra con DELETE', async () => {
    const { adminApi } = await loadAdminApi()
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204, json: async () => ({}) })

    await adminApi.deleteProduct('p1')

    const [url, opciones] = globalThis.fetch.mock.calls[0]
    expect(url).toContain('/products/p1')
    expect(opciones.method).toBe('DELETE')
  })
})
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx vitest run src/admin/api.test.js
```

Esperado: FALLA — `adminApi.listProducts` no existe.

- [ ] **Paso 3: Implementar**

Añadir al objeto `adminApi` en `frontend/src/admin/api.js`, tras
`updateOrderStatus`:

```js
  // ---- Catálogo ----
  // El panel siempre pide los inactivos: si no, un producto desactivado
  // desaparecería de la lista y no habría forma de reactivarlo.
  listProducts: ({ page = 1, pageSize = 50 } = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      includeInactive: 'true',
    })
    return request(`/products?${params}`)
  },
  createProduct: (datos) => request('/products', { method: 'POST', body: datos }),
  updateProduct: (id, datos) => request(`/products/${id}`, { method: 'PATCH', body: datos }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  listCategories: () => request('/categories?includeInactive=true'),
  createCategory: (datos) => request('/categories', { method: 'POST', body: datos }),
  updateCategory: (id, datos) => request(`/categories/${id}`, { method: 'PATCH', body: datos }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  listBrands: () => request('/brands?includeInactive=true'),
  createBrand: (datos) => request('/brands', { method: 'POST', body: datos }),
  updateBrand: (id, datos) => request(`/brands/${id}`, { method: 'PATCH', body: datos }),
  deleteBrand: (id) => request(`/brands/${id}`, { method: 'DELETE' }),
```

- [ ] **Paso 4: Verificar**

```bash
npx vitest run src/admin/api.test.js
```

Esperado: PASAN, incluidos los 4 tests previos.

- [ ] **Paso 5: Confirmar**

```bash
git add frontend/src/admin/api.js frontend/src/admin/api.test.js
git commit -m "feat(admin): cliente de los endpoints de catálogo"
```

---

### Task 4: Lógica pura de productos

**Archivos:**
- Crear: `frontend/src/admin/catalog/productsModel.js`
- Test: `frontend/src/admin/catalog/productsModel.test.js`

**Interfaces:**
- Produce: `formularioVacio(brandId, categoryId)`, `productoAFormulario(p)`,
  `formularioAPayload(f)`, `validarProducto(f)` → `{}` o `{ campo: mensaje }`,
  `moverImagen(imagenes, desde, hacia)`. Los consumen las Tasks 5 y 6.

- [ ] **Paso 1: Escribir el test que falla**

Crear `frontend/src/admin/catalog/productsModel.test.js`:

```js
import { describe, expect, it } from 'vitest'
import {
  formularioAPayload,
  formularioVacio,
  moverImagen,
  productoAFormulario,
  validarProducto,
} from './productsModel.js'

describe('formularioVacio', () => {
  it('arranca activo y con stock y precio en blanco', () => {
    const f = formularioVacio('b1', 'c1')
    expect(f.brandId).toBe('b1')
    expect(f.categoryId).toBe('c1')
    expect(f.isActive).toBe(true)
    expect(f.price).toBe('')
    expect(f.images).toEqual([])
  })
})

describe('validarProducto', () => {
  const base = () => ({
    ...formularioVacio('b1', 'c1'),
    name: 'Estuche',
    sku: 'PA-1',
    description: 'Descripción',
    price: '79900',
    stock: '10',
  })

  it('acepta un formulario completo', () => {
    expect(validarProducto(base())).toEqual({})
  })

  it('exige nombre, sku y descripción', () => {
    const e = validarProducto({ ...base(), name: '  ', sku: '', description: '' })
    expect(e.name).toBeTruthy()
    expect(e.sku).toBeTruthy()
    expect(e.description).toBeTruthy()
  })

  it('exige que el precio sea mayor que cero', () => {
    expect(validarProducto({ ...base(), price: '0' }).price).toBeTruthy()
    expect(validarProducto({ ...base(), price: 'abc' }).price).toBeTruthy()
    expect(validarProducto({ ...base(), price: '-5' }).price).toBeTruthy()
  })

  it('acepta stock cero pero no negativo ni decimal', () => {
    expect(validarProducto({ ...base(), stock: '0' }).stock).toBeUndefined()
    expect(validarProducto({ ...base(), stock: '-1' }).stock).toBeTruthy()
    expect(validarProducto({ ...base(), stock: '1.5' }).stock).toBeTruthy()
  })

  it('exige marca y categoría', () => {
    const e = validarProducto({ ...base(), brandId: '', categoryId: '' })
    expect(e.brandId).toBeTruthy()
    expect(e.categoryId).toBeTruthy()
  })

  it('rechaza una imagen sin URL', () => {
    const e = validarProducto({ ...base(), images: [{ url: '  ', alt: 'x' }] })
    expect(e.images).toBeTruthy()
  })
})

describe('productoAFormulario', () => {
  it('convierte nulos en cadenas vacías, para que el formulario no reviente', () => {
    const f = productoAFormulario({
      name: 'Estuche', sku: 'PA-1', description: 'd',
      brandId: 'b1', categoryId: 'c1', price: 79900, stock: 10,
      presentation: null, sizeMl: null, usageType: null, skinType: null,
      ingredients: null, warnings: null, isActive: false,
      images: [{ url: 'a.png', alt: null, position: 0 }],
    })
    expect(f.presentation).toBe('')
    expect(f.sizeMl).toBe('')
    expect(f.price).toBe('79900')
    expect(f.isActive).toBe(false)
    expect(f.images).toEqual([{ url: 'a.png', alt: '' }])
  })
})

describe('formularioAPayload', () => {
  it('convierte números y manda null en los opcionales vacíos', () => {
    const p = formularioAPayload({
      ...formularioVacio('b1', 'c1'),
      name: ' Estuche ', sku: ' PA-1 ', description: 'd',
      price: '79900', stock: '10', sizeMl: '', presentation: '',
    })
    expect(p.name).toBe('Estuche')
    expect(p.sku).toBe('PA-1')
    expect(p.price).toBe(79900)
    expect(p.stock).toBe(10)
    expect(p.sizeMl).toBeNull()
    expect(p.presentation).toBeNull()
  })

  it('numera las imágenes por su orden en la lista', () => {
    const p = formularioAPayload({
      ...formularioVacio('b1', 'c1'),
      name: 'x', sku: 'y', description: 'z', price: '1', stock: '0',
      images: [{ url: 'a.png', alt: 'A' }, { url: 'b.png', alt: '' }],
    })
    expect(p.images).toEqual([
      { url: 'a.png', alt: 'A', position: 0 },
      { url: 'b.png', alt: null, position: 1 },
    ])
  })
})

describe('moverImagen', () => {
  const tres = [{ url: 'a' }, { url: 'b' }, { url: 'c' }]

  it('mueve una imagen a otra posición', () => {
    expect(moverImagen(tres, 0, 1).map((i) => i.url)).toEqual(['b', 'a', 'c'])
    expect(moverImagen(tres, 2, 0).map((i) => i.url)).toEqual(['c', 'a', 'b'])
  })

  it('ignora los movimientos fuera de rango', () => {
    expect(moverImagen(tres, 0, -1)).toEqual(tres)
    expect(moverImagen(tres, 2, 3)).toEqual(tres)
  })

  it('no modifica la lista original', () => {
    const copia = [...tres]
    moverImagen(tres, 0, 2)
    expect(tres).toEqual(copia)
  })
})
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx vitest run src/admin/catalog/productsModel.test.js
```

Esperado: FALLA — no existe `./productsModel.js`.

- [ ] **Paso 3: Implementar**

Crear `frontend/src/admin/catalog/productsModel.js`:

```js
// Lógica pura del formulario de productos: conversión, validación y orden de
// las imágenes. Aparte del componente para poder probarla sin montar React
// (Vitest corre en entorno node, sin DOM).
//
// El formulario guarda TODO como cadena, incluidos precio y stock: es lo que
// devuelven los <input>, y convertir en el borde evita que un campo a medio
// escribir se vuelva NaN mientras se teclea.

/** Formulario en blanco para dar de alta un producto. */
export function formularioVacio(brandId = '', categoryId = '') {
  return {
    name: '',
    sku: '',
    description: '',
    brandId,
    categoryId,
    price: '',
    stock: '',
    presentation: '',
    sizeMl: '',
    usageType: '',
    skinType: '',
    ingredients: '',
    warnings: '',
    isActive: true,
    images: [],
  }
}

/** Pasa un producto de la API al formulario. Los nulos se vuelven ''. */
export function productoAFormulario(p) {
  const texto = (v) => (v == null ? '' : String(v))
  return {
    name: texto(p.name),
    sku: texto(p.sku),
    description: texto(p.description),
    brandId: texto(p.brandId),
    categoryId: texto(p.categoryId),
    price: texto(p.price),
    stock: texto(p.stock),
    presentation: texto(p.presentation),
    sizeMl: texto(p.sizeMl),
    usageType: texto(p.usageType),
    skinType: texto(p.skinType),
    ingredients: texto(p.ingredients),
    warnings: texto(p.warnings),
    isActive: p.isActive !== false,
    images: (p.images ?? []).map((i) => ({ url: texto(i.url), alt: texto(i.alt) })),
  }
}

/** Errores por campo. `{}` significa que el formulario es válido. */
export function validarProducto(f) {
  const errores = {}

  if (!f.name?.trim()) errores.name = 'El nombre es obligatorio'
  if (!f.sku?.trim()) errores.sku = 'El SKU es obligatorio'
  if (!f.description?.trim()) errores.description = 'La descripción es obligatoria'
  if (!f.brandId) errores.brandId = 'Elige una marca'
  if (!f.categoryId) errores.categoryId = 'Elige una categoría'

  const precio = Number(f.price)
  if (!f.price?.trim() || !Number.isFinite(precio) || precio <= 0) {
    errores.price = 'El precio debe ser mayor que cero'
  }

  const stock = Number(f.stock)
  if (!f.stock?.trim() || !Number.isInteger(stock) || stock < 0) {
    errores.stock = 'El stock debe ser un entero de cero en adelante'
  }

  if ((f.images ?? []).some((i) => !i.url?.trim())) {
    errores.images = 'Hay una imagen sin dirección; complétala o quítala'
  }

  return errores
}

/** Pasa el formulario al cuerpo que espera la API. */
export function formularioAPayload(f) {
  const opcional = (v) => (v?.trim() ? v.trim() : null)
  const numeroOpcional = (v) => (v?.trim() ? Number(v) : null)

  return {
    name: f.name.trim(),
    sku: f.sku.trim(),
    description: f.description.trim(),
    brandId: f.brandId,
    categoryId: f.categoryId,
    price: Number(f.price),
    stock: Number(f.stock),
    presentation: opcional(f.presentation),
    sizeMl: numeroOpcional(f.sizeMl),
    usageType: opcional(f.usageType),
    skinType: opcional(f.skinType),
    ingredients: opcional(f.ingredients),
    warnings: opcional(f.warnings),
    isActive: f.isActive,
    // La posición sale del orden de la lista: es lo que el usuario ve y arrastra.
    images: (f.images ?? []).map((img, i) => ({
      url: img.url.trim(),
      alt: img.alt?.trim() ? img.alt.trim() : null,
      position: i,
    })),
  }
}

/** Devuelve una copia con la imagen movida. Fuera de rango, la deja igual. */
export function moverImagen(imagenes, desde, hacia) {
  if (hacia < 0 || hacia >= imagenes.length || desde < 0 || desde >= imagenes.length) {
    return imagenes
  }
  const copia = [...imagenes]
  const [movida] = copia.splice(desde, 1)
  copia.splice(hacia, 0, movida)
  return copia
}
```

- [ ] **Paso 4: Ejecutar el test para verificar que pasa**

```bash
npx vitest run src/admin/catalog/productsModel.test.js
```

Esperado: PASAN los 13 tests.

- [ ] **Paso 5: Confirmar**

```bash
git add frontend/src/admin/catalog
git commit -m "feat(admin): lógica pura del formulario de productos"
```

---

### Task 5: Componente de confirmación y lista de productos

**Archivos:**
- Modificar: `frontend/src/admin/components/ui.jsx` (añadir `Confirmacion`)
- Crear: `frontend/src/admin/catalog/ProductsPage.jsx`
- Modificar: `frontend/src/admin/AdminApp.jsx`

**Interfaces:**
- Consume: `adminApi.listProducts`, `adminApi.deleteProduct`,
  `adminApi.updateProduct`, `adminApi.listBrands`, `adminApi.listCategories`
  (Task 3); `Table`, `Badge`, `FilaMensaje`, `Modal` de `../components/ui.jsx`;
  `formatCOP` de `../../shared/format.js`.
- Produce: `Confirmacion({ titulo, mensaje, textoConfirmar, onConfirmar,
  onCerrar, enviando, error })` en `components/ui.jsx`, que reutilizan las Tasks
  7 y 9. `ProductsPage` recibe la prop `onEditar(producto | null)`.

- [ ] **Paso 1: Añadir el componente de confirmación**

Al final de `frontend/src/admin/components/ui.jsx`:

```jsx
/** Diálogo de confirmación para acciones que no se pueden deshacer. */
export function Confirmacion({
  titulo,
  mensaje,
  textoConfirmar = 'Confirmar',
  onConfirmar,
  onCerrar,
  enviando,
  error,
}) {
  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-[#6A5A4A]">{mensaje}</p>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            ⚠️ {error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="rounded-full border border-[#E7D9C4] px-5 py-2.5 text-sm font-bold text-[#6A3A1C] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={enviando}
            className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-extrabold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {enviando ? 'Un momento…' : textoConfirmar}
          </button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Paso 2: Crear la lista de productos**

Crear `frontend/src/admin/catalog/ProductsPage.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { formatCOP } from '../../shared/format.js'
import { ErrorBanner } from '../../shared/ui.jsx'
import { Badge, Confirmacion, FilaMensaje, Table } from '../components/ui.jsx'

const COLUMNAS = ['Producto', 'SKU', 'Precio', 'Stock', 'Estado', '']

export default function ProductsPage({ onEditar }) {
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(null)
  const [aBorrar, setABorrar] = useState(null)
  const [errorBorrado, setErrorBorrado] = useState('')

  const cargar = useCallback(async () => {
    setError('')
    try {
      const { items } = await adminApi.listProducts({ pageSize: 100 })
      setProductos(items)
    } catch (err) {
      setError(err.message)
      setProductos([])
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Activar y desactivar es la operación del día a día, así que va en la lista
  // y no escondida dentro del formulario.
  const alternarActivo = async (p) => {
    setOcupado(p.id)
    setError('')
    try {
      await adminApi.updateProduct(p.id, { isActive: !p.isActive })
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(null)
    }
  }

  const borrar = async () => {
    setOcupado(aBorrar.id)
    setErrorBorrado('')
    try {
      await adminApi.deleteProduct(aBorrar.id)
      setABorrar(null)
      await cargar()
    } catch (err) {
      // El backend responde 409 si el producto ya tiene pedidos: no se puede
      // borrar sin romper el historial. Se sugiere desactivarlo.
      setErrorBorrado(err.message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl">Productos</h1>
        <button
          onClick={() => onEditar(null)}
          className="rounded-full bg-gradient-to-r from-peach-500 to-peach-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-peach-500/30"
        >
          Nuevo producto
        </button>
      </div>

      <ErrorBanner message={error} />

      <Table columnas={COLUMNAS}>
        {productos === null && <FilaMensaje columnas={COLUMNAS.length}>Cargando productos…</FilaMensaje>}
        {productos?.length === 0 && (
          <FilaMensaje columnas={COLUMNAS.length}>Todavía no hay productos.</FilaMensaje>
        )}
        {productos?.map((p) => (
          <tr key={p.id} className="border-b border-[#F1E7D8] last:border-0 hover:bg-[#FFF9F0]">
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                {p.images?.[0] && (
                  <img
                    src={p.images[0].url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-lg bg-[#FFF3DE] object-contain"
                  />
                )}
                <span className="font-bold">{p.name}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-[#6A5A4A]">{p.sku}</td>
            <td className="px-4 py-3 font-semibold">{formatCOP(p.price)}</td>
            <td className="px-4 py-3 text-[#6A5A4A]">{p.stock}</td>
            <td className="px-4 py-3">
              <Badge tono={p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                {p.isActive ? 'Activo' : 'Desactivado'}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2 whitespace-nowrap">
                <button
                  onClick={() => onEditar(p)}
                  className="rounded-full border border-[#E7D9C4] px-3 py-1.5 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE]"
                >
                  Editar
                </button>
                <button
                  onClick={() => alternarActivo(p)}
                  disabled={ocupado === p.id}
                  className="rounded-full border border-[#E7D9C4] px-3 py-1.5 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE] disabled:opacity-40"
                >
                  {p.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => {
                    setABorrar(p)
                    setErrorBorrado('')
                  }}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  Borrar
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {aBorrar && (
        <Confirmacion
          titulo={`Borrar ${aBorrar.name}`}
          mensaje="Se borra de forma permanente. Si el producto ya aparece en algún pedido no se podrá borrar: en ese caso desactívalo, así deja de venderse pero el historial se conserva."
          textoConfirmar="Sí, borrar"
          enviando={ocupado === aBorrar.id}
          error={errorBorrado}
          onCerrar={() => setABorrar(null)}
          onConfirmar={borrar}
        />
      )}
    </div>
  )
}
```

- [ ] **Paso 3: Enchufar la sección en el shell**

En `frontend/src/admin/AdminApp.jsx`, añadir el import:

```jsx
import ProductsPage from './catalog/ProductsPage.jsx'
```

Añadir el estado del producto en edición, junto a los `useState` que ya hay:

```jsx
  // `null` = ninguno; un objeto = editando ese producto; `'nuevo'` = alta.
  const [productoEnEdicion, setProductoEnEdicion] = useState(null)
```

Y sustituir la línea del marcador de `productos`:

```jsx
          {route.name === 'productos' && (
            <ProductsPage onEditar={(p) => setProductoEnEdicion(p ?? 'nuevo')} />
          )}
```

> El formulario en sí llega en la Task 6. Por ahora el estado se guarda y no se
> pinta nada: la lista ya es usable para activar, desactivar y borrar.

- [ ] **Paso 4: Verificar**

```bash
npm test && npm run build
```

Esperado: 51 tests más los de la Task 4, y las 4 páginas compilando.

- [ ] **Paso 5: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): lista de productos con activar, desactivar y borrar"
```

---

### Task 6: Formulario de producto con editor de imágenes

**Archivos:**
- Crear: `frontend/src/admin/catalog/ProductForm.jsx`
- Modificar: `frontend/src/admin/AdminApp.jsx`

**Interfaces:**
- Consume: todo lo de `productsModel.js` (Task 4); `adminApi.createProduct`,
  `adminApi.updateProduct`, `adminApi.listBrands`, `adminApi.listCategories`
  (Task 3); `Modal` de `../components/ui.jsx`; `Field`, `Input`, `ErrorBanner`,
  `PrimaryButton`, `SecondaryButton` de `../../shared/ui.jsx`.
- Produce: `ProductForm({ producto, onCerrar, onGuardado })`, donde `producto`
  es un objeto de la API o la cadena `'nuevo'`.

- [ ] **Paso 1: Crear el formulario**

Crear `frontend/src/admin/catalog/ProductForm.jsx`:

```jsx
import { useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { ErrorBanner, Field, Input, PrimaryButton, SecondaryButton } from '../../shared/ui.jsx'
import { Modal } from '../components/ui.jsx'
import {
  formularioAPayload,
  formularioVacio,
  moverImagen,
  productoAFormulario,
  validarProducto,
} from './productsModel.js'

function Selector({ label, value, onChange, opciones, error }) {
  return (
    <Field label={label} error={error}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
      >
        <option value="">Elige una opción…</option>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </Field>
  )
}

export default function ProductForm({ producto, onCerrar, onGuardado }) {
  const esNuevo = producto === 'nuevo'
  const [form, setForm] = useState(() =>
    esNuevo ? formularioVacio() : productoAFormulario(producto),
  )
  const [marcas, setMarcas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vigente = true
    Promise.all([adminApi.listBrands(), adminApi.listCategories()])
      .then(([b, c]) => {
        if (!vigente) return
        setMarcas(b.brands)
        setCategorias(c.categories)
        // En un alta, si solo hay una marca y una categoría se preseleccionan:
        // con un catálogo de un producto, elegirlas cada vez es puro estorbo.
        if (esNuevo) {
          setForm((f) => ({
            ...f,
            brandId: f.brandId || (b.brands.length === 1 ? b.brands[0].id : ''),
            categoryId: f.categoryId || (c.categories.length === 1 ? c.categories[0].id : ''),
          }))
        }
      })
      .catch((err) => vigente && setError(err.message))
    return () => {
      vigente = false
    }
  }, [esNuevo])

  const campo = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const cambiarImagen = (i, k, v) =>
    setForm((f) => ({
      ...f,
      images: f.images.map((img, j) => (j === i ? { ...img, [k]: v } : img)),
    }))

  const guardar = async (e) => {
    e.preventDefault()
    const errs = validarProducto(form)
    setErrores(errs)
    if (Object.keys(errs).length > 0) return

    setGuardando(true)
    setError('')
    try {
      const payload = formularioAPayload(form)
      if (esNuevo) await adminApi.createProduct(payload)
      else await adminApi.updateProduct(producto.id, payload)
      onGuardado()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={esNuevo ? 'Nuevo producto' : `Editar ${producto.name}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field label="Nombre" error={errores.name}>
          <Input value={form.name} onChange={(e) => campo('name')(e.target.value)} />
        </Field>

        <Field label="SKU" error={errores.sku}>
          <Input value={form.sku} onChange={(e) => campo('sku')(e.target.value)} />
        </Field>
        <p className="-mt-2 text-xs text-[#8A6A4A]">
          La dirección web del producto se genera sola a partir del nombre.
        </p>

        <Field label="Descripción" error={errores.description}>
          <textarea
            value={form.description}
            onChange={(e) => campo('description')(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Selector label="Marca" value={form.brandId} onChange={campo('brandId')} opciones={marcas} error={errores.brandId} />
          <Selector label="Categoría" value={form.categoryId} onChange={campo('categoryId')} opciones={categorias} error={errores.categoryId} />
          <Field label="Precio (COP)" error={errores.price}>
            <Input inputMode="numeric" value={form.price} onChange={(e) => campo('price')(e.target.value)} />
          </Field>
          <Field label="Stock" error={errores.stock}>
            <Input inputMode="numeric" value={form.stock} onChange={(e) => campo('stock')(e.target.value)} />
          </Field>
          <Field label="Presentación">
            <Input value={form.presentation} onChange={(e) => campo('presentation')(e.target.value)} />
          </Field>
          <Field label="Tamaño (ml)">
            <Input inputMode="numeric" value={form.sizeMl} onChange={(e) => campo('sizeMl')(e.target.value)} />
          </Field>
          <Field label="Tipo de uso">
            <Input value={form.usageType} onChange={(e) => campo('usageType')(e.target.value)} />
          </Field>
          <Field label="Tipo de piel">
            <Input value={form.skinType} onChange={(e) => campo('skinType')(e.target.value)} />
          </Field>
        </div>

        <Field label="Ingredientes">
          <textarea
            value={form.ingredients}
            onChange={(e) => campo('ingredients')(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
          />
        </Field>

        <Field label="Advertencias">
          <textarea
            value={form.warnings}
            onChange={(e) => campo('warnings')(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
          />
        </Field>

        {/* ---- Imágenes ---- */}
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">Imágenes</p>
          <p className="mb-3 text-xs text-[#8A6A4A]">
            Se guardan por dirección web: sube la foto donde la alojes y pega aquí el enlace.
            La primera es la que se ve en el catálogo.
          </p>

          {errores.images && (
            <p className="mb-2 text-xs font-semibold text-red-600">{errores.images}</p>
          )}

          <div className="space-y-3">
            {form.images.map((img, i) => (
              <div key={i} className="flex gap-3 rounded-xl border border-[#E7D9C4] p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#FFF3DE]">
                  {img.url?.trim() && (
                    <img src={img.url} alt="" className="h-full w-full object-contain" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={img.url}
                    onChange={(e) => cambiarImagen(i, 'url', e.target.value)}
                    placeholder="https://…/foto.png"
                  />
                  <Input
                    value={img.alt}
                    onChange={(e) => cambiarImagen(i, 'alt', e.target.value)}
                    placeholder="Descripción de la foto (opcional)"
                  />
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, images: moverImagen(f.images, i, i - 1) }))}
                    disabled={i === 0}
                    className="rounded border border-[#E7D9C4] px-2 text-xs font-bold text-[#6A3A1C] disabled:opacity-30"
                    aria-label="Subir"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, images: moverImagen(f.images, i, i + 1) }))}
                    disabled={i === form.images.length - 1}
                    className="rounded border border-[#E7D9C4] px-2 text-xs font-bold text-[#6A3A1C] disabled:opacity-30"
                    aria-label="Bajar"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))
                    }
                    className="rounded border border-red-200 px-2 text-xs font-bold text-red-700"
                    aria-label="Quitar"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, images: [...f.images, { url: '', alt: '' }] }))}
            className="mt-3 rounded-full border border-[#E7D9C4] px-4 py-2 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE]"
          >
            Añadir imagen
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-[#3A2A1A]">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => campo('isActive')(e.target.checked)}
          />
          Producto activo (visible en la tienda)
        </label>

        <ErrorBanner message={error} />

        <div className="flex items-center gap-3 pt-1">
          <SecondaryButton type="button" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
```

- [ ] **Paso 2: Abrirlo desde el shell**

En `frontend/src/admin/AdminApp.jsx`, añadir el import:

```jsx
import ProductForm from './catalog/ProductForm.jsx'
```

Y sustituir el bloque de la ruta `productos` por:

```jsx
          {route.name === 'productos' && (
            <>
              <ProductsPage
                key={recargaProductos}
                onEditar={(p) => setProductoEnEdicion(p ?? 'nuevo')}
              />
              {productoEnEdicion && (
                <ProductForm
                  producto={productoEnEdicion}
                  onCerrar={() => setProductoEnEdicion(null)}
                  onGuardado={() => {
                    setProductoEnEdicion(null)
                    // Cambiar la `key` remonta la lista y la obliga a recargar.
                    setRecargaProductos((n) => n + 1)
                  }}
                />
              )}
            </>
          )}
```

Añadir el contador junto a los demás `useState`:

```jsx
  const [recargaProductos, setRecargaProductos] = useState(0)
```

- [ ] **Paso 3: Verificar**

```bash
npm test && npm run build
```

Esperado: limpio.

- [ ] **Paso 4: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): formulario de producto con editor de imágenes"
```

---

### Task 7: Categorías y marcas

**Archivos:**
- Crear: `frontend/src/admin/catalog/TaxonomyPage.jsx`
- Modificar: `frontend/src/admin/AdminApp.jsx`

**Interfaces:**
- Consume: los métodos de categorías y marcas de `adminApi` (Task 3);
  `Confirmacion`, `Table`, `Badge`, `FilaMensaje` (Task 5).
- Produce: `TaxonomyPage` sin props.

- [ ] **Paso 1: Crear la pantalla**

Crear `frontend/src/admin/catalog/TaxonomyPage.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { ErrorBanner, Input, PrimaryButton } from '../../shared/ui.jsx'
import { Badge, Confirmacion, FilaMensaje, Table } from '../components/ui.jsx'

const COLUMNAS = ['Nombre', 'Estado', '']

/**
 * Categorías y marcas comparten forma —nombre, descripción, activo— así que
 * comparten componente. `acciones` inyecta las cuatro llamadas del recurso.
 */
function Seccion({ titulo, singular, acciones }) {
  const [items, setItems] = useState(null)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(null)
  const [aBorrar, setABorrar] = useState(null)
  const [errorBorrado, setErrorBorrado] = useState('')

  const cargar = useCallback(async () => {
    setError('')
    try {
      setItems(await acciones.listar())
    } catch (err) {
      setError(err.message)
      setItems([])
    }
  }, [acciones])

  useEffect(() => {
    cargar()
  }, [cargar])

  const crear = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setOcupado('nuevo')
    setError('')
    try {
      await acciones.crear({ name: nombre.trim() })
      setNombre('')
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(null)
    }
  }

  const alternar = async (item) => {
    setOcupado(item.id)
    setError('')
    try {
      await acciones.actualizar(item.id, { isActive: !item.isActive })
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setOcupado(null)
    }
  }

  const borrar = async () => {
    setOcupado(aBorrar.id)
    setErrorBorrado('')
    try {
      await acciones.borrar(aBorrar.id)
      setABorrar(null)
      await cargar()
    } catch (err) {
      setErrorBorrado(err.message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl">{titulo}</h2>

      <form onSubmit={crear} className="flex gap-2">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={`Nombre de la ${singular}`}
        />
        <PrimaryButton type="submit" disabled={ocupado === 'nuevo'} className="w-auto shrink-0 px-5">
          Añadir
        </PrimaryButton>
      </form>

      <ErrorBanner message={error} />

      <Table columnas={COLUMNAS}>
        {items === null && <FilaMensaje columnas={3}>Cargando…</FilaMensaje>}
        {items?.length === 0 && <FilaMensaje columnas={3}>Todavía no hay nada aquí.</FilaMensaje>}
        {items?.map((item) => (
          <tr key={item.id} className="border-b border-[#F1E7D8] last:border-0">
            <td className="px-4 py-3 font-bold">{item.name}</td>
            <td className="px-4 py-3">
              <Badge tono={item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                {item.isActive ? 'Activa' : 'Desactivada'}
              </Badge>
            </td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2 whitespace-nowrap">
                <button
                  onClick={() => alternar(item)}
                  disabled={ocupado === item.id}
                  className="rounded-full border border-[#E7D9C4] px-3 py-1.5 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE] disabled:opacity-40"
                >
                  {item.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => {
                    setABorrar(item)
                    setErrorBorrado('')
                  }}
                  className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50"
                >
                  Borrar
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {aBorrar && (
        <Confirmacion
          titulo={`Borrar ${aBorrar.name}`}
          mensaje={`Si algún producto usa esta ${singular} no se podrá borrar. En ese caso desactívala.`}
          textoConfirmar="Sí, borrar"
          enviando={ocupado === aBorrar.id}
          error={errorBorrado}
          onCerrar={() => setABorrar(null)}
          onConfirmar={borrar}
        />
      )}
    </section>
  )
}

const ACCIONES_CATEGORIAS = {
  listar: async () => (await adminApi.listCategories()).categories,
  crear: (datos) => adminApi.createCategory(datos),
  actualizar: (id, datos) => adminApi.updateCategory(id, datos),
  borrar: (id) => adminApi.deleteCategory(id),
}

const ACCIONES_MARCAS = {
  listar: async () => (await adminApi.listBrands()).brands,
  crear: (datos) => adminApi.createBrand(datos),
  actualizar: (id, datos) => adminApi.updateBrand(id, datos),
  borrar: (id) => adminApi.deleteBrand(id),
}

export default function TaxonomyPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Seccion titulo="Categorías" singular="categoría" acciones={ACCIONES_CATEGORIAS} />
      <Seccion titulo="Marcas" singular="marca" acciones={ACCIONES_MARCAS} />
    </div>
  )
}
```

> Los objetos de acciones se definen **fuera** del componente a propósito: si se
> crearan en cada render, el `useCallback` de `cargar` cambiaría siempre y el
> `useEffect` recargaría en bucle.

- [ ] **Paso 2: Enchufarla**

En `AdminApp.jsx`, añadir el import y sustituir el marcador:

```jsx
import TaxonomyPage from './catalog/TaxonomyPage.jsx'
```

```jsx
          {route.name === 'taxonomia' && <TaxonomyPage />}
```

- [ ] **Paso 3: Verificar**

```bash
npm test && npm run build
```

- [ ] **Paso 4: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): pantalla de categorías y marcas"
```

---

# F5 · Cupones

### Task 8: Lógica pura y cliente de cupones

**Archivos:**
- Crear: `frontend/src/admin/coupons/couponsModel.js`
- Test: `frontend/src/admin/coupons/couponsModel.test.js`
- Modificar: `frontend/src/admin/api.js`

**Interfaces:**
- Produce: `formularioVacioCupon()`, `cuponAFormulario(c)`,
  `formularioAPayloadCupon(f, { esNuevo })`, `validarCupon(f)`,
  `descripcionDescuento(c)`, `estadoCupon(c, ahora)`. Y en `adminApi`:
  `listCoupons()`, `createCoupon(datos)`, `updateCoupon(id, datos)`.

- [ ] **Paso 1: Escribir el test que falla**

Crear `frontend/src/admin/coupons/couponsModel.test.js`:

```js
import { describe, expect, it } from 'vitest'
import {
  cuponAFormulario,
  descripcionDescuento,
  estadoCupon,
  formularioAPayloadCupon,
  formularioVacioCupon,
  validarCupon,
} from './couponsModel.js'

describe('validarCupon', () => {
  const base = () => ({ ...formularioVacioCupon(), code: 'BIENVENIDA10', value: '10' })

  it('acepta un cupón porcentual válido', () => {
    expect(validarCupon(base())).toEqual({})
  })

  it('exige código de al menos 3 caracteres', () => {
    expect(validarCupon({ ...base(), code: 'AB' }).code).toBeTruthy()
  })

  it('exige un valor mayor que cero', () => {
    expect(validarCupon({ ...base(), value: '0' }).value).toBeTruthy()
    expect(validarCupon({ ...base(), value: '' }).value).toBeTruthy()
  })

  it('no deja pasar un porcentaje mayor que 100', () => {
    expect(validarCupon({ ...base(), type: 'PERCENTAGE', value: '120' }).value).toBeTruthy()
    expect(validarCupon({ ...base(), type: 'FIXED', value: '120000' }).value).toBeUndefined()
  })

  it('exige que la fecha de inicio sea anterior a la de fin', () => {
    const e = validarCupon({ ...base(), startsAt: '2026-12-31', endsAt: '2026-01-01' })
    expect(e.endsAt).toBeTruthy()
  })
})

describe('formularioAPayloadCupon', () => {
  it('manda el código solo al crear: un cupón no se puede renombrar', () => {
    const f = { ...formularioVacioCupon(), code: 'nuevo10', value: '10' }
    expect(formularioAPayloadCupon(f, { esNuevo: true }).code).toBe('NUEVO10')
    expect(formularioAPayloadCupon(f, { esNuevo: false }).code).toBeUndefined()
  })

  it('convierte números y omite los opcionales vacíos', () => {
    const p = formularioAPayloadCupon(
      { ...formularioVacioCupon(), code: 'X10', value: '10', minPurchase: '50000', maxUses: '' },
      { esNuevo: true },
    )
    expect(p.value).toBe(10)
    expect(p.minPurchase).toBe(50000)
    expect('maxUses' in p).toBe(false)
  })
})

describe('descripcionDescuento', () => {
  it('describe el descuento en palabras', () => {
    expect(descripcionDescuento({ type: 'PERCENTAGE', value: 10 })).toBe('10 % de descuento')
    expect(descripcionDescuento({ type: 'FIXED', value: 15000 })).toContain('15.000')
  })
})

describe('estadoCupon', () => {
  const ahora = new Date('2026-06-15T12:00:00Z')

  it('marca como desactivado el que no está activo', () => {
    expect(estadoCupon({ isActive: false }, ahora).etiqueta).toBe('Desactivado')
  })

  it('marca el que aún no empieza y el que ya expiró', () => {
    expect(estadoCupon({ isActive: true, startsAt: '2026-07-01' }, ahora).etiqueta).toBe('Programado')
    expect(estadoCupon({ isActive: true, endsAt: '2026-01-01' }, ahora).etiqueta).toBe('Expirado')
  })

  it('marca el que agotó sus usos', () => {
    expect(estadoCupon({ isActive: true, maxUses: 5, usedCount: 5 }, ahora).etiqueta).toBe('Agotado')
  })

  it('el resto está vigente', () => {
    expect(estadoCupon({ isActive: true, maxUses: 5, usedCount: 2 }, ahora).etiqueta).toBe('Vigente')
  })
})
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx vitest run src/admin/coupons/couponsModel.test.js
```

Esperado: FALLA — no existe el módulo.

- [ ] **Paso 3: Implementar el modelo**

Crear `frontend/src/admin/coupons/couponsModel.js`:

```js
// Lógica pura de cupones: conversión, validación y el estado que se muestra.
import { formatCOP } from '../../shared/format.js'

export function formularioVacioCupon() {
  return {
    code: '',
    type: 'PERCENTAGE',
    value: '',
    minPurchase: '',
    maxUses: '',
    perUserLimit: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
  }
}

/** Pasa un cupón de la API al formulario. Las fechas se recortan a YYYY-MM-DD. */
export function cuponAFormulario(c) {
  const texto = (v) => (v == null ? '' : String(v))
  const fecha = (v) => (v ? String(v).slice(0, 10) : '')
  return {
    code: texto(c.code),
    type: c.type ?? 'PERCENTAGE',
    value: texto(c.value),
    minPurchase: texto(c.minPurchase),
    maxUses: texto(c.maxUses),
    perUserLimit: texto(c.perUserLimit),
    startsAt: fecha(c.startsAt),
    endsAt: fecha(c.endsAt),
    isActive: c.isActive !== false,
  }
}

export function validarCupon(f) {
  const errores = {}

  if (!f.code?.trim() || f.code.trim().length < 3) {
    errores.code = 'El código debe tener al menos 3 caracteres'
  }

  const valor = Number(f.value)
  if (!f.value?.trim() || !Number.isFinite(valor) || valor <= 0) {
    errores.value = 'El valor debe ser mayor que cero'
  } else if (f.type === 'PERCENTAGE' && valor > 100) {
    errores.value = 'Un descuento porcentual no puede pasar de 100'
  }

  if (f.startsAt && f.endsAt && f.startsAt >= f.endsAt) {
    errores.endsAt = 'La fecha de fin debe ser posterior a la de inicio'
  }

  return errores
}

/**
 * Cuerpo para la API. `esNuevo` importa: `updateCouponSchema` no acepta `code`,
 * porque un cupón ya repartido no se puede renombrar sin romper a quien lo tenga.
 */
export function formularioAPayloadCupon(f, { esNuevo }) {
  const numero = (v) => (v?.trim() ? Number(v) : undefined)
  const payload = {
    type: f.type,
    value: Number(f.value),
    isActive: f.isActive,
  }

  if (esNuevo) payload.code = f.code.trim().toUpperCase()

  const min = numero(f.minPurchase)
  if (min !== undefined) payload.minPurchase = min
  const max = numero(f.maxUses)
  if (max !== undefined) payload.maxUses = max
  const porUsuario = numero(f.perUserLimit)
  if (porUsuario !== undefined) payload.perUserLimit = porUsuario
  if (f.startsAt) payload.startsAt = f.startsAt
  if (f.endsAt) payload.endsAt = f.endsAt

  return payload
}

export function descripcionDescuento(c) {
  return c.type === 'PERCENTAGE' ? `${c.value} % de descuento` : `${formatCOP(c.value)} de descuento`
}

/** Estado que se muestra en la lista, con su tono. */
export function estadoCupon(c, ahora = new Date()) {
  if (!c.isActive) return { etiqueta: 'Desactivado', tono: 'bg-gray-100 text-gray-600' }
  if (c.startsAt && new Date(c.startsAt) > ahora) {
    return { etiqueta: 'Programado', tono: 'bg-sky-50 text-sky-700' }
  }
  if (c.endsAt && new Date(c.endsAt) < ahora) {
    return { etiqueta: 'Expirado', tono: 'bg-red-50 text-red-700' }
  }
  if (c.maxUses != null && (c.usedCount ?? 0) >= c.maxUses) {
    return { etiqueta: 'Agotado', tono: 'bg-amber-50 text-amber-700' }
  }
  return { etiqueta: 'Vigente', tono: 'bg-emerald-50 text-emerald-700' }
}
```

- [ ] **Paso 4: Añadir los métodos al cliente**

Al objeto `adminApi` de `frontend/src/admin/api.js`:

```js
  // ---- Cupones ----
  listCoupons: () => request('/coupons?includeInactive=true'),
  createCoupon: (datos) => request('/coupons', { method: 'POST', body: datos }),
  updateCoupon: (id, datos) => request(`/coupons/${id}`, { method: 'PATCH', body: datos }),
```

- [ ] **Paso 5: Verificar**

```bash
npx vitest run src/admin/coupons/couponsModel.test.js && npm test
```

Esperado: PASAN los 12 tests nuevos y todos los anteriores.

- [ ] **Paso 6: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): lógica pura y cliente de cupones"
```

---

### Task 9: Pantalla de cupones

**Archivos:**
- Crear: `frontend/src/admin/coupons/CouponsPage.jsx`
- Modificar: `frontend/src/admin/AdminApp.jsx`

**Interfaces:**
- Consume: todo `couponsModel.js` y los tres métodos de cupones (Task 8);
  `Table`, `Badge`, `FilaMensaje`, `Modal` (Tasks 5 y anteriores).

- [ ] **Paso 1: Crear la pantalla**

Crear `frontend/src/admin/coupons/CouponsPage.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { ErrorBanner, Field, Input, PrimaryButton, SecondaryButton } from '../../shared/ui.jsx'
import { Badge, FilaMensaje, Modal, Table } from '../components/ui.jsx'
import {
  cuponAFormulario,
  descripcionDescuento,
  estadoCupon,
  formularioAPayloadCupon,
  formularioVacioCupon,
  validarCupon,
} from './couponsModel.js'

const COLUMNAS = ['Código', 'Descuento', 'Usos', 'Vigencia', 'Estado', '']

const fechaCorta = (v) => (v ? String(v).slice(0, 10) : '—')

function Formulario({ cupon, onCerrar, onGuardado }) {
  const esNuevo = cupon === 'nuevo'
  const [form, setForm] = useState(() => (esNuevo ? formularioVacioCupon() : cuponAFormulario(cupon)))
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const campo = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async (e) => {
    e.preventDefault()
    const errs = validarCupon(form)
    setErrores(errs)
    if (Object.keys(errs).length > 0) return

    setGuardando(true)
    setError('')
    try {
      const payload = formularioAPayloadCupon(form, { esNuevo })
      if (esNuevo) await adminApi.createCoupon(payload)
      else await adminApi.updateCoupon(cupon.id, payload)
      onGuardado()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal titulo={esNuevo ? 'Nuevo cupón' : `Editar ${cupon.code}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <Field label="Código" error={errores.code}>
          <Input
            value={form.code}
            onChange={(e) => campo('code')(e.target.value)}
            disabled={!esNuevo}
            placeholder="BIENVENIDA10"
          />
        </Field>
        {!esNuevo && (
          <p className="-mt-2 text-xs text-[#8A6A4A]">
            El código no se puede cambiar: quien ya lo tenga dejaría de poder usarlo.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <select
              value={form.type}
              onChange={(e) => campo('type')(e.target.value)}
              className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
            >
              <option value="PERCENTAGE">Porcentaje</option>
              <option value="FIXED">Monto fijo</option>
            </select>
          </Field>
          <Field label={form.type === 'PERCENTAGE' ? 'Porcentaje' : 'Monto (COP)'} error={errores.value}>
            <Input inputMode="numeric" value={form.value} onChange={(e) => campo('value')(e.target.value)} />
          </Field>
          <Field label="Compra mínima (COP)">
            <Input inputMode="numeric" value={form.minPurchase} onChange={(e) => campo('minPurchase')(e.target.value)} />
          </Field>
          <Field label="Máximo de usos">
            <Input inputMode="numeric" value={form.maxUses} onChange={(e) => campo('maxUses')(e.target.value)} />
          </Field>
          <Field label="Desde">
            <Input type="date" value={form.startsAt} onChange={(e) => campo('startsAt')(e.target.value)} />
          </Field>
          <Field label="Hasta" error={errores.endsAt}>
            <Input type="date" value={form.endsAt} onChange={(e) => campo('endsAt')(e.target.value)} />
          </Field>
        </div>

        <Field label="Límite por usuario">
          <Input inputMode="numeric" value={form.perUserLimit} onChange={(e) => campo('perUserLimit')(e.target.value)} />
        </Field>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <strong>Ojo con el límite por usuario:</strong> solo se puede hacer valer con clientes
          registrados. En las compras como invitado —que son la mayoría— no hay identidad que
          contar, así que ahí no limita nada. Para acotar una promoción de verdad, usa el
          <strong> máximo de usos</strong>.
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-[#3A2A1A]">
          <input type="checkbox" checked={form.isActive} onChange={(e) => campo('isActive')(e.target.checked)} />
          Cupón activo
        </label>

        <ErrorBanner message={error} />

        <div className="flex items-center gap-3 pt-1">
          <SecondaryButton type="button" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}

export default function CouponsPage() {
  const [cupones, setCupones] = useState(null)
  const [error, setError] = useState('')
  const [enEdicion, setEnEdicion] = useState(null)

  const cargar = useCallback(async () => {
    setError('')
    try {
      const { coupons } = await adminApi.listCoupons()
      setCupones(coupons)
    } catch (err) {
      setError(err.message)
      setCupones([])
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl">Cupones</h1>
        <button
          onClick={() => setEnEdicion('nuevo')}
          className="rounded-full bg-gradient-to-r from-peach-500 to-peach-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-peach-500/30"
        >
          Nuevo cupón
        </button>
      </div>

      <ErrorBanner message={error} />

      <Table columnas={COLUMNAS}>
        {cupones === null && <FilaMensaje columnas={COLUMNAS.length}>Cargando cupones…</FilaMensaje>}
        {cupones?.length === 0 && (
          <FilaMensaje columnas={COLUMNAS.length}>Todavía no has creado ningún cupón.</FilaMensaje>
        )}
        {cupones?.map((c) => {
          const estado = estadoCupon(c)
          return (
            <tr key={c.id} className="border-b border-[#F1E7D8] last:border-0 hover:bg-[#FFF9F0]">
              <td className="px-4 py-3 font-bold">{c.code}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">{descripcionDescuento(c)}</td>
              <td className="px-4 py-3 text-[#6A5A4A]">
                {c.usedCount ?? 0}
                {c.maxUses != null ? ` / ${c.maxUses}` : ''}
              </td>
              <td className="px-4 py-3 text-[#6A5A4A]">
                {fechaCorta(c.startsAt)} → {fechaCorta(c.endsAt)}
              </td>
              <td className="px-4 py-3">
                <Badge tono={estado.tono}>{estado.etiqueta}</Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => setEnEdicion(c)}
                  className="rounded-full border border-[#E7D9C4] px-3 py-1.5 text-xs font-bold text-[#6A3A1C] hover:bg-[#FFF3DE]"
                >
                  Editar
                </button>
              </td>
            </tr>
          )
        })}
      </Table>

      {enEdicion && (
        <Formulario
          cupon={enEdicion}
          onCerrar={() => setEnEdicion(null)}
          onGuardado={() => {
            setEnEdicion(null)
            cargar()
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Paso 2: Enchufarla**

En `AdminApp.jsx`:

```jsx
import CouponsPage from './coupons/CouponsPage.jsx'
```

```jsx
          {route.name === 'cupones' && <CouponsPage />}
```

- [ ] **Paso 3: Verificar**

```bash
npm test && npm run build
```

- [ ] **Paso 4: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): pantalla de cupones"
```

---

# F6 · Reportes

### Task 10: Lógica pura de reportes y barras SVG

**Archivos:**
- Crear: `frontend/src/admin/reports/reportsModel.js`
- Test: `frontend/src/admin/reports/reportsModel.test.js`
- Crear: `frontend/src/admin/reports/Bars.jsx`
- Modificar: `frontend/src/admin/api.js`

**Interfaces:**
- Produce: `rangoPorDefecto(ahora)` → `{ from, to }` en `YYYY-MM-DD`;
  `aBarras(items, { etiqueta, valor })` → `[{ etiqueta, valor, porcentaje }]`;
  `etiquetaPeriodo(periodo)`. Componente `Bars({ datos, formatear })`.
  Y en `adminApi`: `salesReport({ from, to, groupBy })`, `topProducts(limit)`,
  `ordersByStatus()`.

- [ ] **Paso 1: Escribir el test que falla**

Crear `frontend/src/admin/reports/reportsModel.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { aBarras, etiquetaPeriodo, rangoPorDefecto } from './reportsModel.js'

describe('rangoPorDefecto', () => {
  it('cubre los últimos 30 días, incluido hoy', () => {
    const { from, to } = rangoPorDefecto(new Date('2026-08-30T10:00:00Z'))
    expect(to).toBe('2026-08-30')
    expect(from).toBe('2026-08-01')
  })
})

describe('aBarras', () => {
  it('calcula el porcentaje relativo al mayor', () => {
    const barras = aBarras(
      [
        { name: 'A', revenue: 100 },
        { name: 'B', revenue: 50 },
        { name: 'C', revenue: 0 },
      ],
      { etiqueta: 'name', valor: 'revenue' },
    )
    expect(barras.map((b) => b.porcentaje)).toEqual([100, 50, 0])
    expect(barras[0].etiqueta).toBe('A')
  })

  it('no divide por cero cuando todo vale cero', () => {
    const barras = aBarras([{ name: 'A', revenue: 0 }], { etiqueta: 'name', valor: 'revenue' })
    expect(barras[0].porcentaje).toBe(0)
  })

  it('con la lista vacía devuelve una lista vacía', () => {
    expect(aBarras([], { etiqueta: 'name', valor: 'revenue' })).toEqual([])
  })
})

describe('etiquetaPeriodo', () => {
  it('formatea el día y el mes en español', () => {
    expect(etiquetaPeriodo('2026-08-30')).toContain('ago')
    expect(etiquetaPeriodo('2026-08')).toContain('ago')
  })
})
```

- [ ] **Paso 2: Ejecutar el test para verificar que falla**

```bash
npx vitest run src/admin/reports/reportsModel.test.js
```

Esperado: FALLA — no existe el módulo.

- [ ] **Paso 3: Implementar el modelo**

Crear `frontend/src/admin/reports/reportsModel.js`:

```js
// Lógica pura de los reportes: rango por defecto, escalado de las barras y
// etiquetas de periodo. El componente solo pinta.

const iso = (d) => d.toISOString().slice(0, 10)

/** Últimos 30 días, hoy incluido. Es el rango que el backend usa por defecto. */
export function rangoPorDefecto(ahora = new Date()) {
  const hasta = new Date(ahora)
  const desde = new Date(ahora)
  desde.setDate(desde.getDate() - 29)
  return { from: iso(desde), to: iso(hasta) }
}

/**
 * Convierte una lista en barras, con el porcentaje relativo al mayor valor.
 * Escalar contra el máximo —y no contra el total— es lo que hace comparables
 * dos barras de un vistazo.
 */
export function aBarras(items, { etiqueta, valor }) {
  if (items.length === 0) return []
  const maximo = Math.max(...items.map((i) => Number(i[valor]) || 0))
  return items.map((i) => {
    const v = Number(i[valor]) || 0
    return {
      etiqueta: String(i[etiqueta]),
      valor: v,
      porcentaje: maximo > 0 ? Math.round((v / maximo) * 100) : 0,
    }
  })
}

/** 'YYYY-MM-DD' o 'YYYY-MM' a algo legible: "30 ago" / "ago 2026". */
export function etiquetaPeriodo(periodo) {
  const partes = periodo.split('-')
  if (partes.length === 3) {
    const d = new Date(`${periodo}T00:00:00`)
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(d)
  }
  const d = new Date(`${periodo}-01T00:00:00`)
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(d)
}
```

- [ ] **Paso 4: Implementar las barras**

Crear `frontend/src/admin/reports/Bars.jsx`:

```jsx
// Barras horizontales en SVG plano. Sin librería de gráficas: para tres
// reportes, una dependencia de ese tamaño no se paga.
export default function Bars({ datos }) {
  if (datos.length === 0) {
    return <p className="py-6 text-center text-sm text-[#8A6A4A]">Sin datos en este periodo.</p>
  }

  const ALTO_FILA = 30
  const alto = datos.length * ALTO_FILA

  return (
    <svg
      viewBox={`0 0 100 ${alto}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: alto }}
      role="img"
      aria-label="Gráfico de barras"
    >
      {datos.map((d, i) => (
        <g key={d.etiqueta}>
          <rect x="0" y={i * ALTO_FILA + 6} width="100" height="14" rx="7" fill="#F1E7D8" />
          <rect
            x="0"
            y={i * ALTO_FILA + 6}
            width={Math.max(d.porcentaje, d.valor > 0 ? 2 : 0)}
            height="14"
            rx="7"
            fill="#FF8A3D"
          />
        </g>
      ))}
    </svg>
  )
}

/** Lista de etiquetas y valores, al lado de las barras. */
export function BarsLeyenda({ datos, formatear = (v) => v }) {
  return (
    <ul className="space-y-0" style={{ marginTop: 0 }}>
      {datos.map((d) => (
        <li key={d.etiqueta} className="flex h-[30px] items-center justify-between gap-3 text-sm">
          <span className="truncate text-[#3A2A1A]">{d.etiqueta}</span>
          <span className="shrink-0 font-bold text-[#6A3A1C]">{formatear(d.valor)}</span>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Paso 5: Añadir los métodos al cliente**

Al objeto `adminApi`:

```js
  // ---- Reportes ----
  salesReport: ({ from, to, groupBy = 'day' } = {}) => {
    const params = new URLSearchParams({ groupBy })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return request(`/admin/reports/sales?${params}`)
  },
  topProducts: (limit = 5) => request(`/admin/reports/top-products?limit=${limit}`),
  ordersByStatus: () => request('/admin/reports/orders-by-status'),
```

- [ ] **Paso 6: Verificar**

```bash
npx vitest run src/admin/reports/reportsModel.test.js && npm test
```

Esperado: PASAN los 6 tests nuevos y todos los anteriores.

- [ ] **Paso 7: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): lógica de reportes y barras en SVG"
```

---

### Task 11: Pantalla de reportes

**Archivos:**
- Crear: `frontend/src/admin/reports/ReportsPage.jsx`
- Modificar: `frontend/src/admin/AdminApp.jsx`

**Interfaces:**
- Consume: `rangoPorDefecto`, `aBarras`, `etiquetaPeriodo` (Task 10);
  `Bars` y `BarsLeyenda` (Task 10); `salesReport`, `topProducts`,
  `ordersByStatus` (Task 10); `etiquetaEstado`, `tonoEstado` de
  `../orders/ordersModel.js`; `formatCOP` de `../../shared/format.js`.

- [ ] **Paso 1: Crear la pantalla**

Crear `frontend/src/admin/reports/ReportsPage.jsx`:

```jsx
import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '../api.js'
import { formatCOP } from '../../shared/format.js'
import { ErrorBanner, Field, Input } from '../../shared/ui.jsx'
import { Badge, FilaMensaje, Table } from '../components/ui.jsx'
import { etiquetaEstado, tonoEstado } from '../orders/ordersModel.js'
import Bars, { BarsLeyenda } from './Bars.jsx'
import { aBarras, etiquetaPeriodo, rangoPorDefecto } from './reportsModel.js'

function Tarjeta({ titulo, valor }) {
  return (
    <div className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">{titulo}</p>
      <p className="mt-1 font-serif text-3xl text-[#3A2A1A]">{valor}</p>
    </div>
  )
}

export default function ReportsPage() {
  const [rango, setRango] = useState(() => rangoPorDefecto())
  const [groupBy, setGroupBy] = useState('day')
  const [ventas, setVentas] = useState(null)
  const [top, setTop] = useState(null)
  const [estados, setEstados] = useState(null)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setError('')
    try {
      const [v, t, e] = await Promise.all([
        adminApi.salesReport({ ...rango, groupBy }),
        adminApi.topProducts(5),
        adminApi.ordersByStatus(),
      ])
      setVentas(v)
      setTop(t.products)
      setEstados(e.statuses)
    } catch (err) {
      setError(err.message)
    }
  }, [rango, groupBy])

  useEffect(() => {
    cargar()
  }, [cargar])

  const barrasTop = aBarras(top ?? [], { etiqueta: 'name', valor: 'revenue' })

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl">Reportes</h1>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Desde">
          <Input type="date" value={rango.from} onChange={(e) => setRango((r) => ({ ...r, from: e.target.value }))} />
        </Field>
        <Field label="Hasta">
          <Input type="date" value={rango.to} onChange={(e) => setRango((r) => ({ ...r, to: e.target.value }))} />
        </Field>
        <Field label="Agrupar por">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="w-full rounded-xl border border-[#E7D9C4] bg-white px-3.5 py-2.5 text-sm text-[#3A2A1A] focus:border-peach-500 focus:outline-none focus:ring-2 focus:ring-peach-500/25"
          >
            <option value="day">Día</option>
            <option value="month">Mes</option>
          </select>
        </Field>
      </div>

      <ErrorBanner message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Tarjeta titulo="Pedidos en el periodo" valor={ventas?.totalOrders ?? '—'} />
        <Tarjeta titulo="Ingresos en el periodo" valor={ventas ? formatCOP(ventas.totalRevenue) : '—'} />
      </div>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        <h2 className="mb-3 font-serif text-lg">Ventas por periodo</h2>
        <Table columnas={['Periodo', 'Pedidos', 'Ingresos']}>
          {ventas === null && <FilaMensaje columnas={3}>Cargando…</FilaMensaje>}
          {ventas?.points.length === 0 && (
            <FilaMensaje columnas={3}>No hubo ventas en este periodo.</FilaMensaje>
          )}
          {ventas?.points.map((p) => (
            <tr key={p.period} className="border-b border-[#F1E7D8] last:border-0">
              <td className="px-4 py-2.5 font-bold">{etiquetaPeriodo(p.period)}</td>
              <td className="px-4 py-2.5 text-[#6A5A4A]">{p.orders}</td>
              <td className="px-4 py-2.5 font-semibold">{formatCOP(p.revenue)}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        <h2 className="mb-3 font-serif text-lg">Productos más vendidos</h2>
        {top === null ? (
          <p className="text-sm text-[#8A6A4A]">Cargando…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <BarsLeyenda datos={barrasTop} formatear={formatCOP} />
            <Bars datos={barrasTop} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#E7D9C4] bg-white p-5">
        <h2 className="mb-3 font-serif text-lg">Pedidos por estado</h2>
        <div className="flex flex-wrap gap-3">
          {estados === null && <p className="text-sm text-[#8A6A4A]">Cargando…</p>}
          {estados?.map((e) => (
            <div key={e.status} className="flex items-center gap-2 rounded-full border border-[#E7D9C4] px-4 py-2">
              <Badge tono={tonoEstado(e.status)}>{etiquetaEstado(e.status)}</Badge>
              <span className="font-extrabold text-[#3A2A1A]">{e.count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Paso 2: Enchufarla**

En `AdminApp.jsx`:

```jsx
import ReportsPage from './reports/ReportsPage.jsx'
```

```jsx
          {route.name === 'reportes' && <ReportsPage />}
```

Con esto **desaparece el componente `EnConstruccion`**: ya no queda ninguna
sección sin construir. Bórralo de `AdminApp.jsx` junto con su definición.

- [ ] **Paso 3: Verificar**

```bash
npm test && npm run build
```

Esperado: limpio, y sin advertencias por `EnConstruccion` sin usar.

- [ ] **Paso 4: Confirmar**

```bash
git add frontend/src/admin
git commit -m "feat(admin): pantalla de reportes"
```

---

### Task 12: Verificación en navegador y documentación

**Archivos:**
- Crear (temporal, **fuera del repositorio**): backend simulado en el scratchpad
- Modificar: `docs/pendientes-lanzamiento.md`, `docs/referencia-frontend.md`,
  `docs/referencia-api.md`

- [ ] **Paso 1: Ampliar el backend simulado**

En el directorio de scratchpad de la sesión ya existe `mock-todo.mjs`, que cubre
acceso, catálogo público, carrito y pedidos del panel. Amplíalo con las rutas
que este plan consume: `GET/POST/PATCH/DELETE /api/products`,
`GET/POST/PATCH/DELETE /api/categories` y `/api/brands`,
`GET/POST/PATCH /api/coupons`, y los tres `/api/admin/reports/*`.

Devuelve las formas exactas de la tabla «Endpoints que consume este plan».
Siembra al menos: 2 productos (uno desactivado, para probar que el panel los
ve), 1 categoría, 1 marca, 2 cupones (uno expirado) y datos de ventas en varios
días.

**No lo guardes en el repositorio.** Ejecútalo con `node` en segundo plano.

- [ ] **Paso 2: Abrir el panel**

Usa `preview_start` con la configuración `pomass-dev` de `.claude/launch.json` y
navega a `/admin.html`. **Nunca uses Bash para el servidor de desarrollo.**

Entra con `admin@pomass.co` / `Admin123*`.

- [ ] **Paso 3: Recorrer las cuatro secciones**

Comprueba y anota lo observado en cada punto:

1. **Productos** — la lista muestra los dos, incluido el desactivado con su
   distintivo. (Este es el punto que valida la Task 1.)
2. «Desactivar» y «Activar» cambian el estado y el producto **no desaparece**.
3. «Nuevo producto» abre el formulario; guardar sin nombre muestra los errores
   por campo y no envía nada.
4. Editar un producto existente: **añade una imagen**, reordénala con las
   flechas y guarda. Al reabrirlo, el cambio persiste. (Valida la Task 2.)
5. «Borrar» pide confirmación y explica que un producto con pedidos no se puede
   borrar.
6. **Categorías y marcas** — crear una, desactivarla y borrarla.
7. **Cupones** — la lista muestra el estado calculado (Vigente, Expirado…).
   Al editar, el código sale deshabilitado y se ve el aviso sobre el límite por
   usuario.
8. **Reportes** — las tarjetas, la tabla por periodo, las barras del top y el
   conteo por estado. Cambiar el rango y «agrupar por» recarga los datos.

Revisa la consola con `read_console_messages`: no debe haber errores.

- [ ] **Paso 4: Comprobar el móvil**

Con `resize_window` en `mobile`, confirma que las tablas se desplazan dentro de
su propio contenedor y que **el cuerpo de la página no se desplaza en
horizontal**. Restablece el viewport al terminar.

- [ ] **Paso 5: Capturar la evidencia**

Una captura de la lista de productos y otra del formulario con el editor de
imágenes abierto.

- [ ] **Paso 6: Detener el entorno**

Termina el proceso del simulado y detén el servidor de desarrollo.

- [ ] **Paso 7: Actualizar la documentación**

- `docs/pendientes-lanzamiento.md`: el panel ya no tiene secciones pendientes.
- `docs/referencia-frontend.md`: la estructura de `src/admin/` con las carpetas
  `catalog/`, `coupons/` y `reports/`; retira la mención a las secciones
  incompletas.
- `docs/referencia-api.md`: `GET /products` acepta `includeInactive`, honrado
  solo para ADMIN; `PATCH /products/:id` acepta `images` y las reemplaza en
  bloque.

- [ ] **Paso 8: Verificación final**

Backend: `npm run test:unit && npm run typecheck && npm run lint`
Frontend: `npm test && npm run build`

Informa los totales comparados con el punto de partida (backend 151 en 18;
frontend 51 en 6).

- [ ] **Paso 9: Confirmar**

```bash
git add docs
git commit -m "docs: documenta el catálogo, los cupones y los reportes del panel"
```

---

## Qué queda fuera de este plan

- **Subida de archivos de imagen.** Las fotos siguen entrando por dirección web,
  como decidió la especificación. Subirlas desde el panel exige un proveedor de
  almacenamiento y su endpoint; es un bloque aparte.
- **Tests de componentes.** Vitest corre sin DOM y añadir jsdom o
  `@testing-library/react` está fuera de las restricciones globales. La lógica
  se prueba en los módulos puros; el render se verifica en navegador (Task 12).
- **Paginación en productos.** Se piden 100 de una vez. Con un catálogo de un
  producto es de sobra; cuando el catálogo crezca, la lista de pedidos ya tiene
  el patrón a copiar.
