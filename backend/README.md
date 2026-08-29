# PomAss · Backend

API de la tienda virtual **PomAss** (cremas y productos de cuidado/higiene íntima).

> **Documentación completa**: [`docs/`](../docs/README.md) —
> [tutorial](../docs/tutorial-primer-pedido.md) ·
> [referencia de API](../docs/referencia-api.md) ·
> [modelo de datos](../docs/referencia-modelo-datos.md) ·
> [configuración](../docs/referencia-configuracion.md) ·
> [decisiones de diseño](../docs/explicacion-decisiones.md) ·
> [seguridad](../docs/explicacion-seguridad.md)

## Stack

- **Node.js + TypeScript + Express**
- **PostgreSQL** con **Prisma** (ORM)
- **Redis** (caché de catálogo, carritos de invitado)
- **JWT** (access + refresh con rotación)
- **Zod** (validación de entrada) · **Pino** (logging estructurado)
- **Jest + Supertest** (tests) · **Swagger/OpenAPI** (`/api/docs`)
- **Docker + docker-compose** (app + postgres + redis)

## Arquitectura

Arquitectura limpia / hexagonal, **modular por dominio**. Cada módulo (`src/modules/<dominio>`) tiene 4 capas:

```
domain/          entidades + puertos (interfaces). Cero Express/Prisma.
application/      casos de uso (orquestan el dominio).
infrastructure/   adaptadores concretos (repos Prisma, bcrypt, JWT).
interfaces/http/  controladores, rutas, DTOs (Zod), doc OpenAPI.
```

Regla de dependencia: `interfaces → application → domain ← infrastructure`.
El dominio es testeable sin base de datos ni HTTP (ver `tests/unit`).

Infraestructura compartida en `src/shared/`: `config` (validación de `.env` con Zod),
`database` (PrismaClient), `cache` (Redis + `cache-aside`), `errors` (AppError + middleware
central), `logger`, `middlewares` (authGuard, roleGuard, validate) y `docs` (Swagger).

## Puesta en marcha

### Opción A — Docker (todo el entorno)

```bash
cp .env.example .env         # ajusta secretos si quieres
docker compose up --build
```

Esto levanta **postgres + redis + api**, aplica migraciones (`prisma migrate deploy`),
corre el **seed** y arranca la API en http://localhost:3000.

### Opción B — Local (Node en la máquina, DB/Redis en Docker)

```bash
cp .env.example .env
docker compose up -d db redis   # solo base de datos y cache
npm install
npm run prisma:migrate          # crea/aplica migraciones (dev)
npm run prisma:seed             # datos de ejemplo
npm run dev                     # API con recarga en caliente
```

## Variables de entorno

Todas se documentan en [`.env.example`](.env.example). Las principales:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto de la API | `3000` |
| `API_PREFIX` | Prefijo de rutas | `/api` |
| `DATABASE_URL` | Conexión Postgres | `postgresql://...` |
| `REDIS_URL` | Conexión Redis | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | Secreto del access token JWT (≥16 chars) | — |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | Vigencia de tokens (el refresh token es opaco, no un JWT) | `15m` / `7d` |
| `BCRYPT_SALT_ROUNDS` | Coste de bcrypt | `12` |
| `SHIPPING_FLAT_RATE` | Tarifa plana de envío (COP) | `12900` |
| `FREE_SHIPPING_THRESHOLD` | Envío gratis sobre este monto | `150000` |
| `PAYMENTS_WEBHOOK_SECRET` | Secreto HMAC-SHA256 para verificar webhooks de pago | ≥8 chars |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin inicial (seed) | — |

> El `.env` real **no se versiona** (está en `.gitignore`). En producción usa el gestor
> de secretos de la plataforma.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | API en desarrollo (tsx watch) |
| `npm run build` | Compila a `dist/` |
| `npm start` | Ejecuta el build |
| `npm run prisma:migrate` | Crea/aplica migraciones (dev) |
| `npm run prisma:deploy` | Aplica migraciones (prod/CI) |
| `npm run prisma:seed` | Siembra datos de ejemplo |
| `npm run prisma:studio` | Explorador visual de la DB |
| `npm test` | Todos los tests (requiere DB para integración) |
| `npm run test:unit` | Solo tests unitarios (sin DB) |
| `npm run test:integration` | Solo integración (requiere DB) |
| `npm run lint` / `npm run typecheck` | Lint / chequeo de tipos |

## Migraciones

La primera vez, con la DB arriba:

```bash
npm run prisma:migrate        # genera prisma/migrations y aplica
```

En CI/producción se usa `prisma migrate deploy` (no interactivo).

## Tests

- **Unitarios** (`tests/unit`): prueban la lógica de negocio con dobles en memoria,
  sin DB. `npm run test:unit`.
- **Integración** (`tests/integration`): usan Supertest contra la app real y una DB
  Postgres migrada. Requieren `DATABASE_URL` apuntando a una base de pruebas.
  `npm run test:integration`.

## Documentación de la API

Con la API corriendo: **http://localhost:3000/api/docs** (Swagger UI, interactiva).
Health check (fuera del prefijo `/api`) en **http://localhost:3000/health**.

## Referencia de endpoints

Todas las rutas cuelgan de `API_PREFIX` (`/api` por defecto). 🔒 = requiere
`Authorization: Bearer <accessToken>`. 👑 = además requiere rol `ADMIN`. Sin
símbolo = público, o con autenticación **opcional** (sirve a usuarios y a
invitados).

> Referencia completa con contratos de entrada/salida, códigos de error y
> ejemplos ejecutables: **[docs/referencia-api.md](../docs/referencia-api.md)**.

**Auth** (`/auth`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/register` | Registro (incluye declaración obligatoria de mayoría de edad) |
| POST | `/auth/login` | Login, devuelve `{ user, tokens }` |
| POST | `/auth/refresh` | Rota el refresh token (el usado queda invalidado) |
| POST | `/auth/logout` | Revoca un refresh token |
| POST | `/auth/forgot-password` | Solicita recuperación (respuesta genérica, no revela si el correo existe) |
| POST | `/auth/reset-password` | Restablece la contraseña con el token recibido |
| GET | `/auth/me` 🔒 | Perfil del usuario autenticado |

**Catálogo** (`/products`, `/categories`, `/brands`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/products` | Lista con `search`, `category`, `brand`, `minPrice`, `maxPrice`, `usageType`, `skinType`, `sort`, `page`, `pageSize` |
| GET | `/products/:slug` | Detalle de un producto |
| POST | `/products` 🔒👑 | Crear producto |
| PATCH | `/products/:id` 🔒👑 | Actualizar producto |
| DELETE | `/products/:id` 🔒👑 | Eliminar producto |
| GET | `/categories` / `/brands` | Listar (con `?includeInactive=true` para admin) |
| POST/PATCH/DELETE | `/categories`, `/brands` 🔒👑 | CRUD de categorías y marcas |

**Carrito** (`/cart`) — sirve a usuarios 🔒 y a invitados (header `X-Guest-Id`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/cart` | Ver el carrito (devuelve `guestId` si eres invitado) |
| POST | `/cart/items` | Agregar un producto (`{ productId, quantity }`) |
| PATCH | `/cart/items/:productId` | Cambiar cantidad (`0` = quitar) |
| DELETE | `/cart/items/:productId` | Quitar un ítem |
| DELETE | `/cart` | Vaciar el carrito |
| POST | `/cart/merge` 🔒 | Fusiona el carrito de invitado (`guestId`) en el del usuario |

**Pedidos y direcciones** (`/orders`, `/addresses`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/orders` | Checkout: crea el pedido desde el carrito (`addressId` o `shippingAddress`, `couponCode?`, `discreetPackaging?`). **Admite invitados**: sin sesión exige `guestEmail` y `shippingAddress` |
| GET | `/orders` 🔒 | Lista paginada de mis pedidos |
| GET | `/orders/:id` 🔒 | Detalle de un pedido propio |
| POST | `/orders/:id/cancel` 🔒 | Cancela (solo si está `PENDING`/`PAID`) y restaura stock |
| GET / POST | `/addresses` 🔒 | Listar / crear direcciones de envío |
| PATCH / DELETE | `/addresses/:id` 🔒 | Actualizar / eliminar una dirección propia |

**Pagos** (`/payments`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/payments` | Inicia el pago de un pedido `PENDING` (`orderId`, `method`, datos del método). Sin sesión solo funciona si el pedido también es de invitado |
| GET | `/payments/:id` 🔒 | Consulta un pago propio |
| POST | `/payments/webhook/:provider` | Webhook de confirmación (`nequi`/`daviplata`/`card`), verificado por firma `x-signature` (HMAC-SHA256 con `PAYMENTS_WEBHOOK_SECRET`) |

**Cupones** (`/coupons`) — CRUD de gestión, todo 🔒👑 (la *aplicación* de un cupón en el checkout es pública, vía `couponCode` en `POST /orders`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/coupons` | Lista cupones (`?includeInactive=true` para ver también los desactivados) |
| GET | `/coupons/:id` | Detalle de un cupón |
| POST | `/coupons` | Crear cupón (código único, `PERCENTAGE` 1-100 o `FIXED`) |
| PATCH | `/coupons/:id` | Editar campos, o desactivar con `{ isActive: false }` (no hay borrado físico) |

**Reseñas** (`/products/:productId/reviews`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/products/:productId/reviews` | Lista paginada de reseñas aprobadas del producto (público) |
| POST | `/products/:productId/reviews` 🔒 | Crea una reseña — requiere un pedido propio `DELIVERED` con ese producto; se aprueba automáticamente, sin cola de moderación |

**Admin — reportes** (`/admin/reports`) — todo 🔒👑

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/admin/reports/sales` | Ventas por periodo (`from`, `to`, `groupBy=day\|month`; default: últimos 30 días agrupados por día). Cuenta pedidos en `PAID`/`PREPARING`/`SHIPPED`/`DELIVERED` |
| GET | `/admin/reports/top-products` | Productos más vendidos por unidades (`limit`, default 10, máx. 100) |
| GET | `/admin/reports/orders-by-status` | Conteo de pedidos por cada `OrderStatus` |

Para el detalle completo de request/response de cada endpoint, usa Swagger
(`/api/docs`) — se genera a partir del mismo código, así que nunca queda
desactualizado.

## Seguridad

Medidas aplicadas:

- **Autenticación**: JWT firmado con HS256 (algoritmo fijado en la verificación,
  bloquea `alg:none`/confusión), refresh tokens opacos con rotación y detección
  de reuso, contraseñas con bcrypt (coste ≥ 10).
- **Autorización**: `roleGuard('ADMIN')` en todo el catálogo de escritura;
  pedidos, direcciones y pagos verifican pertenencia por `userId` (a nivel de
  caso de uso y también en el repositorio, defensa en profundidad).
- **Anti-enumeración**: login y recuperación de contraseña dan respuestas
  genéricas; el login gasta tiempo de hashing equivalente aunque el correo no
  exista (evita oráculo de tiempos).
- **Webhooks de pago**: firma HMAC-SHA256 con comparación *timing-safe*; el
  secreto es obligatorio en producción (no puede quedar el valor por defecto).
- **Entrada**: validación con Zod en todo endpoint; body limitado a 100 kB;
  acceso a datos solo vía Prisma (consultas parametrizadas, sin SQL crudo).
- **Transporte/cabeceras**: `helmet`, CORS con allowlist (credenciales solo con
  orígenes explícitos), rate limiting global y reforzado en `/auth`.
- **Secretos**: `.env` fuera del repo; el arranque **falla en producción** si
  `PAYMENTS_WEBHOOK_SECRET`, `ADMIN_PASSWORD` o `CORS_ORIGIN` quedan con valores
  inseguros por defecto.

### Checklist antes de producción

- [ ] `NODE_ENV=production`
- [ ] `JWT_ACCESS_SECRET` largo y aleatorio
- [ ] `PAYMENTS_WEBHOOK_SECRET` propio (no el de ejemplo)
- [ ] `ADMIN_PASSWORD` propio (no el de ejemplo)
- [ ] `CORS_ORIGIN` con la lista real de orígenes (no `*`)
- [ ] `TRUST_PROXY=1` si corre detrás de un balanceador (ALB/CloudFront)
- [ ] Secretos gestionados por la plataforma (AWS Secrets Manager / Parameter Store), no en `.env` plano

## Estado de los módulos

| Módulo | Estado |
|---|---|
| Infraestructura compartida (config, DB, Redis, errores, logger, middlewares, Swagger) | ✅ |
| **Auth y usuarios** (registro, login, JWT + refresh con rotación, verif. edad, recuperación) | ✅ |
| **Catálogo** (productos, categorías, marcas, búsqueda/filtros, caché Redis, guard admin) | ✅ |
| **Carrito** (persistente por usuario en DB + invitado en Redis, validación de stock, merge) | ✅ |
| **Pedidos/Checkout** (checkout transaccional, stock atómico, cupones, envío, empaque discreto, direcciones, cancelación) | ✅ |
| **Pagos** (adaptadores stub Nequi/Daviplata/tarjeta, webhook firmado, pedido → PAID) | ✅ |
| **Cupones** (CRUD admin: crear/listar/editar/desactivar; la *aplicación* en checkout ya existía) | ✅ |
| **Reseñas** (crear reseña solo con compra DELIVERED verificada, auto-aprobada; listado público por producto) | ✅ |
| **Admin/reportes** (ventas por periodo, productos más vendidos, conteo de pedidos por estado) | ✅ |

Los módulos se construyen incrementalmente por dominio.
