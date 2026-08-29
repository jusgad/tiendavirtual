# Referencia · Modelo de datos

Descripción completa del esquema PostgreSQL, tal como está definido en
[`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). 12 modelos,
5 enums.

**Convenciones globales del esquema:**

- Todas las claves primarias son `uuid` generados por la aplicación (`@default(uuid())`).
- El dinero es `Decimal(12, 2)`; la moneda por defecto es `COP` (peso colombiano).
- Los nombres de tabla se mapean a `snake_case` plural (`@@map`): el modelo `OrderItem` es la tabla `order_items`.
- `createdAt` / `updatedAt` están en casi todos los modelos (`@default(now())` / `@updatedAt`).

---

## Enums

| Enum | Valores | Dónde se usa |
|---|---|---|
| `Role` | `CLIENT`, `ADMIN` | `User.role` (default `CLIENT`) |
| `OrderStatus` | `PENDING`, `PAID`, `PREPARING`, `SHIPPED`, `DELIVERED`, `CANCELLED` | `Order.status` (default `PENDING`) |
| `PaymentMethod` | `WOMPI` | `Payment.method` |
| `PaymentStatus` | `PENDING`, `APPROVED`, `DECLINED`, `REFUNDED` | `Payment.status` (default `PENDING`) |
| `CouponType` | `PERCENTAGE`, `FIXED` | `Coupon.type` |

### Ciclo de vida de `OrderStatus`

```
            POST /orders
                 │
                 ▼
             PENDING ──────────────────────┐
                 │                         │
   webhook de Wompi APROBADO               │  cancelación
   (única forma de llegar a PAID)          │  · POST /orders/:id/cancel   (cliente)
                 │                         │  · PATCH /admin/orders/:id/status
                 ▼                         │    (admin)
               PAID ──────────────────────►┤
                 │                         │
   PATCH /admin/orders/:id/status          │
                 ▼                         │
            PREPARING ────────────────────►┤
                 │                         ▼
                 ▼                     CANCELLED
             SHIPPED          (devuelve stock si aún no se despachó)
                 │
                 ▼
            DELIVERED ──► habilita POST /products/:productId/reviews
```

Dos reglas que el dominio hace cumplir
([`orderTransitions.ts`](../backend/src/modules/admin/domain/orderTransitions.ts)):

- **`PAID` no se puede marcar a mano.** Solo lo produce el webhook de pago verificado. Permitirlo abriría la puerta a despachar sin haber cobrado.
- **`DELIVERED` y `CANCELLED` son finales**, y un pedido ya `SHIPPED` no se cancela.

Cancelar antes del despacho (`PENDING`, `PAID`, `PREPARING`) **devuelve el
stock** al catálogo dentro de la misma transacción.

`PaymentStatus.REFUNDED` está definido en el enum pero ningún código lo asigna.

---

## Usuarios y sesión

### `User` → `users`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `email` | string | **único**, indexado. Se guarda en minúsculas |
| `passwordHash` | string | bcrypt, coste `BCRYPT_SALT_ROUNDS` (default 12) |
| `firstName` / `lastName` | string | |
| `phone` | string? | |
| `role` | `Role` | default `CLIENT` |
| `ageConfirmed` | boolean | default `false`. El registro exige `true` |
| `isActive` | boolean | default `true` |

**Relaciones**: `addresses`, `cart` (1:1), `orders`, `reviews`, `refreshTokens`,
`passwordResets`, `couponRedemptions`.

### `RefreshToken` → `refresh_tokens`

| Campo | Tipo | Notas |
|---|---|---|
| `tokenHash` | string | **único**. El token nunca se guarda en claro |
| `expiresAt` | datetime | |
| `revokedAt` | datetime? | Se marca al rotar o cerrar sesión |

`onDelete: Cascade` desde `User`. Ver [rotación de refresh tokens](explicacion-decisiones.md#refresh-tokens-con-rotación-y-detección-de-reuso).

### `PasswordResetToken` → `password_reset_tokens`

Misma forma: `tokenHash` único, `expiresAt`, y `usedAt` para consumo único.
La vigencia sale de `PASSWORD_RESET_TTL_MIN` (default 30 min).

### `Address` → `addresses`

| Campo | Tipo | Notas |
|---|---|---|
| `fullName`, `phone`, `line1` | string | requeridos |
| `line2`, `postalCode` | string? | |
| `city`, `department` | string | `department` = departamento de Colombia |
| `country` | string | default `"CO"` |
| `isDefault` | boolean | default `false` |

`onDelete: Cascade` desde `User`. Un `Order` la referencia de forma opcional
(`addressId`), pero además **copia** los datos como snapshot.

---

## Catálogo

### `Brand` → `brands`

`name` y `slug` únicos, `description?`, `logoUrl?`, `isActive` (default `true`).
Índice en `slug`.

### `Category` → `categories`

`slug` único, `name`, `description?`, `isActive`. Tiene **auto-relación**
`CategoryTree`: `parentId` apunta a otra categoría, dando subcategorías de
profundidad arbitraria. Índices en `slug` y `parentId`.

> El código no impone límite de profundidad ni detecta ciclos. Con la API actual
> es difícil crear uno (hay que pasar un `parentId` que sea descendiente), pero
> nada lo impide a nivel de esquema.

### `Product` → `products`

| Campo | Tipo | Notas |
|---|---|---|
| `name` | string | |
| `slug` | string | **único**. Generado del nombre al crear; estable después |
| `sku` | string | **único** |
| `description` | string | requerido |
| `brandId` / `categoryId` | uuid | FK, requeridas |
| `price` | Decimal(12,2) | |
| `currency` | string | default `"COP"` |
| `presentation` | string? | p. ej. `"Tubo 50 ml"` |
| `sizeMl` | int? | volumen, para filtros |
| `usageType` | string? | `lubricante`, `hidratante`, `higiene`, `aclarante`… |
| `skinType` | string? | `sensible`, `normal`, `todo tipo`… |
| `ingredients` | string? | composición |
| `warnings` | string? | advertencias de uso |
| `stock` | int | default `0` |
| `isActive` | boolean | default `true` |

**Índices**: `categoryId`, `brandId`, `isActive`, `name` (apoyo a la búsqueda),
`price` (apoyo al orden).

`usageType` y `skinType` son texto libre, no enums: se filtran por coincidencia
exacta de string. No hay validación de valores permitidos.

### `ProductImage` → `product_images`

`url`, `alt?`, `position` (default `0`). `onDelete: Cascade` desde `Product`.

---

## Carrito

El carrito **de usuario** vive en Postgres. El **de invitado** vive solo en
Redis con TTL de 7 días y no tiene representación en el esquema.

### `Cart` → `carts`

`userId` **único** — un carrito por usuario. `onDelete: Cascade`.

### `CartItem` → `cart_items`

`cartId`, `productId`, `quantity` (default `1`).
**`@@unique([cartId, productId])`**: una sola línea por producto; agregar dos
veces el mismo producto suma cantidades en vez de duplicar la fila.

---

## Cupones

### `Coupon` → `coupons`

| Campo | Tipo | Notas |
|---|---|---|
| `code` | string | **único**, indexado. Normalizado en MAYÚSCULAS |
| `type` | `CouponType` | |
| `value` | Decimal(12,2) | Si `PERCENTAGE`, es 0–100. Si `FIXED`, monto COP |
| `minPurchase` | Decimal? | Compra mínima requerida |
| `maxUses` | int? | Usos totales. `null` = ilimitado |
| `usedCount` | int | default `0`. Se incrementa condicionalmente en el checkout |
| `perUserLimit` | int? | Usos por usuario. `null` = sin límite |
| `startsAt` / `endsAt` | datetime? | Ventana de validez |
| `isActive` | boolean | default `true` |

### `CouponRedemption` → `coupon_redemptions`

Registra cada canje: `couponId`, `userId`, `orderId?`. Es lo que permite hacer
valer `perUserLimit`, contando canjes previos del usuario.

`onDelete: Cascade` desde `Coupon` y desde `User`.

> No hay `@@unique` sobre `(couponId, userId)`: el límite por usuario se hace
> valer contando filas en el caso de uso, no con una restricción de la base.

---

## Pedidos

### `Order` → `orders`

| Campo | Tipo | Notas |
|---|---|---|
| `orderNumber` | string | **único**, legible: `PA-<año>-<6 hex>` |
| `userId` | uuid? | **`null` = pedido de invitado** |
| `addressId` | uuid? | Referencia opcional a la dirección guardada |
| `status` | `OrderStatus` | default `PENDING` |
| `subtotal` | Decimal(12,2) | |
| `discountTotal` | Decimal(12,2) | default `0` |
| `shippingTotal` | Decimal(12,2) | default `0` |
| `total` | Decimal(12,2) | |
| `currency` | string | default `"COP"` |
| `couponId` | uuid? | |
| `discreetPackaging` | boolean | default `false` |
| `shipFullName`, `shipPhone`, `shipLine1`, `shipLine2`, `shipCity`, `shipDepartment`, `shipPostalCode` | string? | **Snapshot** de la dirección |
| `guestEmail` | string? | Contacto cuando el pedido es de invitado |
| `placedAt` | datetime? | |

**Índices**: `userId`, `status`, `createdAt`.

**Por qué el snapshot de dirección**: si el cliente edita o borra su `Address`
después de comprar, el pedido histórico debe seguir mostrando a dónde se envió
realmente. Los campos `ship*` son esa copia congelada.

### `OrderItem` → `order_items`

| Campo | Tipo | Notas |
|---|---|---|
| `productId` | uuid | FK — el producto sigue existiendo |
| `productName` | string | **Snapshot** del nombre al comprar |
| `unitPrice` | Decimal(12,2) | **Snapshot** del precio al comprar |
| `quantity` | int | |
| `lineTotal` | Decimal(12,2) | |

Mismo razonamiento: si el precio del catálogo sube mañana, el pedido de ayer no cambia.

`onDelete: Cascade` desde `Order`.

---

## Pagos

### `Payment` → `payments`

| Campo | Tipo | Notas |
|---|---|---|
| `orderId` | uuid | FK, `onDelete: Cascade` |
| `method` | `PaymentMethod` | |
| `status` | `PaymentStatus` | default `PENDING` |
| `amount` | Decimal(12,2) | Copiado del `total` del pedido |
| `currency` | string | default `"COP"` |
| `externalReference` | string? | La referencia que ve Wompi: es el **`orderNumber`** del pedido. **Indexado** — es la clave por la que el webhook encuentra el pago |
| `wompiTransactionId` | string? | Id de la transacción que asigna Wompi. Llega en el evento, no antes. **Indexado** |
| `rawPayload` | Json? | Payload del evento, para trazabilidad |

El esquema permite **varios** pagos por pedido, pero el caso de uso reutiliza el
pago `PENDING` existente cuando el cliente reintenta, para que la referencia
resuelva a una sola fila.

`wompiTransactionId` es lo que distingue una **reentrega** del mismo evento (se
ignora) de un **reintento** real con una transacción nueva (sí se procesa).

---

## Reseñas

### `Review` → `reviews`

| Campo | Tipo | Notas |
|---|---|---|
| `productId` / `userId` | uuid | FK, ambas `onDelete: Cascade` |
| `orderId` | uuid? | Vínculo a la compra que habilita la reseña |
| `rating` | int | 1–5, **validado en la aplicación**, no en la base |
| `title` / `comment` | string? | |
| `isAnonymous` | boolean | default `false`. Oculta el nombre públicamente |
| `isApproved` | boolean | default `true` — no hay cola de moderación |

**`@@unique([userId, productId])`**: una reseña por usuario y producto. Esta
restricción es la red de seguridad real; el caso de uso también lo comprueba
antes, para dar un `409 CONFLICT` con mensaje claro en vez de un error de Prisma.

---

## Diagrama de relaciones

```
                        ┌──────────┐
                        │   User   │
                        └────┬─────┘
         ┌───────────┬───────┼────────┬──────────┬─────────────┐
         │           │       │        │          │             │
   ┌─────▼────┐ ┌────▼───┐ ┌─▼──┐ ┌───▼───┐ ┌────▼──────┐ ┌────▼──────────┐
   │ Address  │ │ Order  │ │Cart│ │Review │ │RefreshTok │ │PasswordReset  │
   └─────┬────┘ └───┬────┘ └─┬──┘ └───┬───┘ └───────────┘ └───────────────┘
         │          │        │        │
         └──────────┤        │        │
                    │   ┌────▼─────┐  │
              ┌─────┴──┐│ CartItem │  │
              │        │└────┬─────┘  │
        ┌─────▼────┐ ┌─▼─────▼──┐     │
        │OrderItem │ │ Payment  │     │
        └─────┬────┘ └──────────┘     │
              │                       │
        ┌─────▼─────────────────┬─────┘
        │      Product          │
        └───┬───────────────┬───┘
            │               │
      ┌─────▼────┐   ┌──────▼───────┐   ┌──────────────┐
      │  Brand   │   │  Category    │   │ ProductImage │
      └──────────┘   │ (auto-rel.)  │   └──────────────┘
                     └──────────────┘

   ┌────────┐        ┌──────────────────┐
   │ Coupon ├───────►│ CouponRedemption │◄─── User
   └───┬────┘        └──────────────────┘
       │
       └──► Order.couponId
```

---

## Migraciones

Viven en [`backend/prisma/migrations/`](../backend/prisma/migrations/):

| Migración | Qué introduce |
|---|---|
| `0001_init` | Esquema completo inicial |
| `0002_guest_orders` | `Order.userId` pasa a opcional + `Order.guestEmail`, habilitando el checkout sin cuenta |
| `0003_wompi_payments` | `PaymentMethod` pasa de `NEQUI/DAVIPLATA/CREDIT_CARD` a `WOMPI`, y aparece `Payment.wompiTransactionId` |

> `0003` reemplaza el tipo enum en vez de editarlo: Postgres no permite quitar
> valores de un enum, así que se crea `PaymentMethod_new`, se convierte la
> columna y se renombra. Los pagos que existieran se remapean a `WOMPI`.

La migración inicial se generó con `prisma migrate diff --from-empty`, es decir
**sin necesidad de una base de datos corriendo**. Sirve como técnica para
escribir migraciones aquí sin levantar Postgres:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

Comandos habituales:

```bash
npm run prisma:migrate   # crear + aplicar en desarrollo (interactivo)
npm run prisma:deploy    # aplicar en CI/producción (no interactivo)
npm run prisma:studio    # explorador visual
```

---

## Seed

[`backend/prisma/seed.ts`](../backend/prisma/seed.ts) es **idempotente** (usa
`upsert`), así que se puede volver a correr sin duplicar nada.

Siembra el catálogo **real** del negocio, no datos de ejemplo:

- **1 admin** — `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults `admin@pomass.co` / `Admin123*`). Aborta si `NODE_ENV=production` y la contraseña sigue siendo la de ejemplo.
- **1 marca** — PomAss (`pomass`).
- **1 categoría** — Cuidado íntimo (`cuidado-intimo`).
- **1 producto** — `Estuche PomAss Día + Noche`, `PA-ESTUCHE-DIANOCHE`, $79.900 COP, 2 tubos de 50 ml. El copy sale de [`frontend/src/site.js`](../frontend/src/site.js).
- **2 imágenes** de producto.
- **1 cupón** — `BIENVENIDA10`: 10 %, compra mínima $50.000, **tope global de 100 usos**.

Además **desactiva** (no borra) los 7 productos de ejemplo del catálogo genérico
anterior, si existen de una ejecución previa. No se borran porque podrían estar
referenciados por pedidos históricos.

| Variable | Default | Para qué |
|---|---|---|
| `INITIAL_STOCK` | `100` | Inventario inicial del estuche |
| `PRODUCT_IMAGE_BASE_URL` | `http://localhost:5173/images` | Base de las URLs de imagen. En producción, el bucket público de Supabase Storage |

```bash
npm run prisma:seed
```

> El cupón lleva `maxUses: 100` además de `perUserLimit: 1` a propósito: en una
> tienda de invitados **el límite por usuario no es exigible** (no hay identidad
> que contar), así que el tope global es el único control real.

---

## Huecos conocidos

Cosas que el esquema soporta pero que no tienen API hoy. Útil si estás
comparando el proyecto contra un blueprint:

| Hueco | Detalle |
|---|---|
| `PaymentStatus.REFUNDED` | Definido, nunca asignado. No hay flujo de reembolso |
| Gestión de usuarios por admin | No hay CRUD de usuarios ni forma de cambiar `role` o `isActive` por API |
| Moderación de reseñas | `isApproved` existe pero por defecto es `true` y no hay endpoint para cambiarlo |
| `Address.country` | Siempre `"CO"`, no editable por API |
| Subida de imágenes | `ProductImage.url` se recibe como URL ya existente; no hay endpoint de upload |
| Cupones por usuario | `perUserLimit` no es exigible en compras de invitado: no hay identidad que contar. Solo `maxUses` funciona |
| Monto del webhook | El backend no compara `amount_in_cents` del evento contra el total del pedido. La firma de integridad ya impide alterarlo en el navegador, pero sería una comprobación barata de añadir |

**Cerrados recientemente** (estaban en esta lista y ya no):

| Antes faltaba | Ahora |
|---|---|
| Transiciones `PAID → PREPARING → SHIPPED → DELIVERED` | `PATCH /admin/orders/:id/status` |
| Listado de pedidos para admin | `GET /admin/orders` |
| Consulta de pedido de invitado | `GET /orders/track` |

---

## Relacionado

- [Referencia: API REST](referencia-api.md)
- [Explicación: decisiones de diseño](explicacion-decisiones.md)
- [Cómo agregar un módulo nuevo](howto-agregar-modulo.md)
