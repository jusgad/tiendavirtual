# Arquitectura

Este documento explica **cómo está diseñado** el backend de PomAss: el patrón
de capas que sigue cada módulo, cómo fluye una petición real de principio a
fin, y por qué está organizado así. Para instalación/comandos ver
[backend/README.md](backend/README.md); para la visión general del repo ver
[README.md](README.md).

## Principio rector

**Arquitectura limpia / hexagonal, modular por dominio.** La regla que nunca
se rompe: el código que expresa *reglas de negocio* (dominio y casos de uso)
no importa nada de Express, Prisma, bcrypt, JWT ni Redis. Esas son
*implementaciones*; el negocio no debería enterarse de cuál usamos hoy.

Beneficio concreto: la lógica crítica (cálculo de descuentos, validez de un
cupón, envío gratis) se prueba con **69 tests unitarios** sin levantar una
base de datos — son funciones/clases puras que reciben sus dependencias como
parámetros o por constructor.

## Las 4 capas de un módulo

Cada dominio vive en `backend/src/modules/<nombre>/` con esta forma:

```
modules/<dominio>/
├── domain/           Tipos, entidades y PUERTOS (interfaces). Cero imports de
│                     Express/Prisma/ioredis. Aquí viven las reglas puras
│                     (ej. orders/domain/pricing.ts: cálculo de cupón y envío).
│
├── application/       Casos de uso: orquestan el dominio. Reciben sus
│                     dependencias (repositorios, servicios) por constructor,
│                     nunca las instancian ellos mismos → 100% testeables con
│                     dobles en memoria (ver tests/unit/<dominio>/fakes.ts).
│
├── infrastructure/    Adaptadores concretos: implementan los puertos del
│                     dominio contra Prisma, Redis, bcrypt, JWT, etc. Aquí es
│                     el ÚNICO lugar donde se puede reemplazar Postgres por
│                     otra base de datos sin tocar domain/ ni application/.
│
├── interfaces/http/   Lo que entra/sale por HTTP: DTOs de validación (Zod),
│                     controladores (traducen Request/Response ↔ casos de
│                     uso) y la documentación OpenAPI del módulo.
│
└── <dominio>.module.ts   Composición: instancia adaptadores → repos → casos
                          de uso → controladores, y arma el Router de Express.
                          Es el ÚNICO archivo que conoce todas las capas.
```

**Regla de dependencia** (las flechas nunca van al revés):

```
interfaces/http  →  application  →  domain  ←  infrastructure
     (HTTP)          (casos de uso)  (reglas)   (Prisma, Redis, JWT...)
```

`domain` no depende de nadie. `infrastructure` depende de `domain` (implementa
sus interfaces), pero `domain` nunca importa de `infrastructure`.

## Ejemplo: cómo fluye `POST /api/cart/items`

1. **`routes.ts`** monta `buildCartModule(prisma, redis)` en `/cart`.
2. **`cart.module.ts`** (composición) ya armó, al arrancar el proceso:
   `PrismaCartProductGateway` (infra) → `AddItemUseCase` (application) →
   `CartController` (interfaces), y registró la ruta con sus middlewares:
   `optionalAuth` (usuario o invitado) → `validate(addItemSchema)` (Zod) →
   `asyncHandler(controller.add)`.
3. **`CartController.add`** resuelve si hay usuario autenticado (`DbCartStore`,
   Postgres) o invitado (`RedisCartStore`, con TTL de 7 días) — el caso de uso
   ni se entera de cuál es, solo ve la interfaz `CartStore`.
4. **`AddItemUseCase.execute`** (application, puro): busca el producto vía el
   puerto `CartProductGateway`, valida que haya stock suficiente (si no,
   lanza `ConflictError` — un error de *dominio*, no un código HTTP), y guarda
   la línea del carrito.
5. Si algo falla, el error de dominio (`ConflictError`, `NotFoundError`...)
   llega al **middleware central de errores** (`shared/errors/errorHandler.ts`),
   que lo traduce a la respuesta HTTP correcta (409, 404...) sin que ningún
   caso de uso haya tocado `res.status()`.

El mismo patrón se repite en los 5 módulos existentes.

## Mapa de módulos

| Módulo | Responsabilidad | Piezas de dominio destacadas |
|---|---|---|
| `auth` | Registro/login, JWT (access + refresh con **rotación y detección de reuso**), verificación de edad, recuperación de contraseña | `RegisterUserUseCase`, `RefreshTokensUseCase` |
| `catalog` | Productos, categorías, marcas; búsqueda/filtros/paginación; **caché Redis** con invalidación por versión de namespace | `ListProductsUseCase` (cache-aside) |
| `cart` | Carrito por usuario (Postgres) o invitado (Redis) tras una misma interfaz `CartStore`; merge al iniciar sesión | `AddItemUseCase`, `MergeGuestCartUseCase` |
| `orders` | Checkout **transaccional**: descuento de stock atómico, aplicación de cupones, cálculo de envío, snapshots de ítems/dirección, cancelación con restauración de stock | `pricing.ts` (envío + descuento puros), `CheckoutUseCase` |
| `payments` | Adaptadores stub por proveedor (Nequi/Daviplata/tarjeta), webhook verificado por firma HMAC, transición `PENDING → PAID` | `InitiatePaymentUseCase`, `HandleWebhookUseCase` |

Infraestructura **compartida** (no es un dominio, la usan todos) en
`backend/src/shared/`:

| Carpeta | Qué resuelve |
|---|---|
| `config/env.ts` | Valida `.env` con Zod al arrancar (fail-fast si falta algo) |
| `database/prisma.ts` | Singleton de `PrismaClient` |
| `cache/redis.ts` | Cliente Redis (conexión perezosa) |
| `errors/` | Jerarquía `AppError` (BadRequest, Unauthorized, Conflict...) + middleware central |
| `logger/` | Logging estructurado con Pino |
| `middlewares/` | `authGuard`, `optionalAuth`, `roleGuard`, `validate` (Zod), `rateLimit` |
| `docs/openapi.ts` | Documento OpenAPI base; cada módulo registra sus rutas/schemas al importarse |

## Decisiones de diseño que vale la pena conocer

- **Stock a prueba de concurrencia**: el descuento de stock en el checkout no
  es "leer stock, restar, guardar" (racy); es un único `UPDATE ... WHERE stock
  >= cantidad` — si dos compras concurrentes agotan el mismo producto, solo
  una gana, sin locks explícitos.
- **Cupones atómicos**: el canje de un cupón con `maxUses` usa el mismo patrón
  (`UPDATE ... WHERE usedCount < maxUses`) dentro de la misma transacción del
  pedido, para que dos checkouts concurrentes no exceda el límite.
- **Caché de catálogo versionada**: invalidar no borra claves una por una
  (`KEYS` bloquea Redis); se incrementa un contador de versión y las claves
  viejas expiran solas por TTL.
- **Refresh tokens con rotación**: cada uso de un refresh token lo invalida y
  emite uno nuevo; reusar un token ya consumido es rechazado (mitiga robo de
  tokens).
- **Webhooks de pago verificados e idempotentes**: la firma HMAC evita que
  cualquiera llame al webhook; si el mismo evento llega dos veces, la segunda
  vez no reprocesa (se compara el estado actual del pago antes de aplicar).

## Estrategia de testing

- **`tests/unit/`**: prueban casos de uso y lógica de dominio con **dobles en
  memoria** (`fakes.ts` por módulo) — sin Postgres, sin Redis, sin HTTP.
  Rápidos (segundos) y son los que cubren la lógica crítica (stock, checkout,
  cupones, pagos). 69 tests hoy.
- **`tests/integration/`**: usan Supertest contra la app real (`createApp()`)
  y una base de datos Postgres migrada, para verificar que las capas
  realmente encajan (rutas, middlewares, Prisma). Corren en CI
  (`.github/workflows/backend-ci.yml`) con Postgres/Redis como servicios.

## Frontend: nota de arquitectura

El frontend (carpeta [`frontend/`](frontend/), proyecto npm independiente) es
intencionalmente simple: un único estado (`mode: 'day' | 'night'`, `toast`) en
`App.jsx`, componentes de presentación puros por sección (`Header`, `Hero`,
`BenefitsPanel`, `ProductStage`, `FloatingCta`, `OfferCard`, `StickyBar`,
`Toast`), y un archivo de configuración (`site.js`) para los datos de negocio
(precio, WhatsApp, beneficios) que cambian sin tocar componentes. No tiene
capas de dominio porque no tiene lógica de negocio propia: toda "conversión"
ocurre fuera de la app, en WhatsApp.
